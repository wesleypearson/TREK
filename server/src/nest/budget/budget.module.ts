import { Module } from '@nestjs/common';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';
import { ReceiptScanService } from './receipt-scan.service';

/** Budget domain (S4 — Phase 2 trip sub-domain). Registered in AppModule. */
@Module({
  controllers: [BudgetController],
  providers: [BudgetService, ReceiptScanService],
})
export class BudgetModule {}
