import { Injectable } from '@nestjs/common';
import { checkPermission } from '../../services/permissions';
import { verifyTripAccess } from '../../services/tripAccess';
import { broadcast } from '../../websocket';
import * as budget from '../../services/budgetService';
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

  /** List with the live ledger position attached to member-linked tabs. */
  async listWithLive(tripId: string, viewerId: number, tripCurrency?: string | null) {
    const tabs = svc.listTabs(tripId, viewerId);
    if (!tabs.some(t => t.member_user_id != null)) return tabs;
    const cur = (tripCurrency || 'AUD').toUpperCase();
    let rates: Record<string, number> | null = null;
    try {
      const { getRates } = await import('../../services/exchangeRateService');
      rates = await getRates(cur);
    } catch { /* FX outage degrades to frozen/identity rates */ }
    return tabs.map(t => t.member_user_id != null
      ? { ...t, live: svc.memberLivePosition(tripId, t.member_user_id, { rates, tripCurrency: (t.currency || cur).toUpperCase() }) }
      : t);
  }

  create(tripId: string, ownerUserId: number, data: { first_name: string; last_name?: string; currency?: string | null; member_user_id?: number | null; create_guest?: boolean }) {
    return svc.createTab(tripId, ownerUserId, data);
  }

  get(tripId: string, tabId: string, userId: number) {
    return svc.getTab(tripId, tabId, userId);
  }

  /**
   * Money received against a LINKED tab is a real settle-up transfer (member →
   * receiver), so the whole trip's balances move together. Mirrors the budget
   * controller's settlement path incl. the frozen FX rate (#1445) + broadcast.
   */
  async settleLinkedTab(tripId: string, memberUserId: number, receiverUserId: number, amount: number, currency?: string | null) {
    const data = { from_user_id: memberUserId, to_user_id: receiverUserId, amount, currency };
    await budget.freezeForeignRate(tripId, data);
    const settlement = budget.createSettlement(tripId, data, receiverUserId);
    broadcast(tripId, 'budget:settlement-created', { settlement }, undefined);
    return settlement;
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
