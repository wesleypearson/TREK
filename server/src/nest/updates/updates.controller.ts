import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TRAVLA_RELEASES, type TravlaRelease } from '../../services/travlaReleases';

/**
 * /api/updates — the Travla changelog for every signed-in user (crew and
 * stakeholders see it via the "What's new" modal), unlike the admin-gated
 * /api/admin/github-releases which serves the same data to the admin panel.
 * Authenticated but deliberately NOT admin-gated; capped at 20 entries,
 * newest first (TRAVLA_RELEASES is maintained newest-first).
 */
@Controller('api/updates')
@UseGuards(JwtAuthGuard)
export class UpdatesController {
  @Get()
  list(): { releases: TravlaRelease[] } {
    return { releases: TRAVLA_RELEASES.slice(0, 20) };
  }
}
