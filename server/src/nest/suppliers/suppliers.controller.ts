import { Body, Controller, Delete, Get, HttpCode, HttpException, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import type { User } from '../../types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { SuppliersAddonGuard } from './suppliers-addon.guard';
import { ValidationError } from '../../services/tripService';
import * as suppliers from '../../services/supplierService';
import { enrichSupplierFromPlaces, enrichSupplierWithAi } from '../../services/supplierEnrichment';

/**
 * /api/addons/suppliers — the instance-wide vendor book (CRM).
 *
 * Suppliers are shared across the whole instance: every signed-in user can
 * read and maintain the book (it is the crew's collective memory), deleting
 * an entry is kept to admins and the row's creator. Addon disabled → 404 for
 * the whole group (guard before auth, like Collections).
 */
@Controller('api/addons/suppliers')
@UseGuards(SuppliersAddonGuard, JwtAuthGuard)
export class SuppliersController {
  @Get()
  list(@Query('q') q?: string) {
    return { suppliers: suppliers.listSuppliers(q) };
  }

  @Post()
  @HttpCode(201)
  create(@CurrentUser() user: User, @Body() body: Record<string, unknown>) {
    try {
      return { supplier: suppliers.createSupplier(body, user.id) };
    } catch (e) {
      if (e instanceof ValidationError) throw new HttpException({ error: e.message }, 400);
      throw e;
    }
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    const detail = suppliers.supplierDetail(parseInt(id));
    if (!detail) throw new HttpException({ error: 'Supplier not found' }, 404);
    return { supplier: detail };
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    try {
      return { supplier: suppliers.updateSupplier(parseInt(id), body) };
    } catch (e) {
      if (e instanceof ValidationError) {
        const status = e.message === 'Supplier not found' ? 404 : 400;
        throw new HttpException({ error: e.message }, status);
      }
      throw e;
    }
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    const row = suppliers.getSupplier(parseInt(id));
    if (!row) throw new HttpException({ error: 'Supplier not found' }, 404);
    if (user.role !== 'admin' && row.created_by !== user.id) {
      throw new HttpException({ error: 'Only an admin or the creator can delete a supplier' }, 403);
    }
    suppliers.deleteSupplier(row.id);
    return { success: true };
  }

  /** Re-run enrichment on demand (Google Places + AI note), gap-fill only. */
  @Post(':id/enrich')
  @HttpCode(200)
  async enrich(@CurrentUser() user: User, @Param('id') id: string) {
    const row = suppliers.getSupplier(parseInt(id));
    if (!row) throw new HttpException({ error: 'Supplier not found' }, 404);
    await enrichSupplierFromPlaces(row.id, user.id, { address: row.address });
    await enrichSupplierWithAi(row.id, user.id, {});
    return { supplier: suppliers.supplierDetail(row.id) };
  }
}
