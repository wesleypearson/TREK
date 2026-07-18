import { Controller, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * /api/trips/:tripId/shifts — the rostering timeclock (custom).
 * Skeleton: endpoints are filled in by the shifts feature build.
 */
@Controller('api/trips/:tripId/shifts')
@UseGuards(JwtAuthGuard)
export class ShiftsController {}
