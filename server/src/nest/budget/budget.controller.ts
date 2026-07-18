import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpException,
  Param,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { User } from '../../types';
import { BudgetService } from './budget.service';
import { ReceiptScanService, ReceiptScanUnavailableError } from './receipt-scan.service';
import { autoSupplierAndVenue, type AutoSupplierResult } from '../../services/supplierEnrichment';

// Receipt photos/PDFs only; 15 MB covers any phone photo.
const RECEIPT_UPLOAD = { storage: memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } };
const RECEIPT_MIMES = /^(image\/(jpeg|png|webp|gif|heic|heif)|application\/pdf)$/;
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

/**
 * /api/trips/:tripId/budget — trip-scoped expense planner.
 *
 * Byte-identical to the legacy Express route (server/src/routes/budget.ts):
 * every handler verifies trip access (404); mutations check 'budget_edit' (403);
 * create is 201, the rest 200; bespoke 400/404 bodies reproduced; mutations
 * broadcast over WebSocket with the forwarded X-Socket-Id. Static sub-routes
 * (summary, settlement, reorder/*) are declared before /:id so they win over the
 * param. Updating total_price on a reservation-linked item syncs the price back.
 */
@Controller('api/trips/:tripId/budget')
@UseGuards(JwtAuthGuard)
export class BudgetController {
  constructor(
    private readonly budget: BudgetService,
    private readonly receipts: ReceiptScanService,
  ) {}

  private requireTrip(tripId: string, user: User) {
    const trip = this.budget.verifyTripAccess(tripId, user.id);
    if (!trip) {
      throw new HttpException({ error: 'Trip not found' }, 404);
    }
    return trip;
  }

  private requireEdit(trip: ReturnType<BudgetService['verifyTripAccess']>, user: User): void {
    if (!this.budget.canEdit(trip!, user)) {
      throw new HttpException({ error: 'No permission' }, 403);
    }
  }

  /**
   * A venue link must point at a venue of this event that the acting user can
   * see — a foreign or invisible venue reads as if it doesn't exist (400).
   * `null`/`undefined` pass through: unlinking and untouched updates are fine.
   */
  private requireLinkablePlace(tripId: string, placeId: number | null | undefined, user: User): void {
    if (placeId == null) return;
    if (!Number.isInteger(placeId) || !this.budget.canLinkPlace(tripId, placeId, user.id)) {
      throw new HttpException({ error: 'Venue not found' }, 400);
    }
  }

  /** Suppliers are instance-wide; a link just has to point at a real row. */
  private requireLinkableSupplier(supplierId: number | null | undefined): void {
    if (supplierId == null) return;
    if (!Number.isInteger(supplierId) || !this.budget.supplierExists(supplierId)) {
      throw new HttpException({ error: 'Supplier not found' }, 400);
    }
  }

  @Get()
  list(@CurrentUser() user: User, @Param('tripId') tripId: string) {
    this.requireTrip(tripId, user);
    return { items: this.budget.list(tripId, user.id) };
  }

  @Get('summary/per-person')
  perPerson(@CurrentUser() user: User, @Param('tripId') tripId: string) {
    this.requireTrip(tripId, user);
    return { summary: this.budget.perPersonSummary(tripId) };
  }

  @Get('settlement')
  settlement(
    @CurrentUser() user: User,
    @Param('tripId') tripId: string,
    @Query('base') base?: string,
  ) {
    const trip = this.requireTrip(tripId, user);
    return this.budget.settlement(tripId, base, (trip as { currency?: string }).currency || 'EUR');
  }

  @Get('settlements')
  listSettlements(@CurrentUser() user: User, @Param('tripId') tripId: string) {
    this.requireTrip(tripId, user);
    return { settlements: this.budget.listSettlements(tripId) };
  }

  @Post('settlements')
  async createSettlement(
    @CurrentUser() user: User,
    @Param('tripId') tripId: string,
    @Body() body: { from_user_id?: number; to_user_id?: number; amount?: number; currency?: string | null },
    @Headers('x-socket-id') socketId?: string,
  ) {
    const trip = this.requireTrip(tripId, user);
    this.requireEdit(trip, user);
    if (body.from_user_id == null || body.to_user_id == null || body.amount == null) {
      throw new HttpException({ error: 'from_user_id, to_user_id and amount are required' }, 400);
    }
    const settlement = await this.budget.createSettlement(
      tripId,
      { from_user_id: body.from_user_id, to_user_id: body.to_user_id, amount: body.amount, currency: body.currency },
      user.id,
    );
    this.budget.broadcast(tripId, 'budget:settlement-created', { settlement }, socketId);
    return { settlement };
  }

