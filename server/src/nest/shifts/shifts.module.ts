import { Module } from '@nestjs/common';
import { ShiftsController } from './shifts.controller';
import { RateLimitService } from '../auth/rate-limit.service';

@Module({
  controllers: [ShiftsController],
  providers: [RateLimitService],
})
export class ShiftsModule {}
