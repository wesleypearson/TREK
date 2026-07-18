import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { RateLimitService } from '../auth/rate-limit.service';

@Module({
  controllers: [ReportsController],
  providers: [RateLimitService],
})
export class ReportsModule {}
