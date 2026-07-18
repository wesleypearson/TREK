import { describe, it, expect } from 'vitest';
import { UpdatesController } from '../../../src/nest/updates/updates.controller';
import { UpdatesModule } from '../../../src/nest/updates/updates.module';
import { JwtAuthGuard } from '../../../src/nest/auth/jwt-auth.guard';
import { AdminGuard } from '../../../src/nest/auth/admin.guard';
import { TRAVLA_RELEASES } from '../../../src/services/travlaReleases';

describe('UpdatesController (/api/updates — crew-visible release notes)', () => {
  it('returns the local changelog, capped at 20, newest first', () => {
    const { releases } = new UpdatesController().list();
    expect(releases).toEqual(TRAVLA_RELEASES.slice(0, 20));
    expect(releases.length).toBeLessThanOrEqual(20);
    expect(releases[0].tag_name).toBe(TRAVLA_RELEASES[0].tag_name);
  });

  it('requires auth (JwtAuthGuard) but is NOT admin-gated', () => {
    const guards: unknown[] = Reflect.getMetadata('__guards__', UpdatesController) ?? [];
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).not.toContain(AdminGuard);
  });

  it('module registers the controller', () => {
    const controllers = Reflect.getMetadata('controllers', UpdatesModule);
    expect(controllers).toContain(UpdatesController);
  });
});
