import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../tests/helpers/render';
import { Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../tests/helpers/msw/server';
import { resetAllStores } from '../../tests/helpers/store';
import PublicTabPage from './PublicTabPage';

// The public read model exactly as GET /api/public/tabs/:token returns it.
const tabPayload = {
  owner_name: 'Wesley',
  trip_title: 'Bali 2026',
  currency: 'AUD',
  first_name: 'Lisa',
  last_name: 'Nguyen',
  claimed: false,
  payment_methods: {
    payment_bank: 'BSB 062-000 Acct 1234 5678',
    payment_payid: 'wes@example.com',
  },
  items: [
    { id: 1, label: 'Dinner at Pier', amount: 90.25, currency: 'AUD', expense_date: '2026-07-10', created_at: '2026-07-14 10:00:00', has_receipt: true },
    { id: 2, label: 'Taxi share', amount: 22, currency: 'AUD', expense_date: null, created_at: '2026-07-14 11:00:00', has_receipt: false },
  ],
  payments: [{ id: 1, amount: 12.25, note: 'Beer money', created_at: '2026-07-13 09:00:00' }],
  charged: 112.25,
  paid: 12.25,
  balance: 100,
  join_url: '/login?invite=abc123',
};

function renderTab(token = 'tab-token') {
  return render(
    <Routes>
      <Route path="/public/tab/:token" element={<PublicTabPage />} />
    </Routes>,
    { initialEntries: [`/public/tab/${token}`] },
  );
}

beforeEach(() => {
  // The page is public — no auth store seeding on purpose.
  resetAllStores();
  vi.clearAllMocks();
  server.use(
    http.get('/api/public/tabs/:token', ({ params }) =>
      params.token === 'tab-token'
        ? HttpResponse.json(tabPayload)
        : HttpResponse.json({ error: 'Invalid or expired link' }, { status: 404 }),
    ),
  );
});

describe('PublicTabPage', () => {
  describe('FE-PAGE-TAB-001: renders the tab without authentication', () => {
    it('shows greeting, owner intro, balance and totals', async () => {
      renderTab();
      await waitFor(() => expect(screen.getByText('Hi Lisa,')).toBeInTheDocument());
      expect(screen.getByText(/Wesley is sharing this running tab/)).toBeInTheDocument();
      expect(screen.getByText(/balance owing/i)).toBeInTheDocument();
      // A$100.00 (hero) — exact formatting is locale-driven, so match loosely.
      expect(screen.getAllByText(/100\.00/).length).toBeGreaterThan(0);
    });
  });

  describe('FE-PAGE-TAB-002: charges, payments and receipts', () => {
    it('lists every charge, links shared receipts only, and shows payments as negative', async () => {
      renderTab();
      await waitFor(() => expect(screen.getByText('Dinner at Pier')).toBeInTheDocument());
      expect(screen.getByText('Taxi share')).toBeInTheDocument();
      // Only the has_receipt item links to the public receipt route.
      const receiptLinks = document.querySelectorAll('a[href*="/items/1/receipt"]');
      expect(receiptLinks.length).toBe(1);
      expect(document.querySelectorAll('a[href*="/items/2/receipt"]').length).toBe(0);
      expect(screen.getByText('Beer money')).toBeInTheDocument();
      expect(screen.getByText(/−.*12\.25/)).toBeInTheDocument();
    });
  });

  describe('FE-PAGE-TAB-003: payment methods from the owner profile', () => {
    it('shows only the filled-in methods', async () => {
      renderTab();
      await waitFor(() => expect(screen.getByText('BSB 062-000 Acct 1234 5678')).toBeInTheDocument());
      expect(screen.getByText('wes@example.com')).toBeInTheDocument();
      expect(screen.queryByText(/venmo/i)).not.toBeInTheDocument();
    });
  });

  describe('FE-PAGE-TAB-004: one-time name claim', () => {
    it('posts the claim and re-renders as claimed', async () => {
      let claimed = false;
      server.use(
        http.get('/api/public/tabs/:token', () =>
          HttpResponse.json(claimed ? { ...tabPayload, claimed: true, first_name: 'Lisa', last_name: 'Nguyen-Smith' } : tabPayload),
        ),
        http.post('/api/public/tabs/:token/claim', async ({ request }) => {
          const body = (await request.json()) as { first_name: string; last_name: string };
          expect(body).toEqual({ first_name: 'Lisa', last_name: 'Nguyen-Smith' });
          claimed = true;
          return HttpResponse.json({ success: true });
        }),
      );
      renderTab();
      await waitFor(() => expect(screen.getByPlaceholderText(/first name/i)).toBeInTheDocument());
      fireEvent.change(screen.getByPlaceholderText(/first name/i), { target: { value: 'Lisa' } });
      fireEvent.change(screen.getByPlaceholderText(/last name/i), { target: { value: 'Nguyen-Smith' } });
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
      await waitFor(() => expect(screen.getByText(/marked as seen/i)).toBeInTheDocument());
      expect(screen.queryByPlaceholderText(/first name/i)).not.toBeInTheDocument();
    });
  });

  describe('FE-PAGE-TAB-005: join link', () => {
    it('links to the one-use invite registration when available, hides it when used', async () => {
      renderTab();
      await waitFor(() => expect(screen.getByText(/join the trip/i)).toBeInTheDocument());
      expect(document.querySelector('a[href="/login?invite=abc123"]')).not.toBeNull();
    });

    it('hides the CTA when join_url is null', async () => {
      server.use(http.get('/api/public/tabs/:token', () => HttpResponse.json({ ...tabPayload, join_url: null })));
      renderTab();
      await waitFor(() => expect(screen.getByText('Hi Lisa,')).toBeInTheDocument());
      expect(screen.queryByText(/join the trip/i)).not.toBeInTheDocument();
    });
  });

  describe('FE-PAGE-TAB-006: settled and expired states', () => {
    it('shows the settled banner and no payment methods when balance is zero', async () => {
      server.use(http.get('/api/public/tabs/:token', () => HttpResponse.json({ ...tabPayload, balance: 0, paid: 112.25 })));
      renderTab();
      await waitFor(() => expect(screen.getByText(/all settled up/i)).toBeInTheDocument());
      expect(screen.queryByText('BSB 062-000 Acct 1234 5678')).not.toBeInTheDocument();
    });

    it('shows the expired screen on a 404 token', async () => {
      renderTab('bogus');
      await waitFor(() => expect(screen.getByText(/no longer active/i)).toBeInTheDocument());
    });
  });
});
