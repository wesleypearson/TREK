import { Controller, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * /api/trips/:tripId/report — SM/PM production reports (custom).
 * Skeleton: endpoints are filled in by the reports feature build.
 */
@Controller('api/trips/:tripId/report')
@UseGuards(JwtAuthGuard)
export class ReportsController {}
