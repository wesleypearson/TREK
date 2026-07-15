import { Body, Controller, Delete, Get, HttpCode, HttpException, Param, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import type { User } from '../../types';
import { ExpenseTabsService } from './expense-tabs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

/**
 * /api/trips/:tripId/expense-tabs — owner-side management of public expense
 * tabs (custom). A tab is a per-person running balance the owner shares as an
 * unguessable public link; see PublicExpenseTabController for the no-account
 * side. Tabs are strictly personal: every query is scoped to the calling
 * user, so members never see (or can touch) each other's tabs — a foreign id
 * 404s. Reads need trip access; mutations need 'budget_edit', like the ledger.
 */
@Controller('api/trips/:tripId/expense-tabs')
@UseGuards(JwtAuthGuard)
export class TripExpenseTabsController {
  constructor(private readonly tabs: ExpenseTabsService) {}

  private requireTrip(tripId: string, user: User) {
    const trip = this.tabs.verifyTripAccess(tripId, user.id);
    if (!trip) throw new HttpException({ error: 'Trip not found' }, 404);
    return trip;
  }

  private requireEdit(tripId: string, user: User) {
    const trip = this.requireTrip(tripId, user);
    if (!this.tabs.canEdit(trip, user)) throw new HttpException({ error: 'No permission' }, 403);
  }

  @Get()
  async list(@CurrentUser() user: User, @Param('tripId') tripId: string) {
    const trip = this.requireTrip(tripId, user) as { currency?: string | null };
    return { tabs: await this.tabs.listWithLive(tripId, user.id, trip.currency) };
  }

  @Post()
  create(
    @CurrentUser() user: User,
    @Param('tripId') tripId: string,
    @Body() body: { first_name?: string; last_name?: string; currency?: string | null; member_user_id?: number | null; create_guest?: boolean },
  ) {
    this.requireEdit(tripId, user);
    // Linking to an existing member derives the name from their profile; a
    // standalone tab or a new temp guest needs one typed in.
    if (body?.member_user_id == null && (!body?.first_name || !String(body.first_name).trim())) {
      throw new HttpException({ error: 'first_name is required' }, 400);
    }
    const tab = this.tabs.create(tripId, user.id, {
      first_name: body.first_name != null ? String(body.first_name) : '',
      last_name: body.last_name != null ? String(body.last_name) : '',
      currency: body.currency ? String(body.currency).toUpperCase().slice(0, 3) : null,
      member_user_id: body.member_user_id != null ? Number(body.member_user_id) : null,
      create_guest: !!body.create_guest,
    });
    if ('error' in tab) {
      throw new HttpException({ error: tab.error }, tab.error.includes('already has a tab') ? 409 : 404);
    }
    return { tab };
  }

  @Post(':id/items')
  addItem(
    @CurrentUser() user: User,
    @Param('tripId') tripId: string,
    @Param('id') id: string,
    @Body() body: { budget_item_id?: number | null; label?: string; amount?: number; share_receipt?: boolean },
  ) {
    this.requireEdit(tripId, user);
    if (body?.amount == null) throw new HttpException({ error: 'amount is required' }, 400);
    const item = this.tabs.addItem(tripId, id, user.id, {
      budget_item_id: body.budget_item_id ?? null,
      label: body.label,
      amount: Number(body.amount),
      share_receipt: !!body.share_receipt,
    });
    if (!item) throw new HttpException({ error: 'Tab not found' }, 404);
    if ('error' in item) throw new HttpException({ error: item.error }, 400);
    return { item };
  }

  @Delete(':id/items/:itemId')
  removeItem(@CurrentUser() user: User, @Param('tripId') tripId: string, @Param('id') id: string, @Param('itemId') itemId: string) {
    this.requireEdit(tripId, user);
    if (!this.tabs.removeItem(tripId, id, itemId, user.id)) {
      throw new HttpException({ error: 'Not found' }, 404);
    }
    return { success: true };
  }

  @Post(':id/payments')
  async addPayment(
    @CurrentUser() user: User,
    @Param('tripId') tripId: string,
    @Param('id') id: string,
    @Body() body: { amount?: number; note?: string | null },
  ) {
    this.requireEdit(tripId, user);
    if (body?.amount == null) throw new HttpException({ error: 'amount is required' }, 400);
    const amount = Math.round(Number(body.amount) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0) throw new HttpException({ error: 'Amount must be greater than zero' }, 400);

    // Linked tab: money received is a real settle-up (member → recorder), so
    // the group balances and the public live view move together.
    const tab = this.tabs.get(tripId, id, user.id);
    if (!tab) throw new HttpException({ error: 'Tab not found' }, 404);
    if (tab.member_user_id != null) {
      const trip = this.requireTrip(tripId, user) as { currency?: string | null };
      const settlement = await this.tabs.settleLinkedTab(tripId, tab.member_user_id, user.id, amount, tab.currency || trip.currency || null);
      return { settlement };
    }

    const payment = this.tabs.addPayment(tripId, id, user.id, { amount, note: body.note });
    if (!payment) throw new HttpException({ error: 'Tab not found' }, 404);
    if ('error' in payment) throw new HttpException({ error: payment.error }, 400);
    return { payment };
  }

  @Delete(':id/payments/:paymentId')
  removePayment(@CurrentUser() user: User, @Param('tripId') tripId: string, @Param('id') id: string, @Param('paymentId') paymentId: string) {
    this.requireEdit(tripId, user);
    if (!this.tabs.removePayment(tripId, id, paymentId, user.id)) {
      throw new HttpException({ error: 'Not found' }, 404);
    }
    return { success: true };
  }

  /** Pause (or resume) the public link without losing the tab's history. */
  @Post(':id/revoke')
  @HttpCode(200)
  revoke(
    @CurrentUser() user: User,
    @Param('tripId') tripId: string,
    @Param('id') id: string,
    @Body() body: { revoked?: boolean },
  ) {
    this.requireEdit(tripId, user);
    if (!this.tabs.setRevoked(tripId, id, user.id, body?.revoked !== false)) {
      throw new HttpException({ error: 'Tab not found' }, 404);
    }
    return { success: true };
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('tripId') tripId: string, @Param('id') id: string) {
    this.requireEdit(tripId, user);
    if (!this.tabs.remove(tripId, id, user.id)) {
      throw new HttpException({ error: 'Tab not found' }, 404);
    }
    return { success: true };
  }

  /**
   * Accounting export (CSV). The JSON twin for integrations is the list
   * endpoint above — both are stable shapes external tooling can consume.
   */
  @Get(':id/export.csv')
  exportCsv(@CurrentUser() user: User, @Param('tripId') tripId: string, @Param('id') id: string, @Res() res: Response): void {
    this.requireTrip(tripId, user);
    const out = this.tabs.csv(tripId, id, user.id);
    if (!out) throw new HttpException({ error: 'Tab not found' }, 404);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${out.filename}"`);
    res.send(out.csv);
  }
}
