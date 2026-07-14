import { Module } from '@nestjs/common';
import { TripExpenseTabsController } from './expense-tabs.controller';
import { PublicExpenseTabController } from './public-expense-tab.controller';
import { ExpenseTabsService } from './expense-tabs.service';
import { RateLimitService } from '../auth/rate-limit.service';

/** Public expense tabs (custom) — owner management + no-account public page. */
@Module({
  controllers: [TripExpenseTabsController, PublicExpenseTabController],
  providers: [ExpenseTabsService, RateLimitService],
})
export class ExpenseTabsModule {}