  @Put('settlements/:settlementId')
  async updateSettlement(
    @CurrentUser() user: User,
    @Param('tripId') tripId: string,
    @Param('settlementId') settlementId: string,
    @Body() body: { from_user_id?: number; to_user_id?: number; amount?: number; currency?: string | null },
    @Headers('x-socket-id') socketId?: string,
  ) {
    const trip = this.requireTrip(tripId, user);
    this.requireEdit(trip, user);
    if (body.from_user_id == null || body.to_user_id == null || body.amount == null) {
      throw new HttpException({ error: 'from_user_id, to_user_id and amount are required' }, 400);
    }
    const settlement = await this.budget.updateSettlement(settlementId, tripId, {
      from_user_id: body.from_user_id,
      to_user_id: body.to_user_id,
      amount: body.amount,
      currency: body.currency,
    });
    if (!settlement) {
      throw new HttpException({ error: 'Settlement not found' }, 404);
    }
    this.budget.broadcast(tripId, 'budget:settlement-updated', { settlement }, socketId);
    return { settlement };
  }

  /**
   * Wipe the whole ledger (custom testing/fresh-start tool): every expense,
   * settlement and public tab of the trip. Trip OWNER only — this is the one
   * budget action budget_edit deliberately does not grant.
   */
  @Post('reset')
  @HttpCode(200)
  resetExpenses(
    @CurrentUser() user: User,
    @Param('tripId') tripId: string,
    @Headers('x-socket-id') socketId?: string,
  ) {
    const trip = this.requireTrip(tripId, user) as { user_id?: number };
    if (trip.user_id !== user.id) {
      throw new HttpException({ error: 'Only the trip owner can reset expenses' }, 403);
    }
    this.budget.resetExpenses(tripId);
    this.budget.broadcast(tripId, 'budget:reset', { tripId: Number(tripId) }, socketId);
    return { success: true };
  }

  @Delete('settlements/:settlementId')
  deleteSettlement(
    @CurrentUser() user: User,
    @Param('tripId') tripId: string,
    @Param('settlementId') settlementId: string,
    @Headers('x-socket-id') socketId?: string,
  ) {
    const trip = this.requireTrip(tripId, user);
    this.requireEdit(trip, user);
    if (!this.budget.deleteSettlement(settlementId, tripId)) {
      throw new HttpException({ error: 'Settlement not found' }, 404);
    }
    this.budget.broadcast(tripId, 'budget:settlement-deleted', { settlementId: Number(settlementId) }, socketId);
    return { success: true };
  }

