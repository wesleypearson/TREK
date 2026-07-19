import { Body, Controller, Get, HttpCode, HttpException, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { User } from '../../types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RateLimitService } from '../auth/rate-limit.service';
import { writeAudit, getClientIp } from '../../services/auditLog';
import { setAuthCookie } from '../../services/cookie';
import {
  resolveInvite, redeemGuestInvite, createColleagueInvites, InviteError,
} from '../../services/guestInviteService';

const RL_WINDOW = 15 * 60 * 1000;

/**
 * /api/guest-invites — the public face of guest invite links.
 *
 * Deliberately NOT behind a guard (SharedController pattern): the 192-bit
 * token in the URL is the whole credential. Unknown, revoked and redeemed
 * tokens are indistinguishable (404); only genuine expiry is 410 so the
 * landing can suggest asking for a fresh link. Dedicated rate buckets —
 * never the shared 'login' bucket, which register/login already drain.
 */
@Controller('api/guest-invites')
export class GuestInvitePublicController {
  constructor(private readonly rl: RateLimitService) {}

  private limit(bucket: string, req: Request, max: number): void {
    if (!this.rl.check(bucket, req.ip || 'unknown', max, RL_WINDOW, Date.now())) {
      throw new HttpException({ error: 'Too many attempts. Please try again later.' }, 429);
    }
  }

  @Get(':token')
  resolve(@Param('token') token: string, @Req() req: Request) {
    this.limit('guest_invite_read', req, 60);
    const result = resolveInvite(token);
    if (result.status === 'not_found') throw new HttpException({ error: 'Invalid invite link' }, 404);
    if (result.status === 'expired') throw new HttpException({ error: 'expired' }, 410);
    return result.prefill;
  }

  @Post(':token/register')
  @HttpCode(201)
  register(
    @Param('token') token: string,
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.limit('guest_invite_register', req, 10);
    try {
      const result = redeemGuestInvite(token, (body ?? {}) as Record<string, unknown>);
      writeAudit({
        userId: result.user.id as number,
        action: 'user.register_via_invite',
        ip: getClientIp(req),
        details: { kind: result.invite.kind, trip_id: result.trip_id, invite_id: result.invite.id },
      });
      setAuthCookie(res, result.token, req);
      return { token: result.token, user: result.user, trip_id: result.trip_id };
    } catch (err) {
      if (err instanceof InviteError) throw new HttpException({ error: err.message }, err.status);
      throw err;
    }
  }
}

/**
 * /api/guest-invites/colleagues — JWT-guarded colleague-link minting for the
 * company loop. Separate controller class so the public one stays guard-free.
 */
@Controller('api/guest-invites')
@UseGuards(JwtAuthGuard)
export class GuestInviteColleagueController {
  constructor(private readonly rl: RateLimitService) {}

  @Post('colleagues')
  @HttpCode(201)
  colleagues(
    @CurrentUser() user: User,
    @Body() body: { count?: number },
    @Req() req: Request,
  ) {
    if (!this.rl.check('guest_invite_colleague', req.ip || 'unknown', 10, RL_WINDOW, Date.now())) {
      throw new HttpException({ error: 'Too many attempts. Please try again later.' }, 429);
    }
    try {
      const result = createColleagueInvites(user.id, Number(body?.count ?? 1));
      writeAudit({
        userId: user.id,
        action: 'guest_invite.colleague_create',
        ip: getClientIp(req),
        details: { count: result.rawTokens.length },
      });
      // Raw tokens exist only in this response — hashed at rest.
      return {
        company_name: result.company_name,
        invite_paths: result.rawTokens.map((t) => `/invite/${t}`),
      };
    } catch (err) {
      if (err instanceof InviteError) throw new HttpException({ error: err.message }, err.status);
      throw err;
    }
  }
}
