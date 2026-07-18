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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RateLimitService } from '../auth/rate-limit.service';
import type { User } from '../../types';
import * as shifts from '../../services/shiftService';
import { checkPermission } from '../../services/permissions';
import { broadcast } from '../../websocket';
import { postBotMessage } from '../../services/integrityService';

// Every sign-on/off posts to the crew chat as the neutral bot voice — throttle
// the timeclock per member+event so a scripted start/stop loop can't flood it.
const CLOCK_RL_WINDOW = 10 * 60 * 1000;
const CLOCK_RL_MAX = 10;
/** A sub-minute shift announces only its sign-on: the roster still records it,
 *  but a rapid start→stop cycle must not speak twice through the bot. */
const MIN_ANNOUNCED_SHIFT_SECONDS = 60;

/**
 * /api/trips/:tripId/shifts — the rostering timeclock (custom).
 *
 * Guards mirror budget.controller: every handler verifies trip access (404 for
 * strangers); a member acts on their OWN shift freely, while stopping/deleting
 * someone else's follows the 'member_manage' permission (default: event owner).
 * Sign-on/sign-off broadcast live (shift:started / shift:stopped, echo-scoped
 * via X-Socket-Id) and are announced in the event chat by the Travla bot.
 */
@Controller('api/trips/:tripId/shifts')
@UseGuards(JwtAuthGuard)
export class ShiftsController {
  constructor(private readonly rl: RateLimitService) {}

  private requireTrip(tripId: string, user: User): { id: number; user_id: number } {
    const trip = shifts.verifyTripAccess(tripId, user.id);
    if (!trip) {
      throw new HttpException({ error: 'Trip not found' }, 404);
    }
    return trip as { id: number; user_id: number };
  }

  /** Timeclock throttle (start/stop) — keyed on the ACTING member per event. */
  private limitClock(user: User, tripId: string): void {
    if (!this.rl.check('shift_clock', `${user.id}:${tripId}`, CLOCK_RL_MAX, CLOCK_RL_WINDOW, Date.now())) {
      throw new HttpException({ error: 'Too many requests. Please try again later.' }, 429);
    }
  }

  /** Acting on someone else's shift needs member_manage (never bundled with membership). */
  private requireOwnOrManage(trip: { user_id: number }, user: User, shift: { user_id: number }): void {
    if (shift.user_id === user.id) return;
    if (!checkPermission('member_manage', user.role, trip.user_id, user.id, trip.user_id !== user.id)) {
      throw new HttpException({ error: 'No permission' }, 403);
    }
  }

  @Get()
  list(@CurrentUser() user: User, @Param('tripId') tripId: string) {
    this.requireTrip(tripId, user);
    return { shifts: shifts.listShifts(tripId), totals: shifts.getTotals(tripId) };
  }

  @Post('start')
  start(
    @CurrentUser() user: User,
    @Param('tripId') tripId: string,
    @Body() body: { lat?: number | null; lng?: number | null; note?: string | null } | undefined,
    @Headers('x-socket-id') socketId?: string,
  ) {
    this.requireTrip(tripId, user);
    this.limitClock(user, tripId);
    const result = shifts.startShift(tripId, user.id, body || {});
    if (result.error === 'already_on' || !result.shift) {
      throw new HttpException({ error: 'Already on shift' }, 409);
    }
    const shift = result.shift;
    broadcast(tripId, 'shift:started', { shift }, socketId);
    postBotMessage(tripId, `🕐 ${shift.username} signed on`);
    return { shift };
  }

  @Post(':id/stop')
  @HttpCode(200)
  stop(
    @CurrentUser() user: User,
    @Param('tripId') tripId: string,
    @Param('id') id: string,
    @Body() body: { lat?: number | null; lng?: number | null } | undefined,
    @Headers('x-socket-id') socketId?: string,
  ) {
    const trip = this.requireTrip(tripId, user);
    this.limitClock(user, tripId);
    const existing = shifts.getShift(id, tripId);
    if (!existing) {
      throw new HttpException({ error: 'Shift not found' }, 404);
    }
    this.requireOwnOrManage(trip, user, existing);
    if (existing.ended_at) {
      throw new HttpException({ error: 'Shift already ended' }, 409);
    }
    const shift = shifts.stopShift(id, tripId, body || {});
    if (!shift) {
      // Raced by a concurrent stop between the read and the guarded UPDATE.
      throw new HttpException({ error: 'Shift already ended' }, 409);
    }
    broadcast(tripId, 'shift:stopped', { shift }, socketId);
    const seconds = shifts.shiftSeconds(shift);
    if (seconds >= MIN_ANNOUNCED_SHIFT_SECONDS) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      postBotMessage(tripId, `🕐 ${shift.username} signed off after ${h}h ${m}m`);
    }
    return { shift };
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: User,
    @Param('tripId') tripId: string,
    @Param('id') id: string,
    @Headers('x-socket-id') socketId?: string,
  ) {
    const trip = this.requireTrip(tripId, user);
    const existing = shifts.getShift(id, tripId);
    if (!existing) {
      throw new HttpException({ error: 'Shift not found' }, 404);
    }
    this.requireOwnOrManage(trip, user, existing);
    if (!shifts.deleteShift(id, tripId)) {
      throw new HttpException({ error: 'Shift not found' }, 404);
    }
    broadcast(tripId, 'shift:deleted', { shiftId: Number(id) }, socketId);
    return { success: true };
  }
}