  /**
   * Scan a receipt / tax invoice (custom): stores the upload as the caller's
   * PRIVATE trip file, then extracts merchant/date/currency/total/line items
   * via the configured AI. 409 with a human-readable reason when no capable
   * AI is available — the stored file is still returned so a manual expense
   * can attach it.
   */
  @Post('receipt-scan')
  @HttpCode(200)
  @UseInterceptors(FilesInterceptor('file', 6, RECEIPT_UPLOAD))
  async receiptScan(
    @CurrentUser() user: User,
    @Param('tripId') tripId: string,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
  ) {
    const trip = this.requireTrip(tripId, user);
    this.requireEdit(trip, user);
    if (!files || files.length === 0) {
      throw new HttpException({ error: 'No file uploaded' }, 400);
    }
    for (const f of files) {
      if (!RECEIPT_MIMES.test(f.mimetype || '')) {
        throw new HttpException({ error: 'Receipt must be a photo (jpg/png/webp/heic) or a PDF' }, 400);
      }
    }
    // A multi-part scan is several PHOTOS of one docket; PDFs (already
    // multi-page containers, e.g. from the iOS Files/Notes document scanner)
    // travel alone.
    if (files.length > 1 && files.some(f => f.mimetype === 'application/pdf')) {
      throw new HttpException({ error: 'Scan multiple pages as photos, or upload a single PDF' }, 400);
    }
    // Every page is stored; the first is the one the expense links to (the
    // others remain attached to the trip as the following pages).
    const stored = files.map((f, i) => this.receipts.storeReceiptFile(tripId, user.id, f, i));
    try {
      const { receipt, warnings } = await this.receipts.parseReceipt(user.id, files);
      // The merchant becomes (or matches) a supplier and, when locatable, an
      // auto-created venue on the event map — never fatal to the scan itself.
      let auto: AutoSupplierResult | null = null;
      try {
        auto = await autoSupplierAndVenue(tripId, user.id, receipt);
        if (auto?.place?.created) {
          const place = this.budget.getPlace(auto.place.id);
          if (place) this.budget.broadcast(tripId, 'place:created', { place }, undefined);
        }
      } catch (autoErr) {
        console.error('[receipt-scan] supplier/venue auto-create failed:', autoErr instanceof Error ? autoErr.message : autoErr);
      }
      return {
        file: stored[0], files: stored, receipt, warnings,
        supplier: auto ? { id: auto.supplier.id, name: auto.supplier.name, created: auto.supplier.created } : null,
        place: auto?.place ?? null,
      };
    } catch (err) {
      if (err instanceof ReceiptScanUnavailableError) {
        throw new HttpException({ error: err.message, file: stored[0] }, 409);
      }
      console.error('[receipt-scan] extraction failed:', err instanceof Error ? err.message : err);
      throw new HttpException({ error: 'The AI could not read this receipt. You can still enter the lines manually.', file: stored[0] }, 502);
    }
  }

  @Post()
  async create(
    @CurrentUser() user: User,
    @Param('tripId') tripId: string,
    @Body() body: { name?: string; category?: string; total_price?: number; persons?: number | null; days?: number | null; note?: string | null; expense_date?: string | null; reservation_id?: number; is_private?: boolean; receipt_file_id?: number | null; place_id?: number | null; supplier_id?: number | null },
    @Headers('x-socket-id') socketId?: string,
  ) {
    const trip = this.requireTrip(tripId, user);
    this.requireEdit(trip, user);
    if (!body.name) {
      throw new HttpException({ error: 'Name is required' }, 400);
    }
    this.requireLinkablePlace(tripId, body.place_id, user);
    this.requireLinkableSupplier(body.supplier_id);
    const item = await this.budget.create(tripId, body as { name: string }, user.id);
    // A personal expense (custom) is only its creator's business — scope the event.
    this.budget.broadcast(tripId, 'budget:created', { item }, socketId, item.is_private ? user.id : undefined);
    return { item };
  }

  @Put('reorder/items')
  reorderItems(
    @CurrentUser() user: User,
    @Param('tripId') tripId: string,
    @Body('orderedIds') orderedIds: number[],
    @Headers('x-socket-id') socketId?: string,
  ) {
    const trip = this.requireTrip(tripId, user);
    this.requireEdit(trip, user);
    this.budget.reorderItems(tripId, orderedIds);
    this.budget.broadcast(tripId, 'budget:reordered', { orderedIds }, socketId);
    return { success: true };
  }

  @Put('reorder/categories')
  reorderCategories(
    @CurrentUser() user: User,
    @Param('tripId') tripId: string,
    @Body('orderedCategories') orderedCategories: string[],
    @Headers('x-socket-id') socketId?: string,
  ) {
    const trip = this.requireTrip(tripId, user);
    this.requireEdit(trip, user);
    this.budget.reorderCategories(tripId, orderedCategories);
    this.budget.broadcast(tripId, 'budget:reordered', { orderedCategories }, socketId);
    return { success: true };
  }

