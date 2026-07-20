import { Body, Controller, Delete, Get, HttpCode, HttpException, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '../../types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RateLimitService } from '../auth/rate-limit.service';
import { writeAudit, getClientIp } from '../../services/auditLog';
import { verifyTripAccess } from '../../services/tripAccess';
import { checkPermission } from '../../services/permissions';
import { getAppUrl } from '../../services/notifications';
import {
  createOrRegenerateInvite, revokeInvite, listTripInviteFunnel, InviteError,
} from '../../services/guestInviteService';
import { sendGuestInvite, bulkSendTripInvites } from '../../services/guestInvite/guestInviteEmail';

const RL_WINDOW = 15 * 60 * 1000;

/**
 * /api/trips/:tripId/guest-invites — crew-admin side of guest invite links.
 * Gate mirrors guest management (rename/delete/promote): trip access → 404,
 * then member_manage → 403. Raw invite tokens appear exactly once, in the
 * create response; the funnel list never carries them.
 */
@Controller('api/trips/:tripId/guest-invites')
@UseGuards(JwtAuthGuard)
export class GuestInviteAdminController {
  constructor(private readonly rl: RateLimitService) {}

  private requireManage(tripId: string, user: User) {
    const trip = verifyTripAccess(tripId, user.id) as { user_id: number } | undefined;
    if (!trip) throw new HttpException({ error: 'Trip not found' }, 404);
    const isMember = trip.user_id !== user.id;
    if (!checkPermission('member_manage', user.role, trip.user_id, user.id, isMember)) {
      throw new HttpException({ error: 'No permission to manage guests' }, 403);
    }
  }

  private limitSend(req: Request): void {
    if (!this.rl.check('guest_invite_send', req.ip || 'unknown', 30, RL_WINDOW, Date.now())) {
      throw new HttpException({ error: 'Too many attempts. Please try again later.' }, 429);
    }
  }

  private rethrow(err: unknown): never {
    if (err instanceof InviteError) throw new HttpException({ error: err.message }, err.status);
    throw err;
  }

  @Get()
  funnel(@CurrentUser() user: User, @Param('tripId') tripId: string) {
    this.requireManage(tripId, user);
    return { guests: listTripInviteFunnel(tripId) };
  }

  // Declared before ':guestUserId' so Nest never treats 'send-all' as an id.
  @Post('send-all')
  @HttpCode(200)
  async sendAll(@CurrentUser() user: User, @Param('tripId') tripId: string, @Req() req: Request) {
    this.requireManage(tripId, user);
    this.limitSend(req);
    try {
      const summary = await bulkSendTripInvites(tripId, user.id);
      writeAudit({ userId: user.id, action: 'guest_invite.bulk_send', resource: tripId, ip: getClientIp(req), details: { ...summary } });
      return summary;
    } catch (err) {
      this.rethrow(err);
    }
  }

  @Post(':guestUserId')
  @HttpCode(201)
  create(
    @CurrentUser() user: User,
    @Param('tripId') tripId: string,
    @Param('guestUserId') guestUserId: string,
    @Body() body: { expires_in_days?: number | null },
    @Req() req: Request,
  ) {
    this.requireManage(tripId, user);
    const guestId = parseInt(guestUserId, 10);
    if (!Number.isFinite(guestId) || guestId < 1) throw new HttpException({ error: 'Guest not found' }, 404);
    try {
      const { invite, rawToken, regenerated } = createOrRegenerateInvite(
        tripId, guestId, user.id, body?.expires_in_days ?? null,
      );
      writeAudit({
        userId: user.id, action: 'guest_invite.create', resource: tripId, ip: getClientIp(req),
        details: { guest_user_id: guestId, invite_id: invite.id, regenerated },
      });
      // The ONE place the raw token ever leaves the server. invite_url is a
      // client-side convenience path — the client prefixes its own origin.
      return {
        invite_id: invite.id,
        invite_path: `/invite/${rawToken}`,
        expires_at: invite.expires_at,
        regenerated,
        ...(getAppUrl().startsWith('http://localhost') ? { localhost_link_warning: true } : {}),
      };
    } catch (err) {
      this.rethrow(err);
    }
  }

  @Delete(':guestUserId')
  revoke(
    @CurrentUser() user: User,
    @Param('tripId') tripId: string,
    @Param('guestUserId') guestUserId: string,
    @Req() req: Request,
  ) {
    this.requireManage(tripId, user);
    const guestId = parseInt(guestUserId, 10);
    if (!Number.isFinite(guestId) || guestId < 1) throw new HttpException({ error: 'Guest not found' }, 404);
    try {
      const revoked = revokeInvite(tripId, guestId);
      if (revoked) {
        writeAudit({ userId: user.id, action: 'guest_invite.revoke', resource: tripId, ip: getClientIp(req), details: { guest_user_id: guestId } });
      }
      return { revoked };
    } catch (err) {
      this.rethrow(err);
    }
  }

  @Post(':guestUserId/send')
  @HttpCode(200)
  async send(
    @CurrentUser() user: User,
    @Param('tripId') tripId: string,
    @Param('guestUserId') guestUserId: string,
    @Req() req: Request,
  ) {
    this.requireManage(tripId, user);
    this.limitSend(req);
    const guestId = parseInt(guestUserId, 10);
    if (!Number.isFinite(guestId) || guestId < 1) throw new HttpException({ error: 'Guest not found' }, 404);
    try {
      const result = await sendGuestInvite(tripId, guestId, user.id);
      writeAudit({
        userId: user.id, action: 'guest_invite.send', resource: tripId, ip: getClientIp(req),
        details: { guest_user_id: guestId, invite_id: result.invite_id },
      });
      return result;
    } catch (err) {
      this.rethrow(err);
    }
  }
}
