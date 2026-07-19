import { Module } from '@nestjs/common';
import { GuestInvitePublicController, GuestInviteColleagueController } from './guest-invite-public.controller';
import { GuestInviteAdminController } from './guest-invite-admin.controller';
import { RateLimitService } from '../auth/rate-limit.service';

@Module({
  controllers: [GuestInvitePublicController, GuestInviteColleagueController, GuestInviteAdminController],
  providers: [RateLimitService],
})
export class GuestInviteModule {}
