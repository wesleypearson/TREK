import { Injectable } from '@nestjs/common';
import { checkPermission } from '../../services/permissions';
import { verifyTripAccess } from '../../services/tripAccess';
import type { User } from '../../types';
import * as svc from '../../services/expenseTabService';

type Trip = NonNullable<ReturnType<typeof verifyTripAccess>>;

/**
 * Thin Nest wrapper around the expense-tab service (custom). Trip access and
 * the 'budget_edit' permission mirror the budget domain — a member who can
 * record expenses can also run tabs for them.
 */
@Injectable()
export class ExpenseTabsService {
  verifyTripAccess(tripId: string, userId: number) {
    return verifyTripAccess(tripId, userId);
  }

  canEdit(trip: Trip, user: User): boolean {
    return checkPermission('budget_edit', user.role, trip.user_id, user.id, trip.user_id !== user.id);
  }

  list(tripId: string, ownerUserId: number) {
    return svc.listTabs(tripId, ownerUserId);
  }

  create(tripId: string, ownerUserId: number, data: { first_name: string; last_name?: string; currency?: string | null }) {
    return svc.createTab(tripId, ownerUserId, data);
  }

  setRevoked(tripId: string, tabId: string, ownerUserId: number, revoked: boolean) {
    return svc.setTabRevoked(tripId, tabId, ownerUserId, revoked);
  }

  remove(tripId: string, tabId: string, ownerUserId: number) {
    return svc.deleteTab(tripId, tabId, ownerUserId);
  }

  addItem(tripId: string, tabId: string, ownerUserId: number, data: Parameters<typeof svc.addTabItem>[3]) {
    return svc.addTabItem(tripId, tabId, ownerUserId, data);
  }

  removeItem(tripId: string, tabId: string, itemId: string, ownerUserId: number) {
    return svc.deleteTabItem(tripId, tabId, itemId, ownerUserId);
  }

  addPayment(tripId: string, tabId: string, ownerUserId: number, data: { amount: number; note?: string | null }) {
    return svc.addTabPayment(tripId, tabId, ownerUserId, data);
  }

  removePayment(tripId: string, tabId: string, paymentId: string, ownerUserId: number) {
    return svc.deleteTabPayment(tripId, tabId, paymentId, ownerUserId);
  }

  csv(tripId: string, tabId: string, ownerUserId: number) {
    return svc.tabCsv(tripId, tabId, ownerUserId);
  }

  getPublicTab(token: string) {
    return svc.getPublicTab(token);
  }

  claim(token: string, firstName: string, lastName: string) {
    return svc.claimTab(token, firstName, lastName);
  }

  getPublicReceiptFile(token: string, itemId: string) {
    return svc.getPublicReceiptFile(token, itemId);
  }
}