  @Put(':id')
  async update(
    @CurrentUser() user: User,
    @Param('tripId') tripId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Headers('x-socket-id') socketId?: string,
  ) {
    const trip = this.requireTrip(tripId, user);
    this.requireEdit(trip, user);
    const before = this.budget.getItem(id, tripId, user.id);
    if (!before) {
      throw new HttpException({ error: 'Budget item not found' }, 404);
    }
    this.requireLinkablePlace(tripId, body.place_id as number | null | undefined, user);
    this.requireLinkableSupplier(body.supplier_id as number | null | undefined);
    const updated = await this.budget.update(id, tripId, body, user.id);
    if (!updated) {
      throw new HttpException({ error: 'Budget item not found' }, 404);
    }
    if (updated.reservation_id && body.total_price !== undefined) {
      this.budget.syncReservationPrice(tripId, updated.reservation_id, updated.total_price, socketId);
    }
    const wasPrivate = !!before.is_private;
    const isPrivate = !!updated.is_private;
    if (wasPrivate && !isPrivate) {
      // Now a group expense: the rest of the room learns about it for the first time.
      this.budget.broadcast(tripId, 'budget:created', { item: updated }, socketId);
    } else if (!wasPrivate && isPrivate) {
      // Now personal: everyone else drops it; the creator's other tabs update.
      this.budget.broadcast(tripId, 'budget:deleted', { itemId: Number(id) }, socketId, undefined);
      this.budget.broadcast(tripId, 'budget:updated', { item: updated }, socketId, user.id);
    } else {
      this.budget.broadcast(tripId, 'budget:updated', { item: updated }, socketId, isPrivate ? user.id : undefined);
    }
    return { item: updated };
  }

  @Put(':id/members')
  updateMembers(
    @CurrentUser() user: User,
    @Param('tripId') tripId: string,
    @Param('id') id: string,
    @Body('user_ids') userIds: unknown,
    @Headers('x-socket-id') socketId?: string,
  ) {
    const trip = this.requireTrip(tripId, user);
    this.requireEdit(trip, user);
    if (!Array.isArray(userIds)) {
      throw new HttpException({ error: 'user_ids must be an array' }, 400);
    }
    if (!this.budget.getItem(id, tripId, user.id)) {
      throw new HttpException({ error: 'Budget item not found' }, 404);
    }
    const result = this.budget.updateMembers(id, tripId, userIds);
    if (!result) {
      throw new HttpException({ error: 'Budget item not found' }, 404);
    }
    this.budget.broadcast(tripId, 'budget:members-updated', { itemId: Number(id), members: result.members, persons: result.item.persons }, socketId);
    return { members: result.members, item: result.item };
  }

  @Put(':id/payers')
  setPayers(
    @CurrentUser() user: User,
    @Param('tripId') tripId: string,
    @Param('id') id: string,
    @Body('payers') payers: unknown,
    @Headers('x-socket-id') socketId?: string,
  ) {
    const trip = this.requireTrip(tripId, user);
    this.requireEdit(trip, user);
    if (!Array.isArray(payers)) {
      throw new HttpException({ error: 'payers must be an array' }, 400);
    }
    if (!this.budget.getItem(id, tripId, user.id)) {
      throw new HttpException({ error: 'Budget item not found' }, 404);
    }
    const item = this.budget.setPayers(id, tripId, payers as { user_id: number; amount: number }[]);
    if (!item) {
      throw new HttpException({ error: 'Budget item not found' }, 404);
    }
    this.budget.broadcast(tripId, 'budget:updated', { item }, socketId);
    return { item };
  }

  @Put(':id/members/:userId/paid')
  toggleMemberPaid(
    @CurrentUser() user: User,
    @Param('tripId') tripId: string,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body('paid') paid: boolean,
    @Headers('x-socket-id') socketId?: string,
  ) {
    const trip = this.requireTrip(tripId, user);
    this.requireEdit(trip, user);
    if (!this.budget.getItem(id, tripId, user.id)) {
      throw new HttpException({ error: 'Budget item not found' }, 404);
    }
    const member = this.budget.toggleMemberPaid(id, tripId, userId, paid);
    this.budget.broadcast(tripId, 'budget:member-paid-updated', { itemId: Number(id), userId: Number(userId), paid: paid ? 1 : 0 }, socketId);
    return { member };
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: User,
    @Param('tripId') tripId: string,
    @Param('id') id: string,
    @Headers('x-socket-id') socketId?: string,
  ) {
    const trip = this.requireTrip(tripId, user);
    this.requireEdit(trip, user);
    const before = this.budget.getItem(id, tripId, user.id);
    if (!before || !this.budget.remove(id, tripId, user.id)) {
      throw new HttpException({ error: 'Budget item not found' }, 404);
    }
    this.budget.broadcast(tripId, 'budget:deleted', { itemId: Number(id) }, socketId, before.is_private ? user.id : undefined);
    return { success: true };
  }
}
