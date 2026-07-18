import { CanActivate, HttpException, Injectable } from '@nestjs/common';
import { isAddonEnabled } from '../../services/adminService';
import { ADDON_IDS } from '../../addons';

/**
 * Addon mount gate: with the Suppliers addon disabled the whole route group
 * answers 404, regardless of auth — same shape as the Collections guard.
 */
@Injectable()
export class SuppliersAddonGuard implements CanActivate {
  canActivate(): boolean {
    if (!isAddonEnabled(ADDON_IDS.SUPPLIERS)) {
      throw new HttpException({ error: 'Suppliers addon is not enabled' }, 404);
    }
    return true;
  }
}
