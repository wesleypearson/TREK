import { Module } from '@nestjs/common';
import { SuppliersController } from './suppliers.controller';
import { SuppliersAddonGuard } from './suppliers-addon.guard';

@Module({
  controllers: [SuppliersController],
  providers: [SuppliersAddonGuard],
})
export class SuppliersModule {}
