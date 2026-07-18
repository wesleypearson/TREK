// Suppliers CRM page — MSW-driven coverage in the AtlasPage.test idiom: real
// useSuppliers hook + real translations, network mocked per-test via server.use.
// Covers: list render, search (query param + filtered grid), detail modal
// (contact fields + spend/interactions), save PUT, enrich POST, delete confirm.
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '../../tests/helpers/render';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../tests/helpers/msw/server';
import { resetAllStores, seedStore } from '../../tests/helpers/store';
import { buildUser, buildSettings } from '../../tests/helpers/factories';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useAddonStore } from '../store/addonStore';
import type { SupplierDetail, SupplierListEntry } from '../api/client';
import SuppliersPage from './SuppliersPage';

// The shared Navbar pulls addons/plugins/auth — out of scope here.
vi.mock('../components/Layout/Navbar', () => ({
  default: () => React.createElement('nav', { 'data-testid': 'navbar' }),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────
const bakery: SupplierListEntry = {
  id: 1,
  name: 'Baker Street Bakery',
  category: 'Catering',
  phone: '+61 2 5550 1234',
  email: 'orders@bakerstreet.example',
  website: 'https://bakerstreet.example',
  address: '1 Baker St, Sydney',
  lat: null,
  lng: null,
  google_place_id: null,
  ai_summary: 'Family-run bakery the crew uses for load-in breakfasts.',
  notes: null,
  source: 'receipt',
  enriched_at: '2026-07-01 10:00:00',
  expense_count: 3,
  venue_count: 1,
  event_count: 2,
  last_interaction: '2026-07-10 09:30:00',
};

const avHire: SupplierListEntry = {
  id: 2,
  name: 'Redline AV Hire',
  category: null,
  phone: null,
  email: null,
  website: null,
  address: null,
  lat: null,
  lng: null,
  google_place_id: null,
  ai_summary: null,
  notes: null,
  source: 'manual',
  enriched_at: null,
  expense_count: 0,
  venue_count: 0,
  event_count: 0,
  last_interaction: null,
};

const bakeryDetail: SupplierDetail = {
  ...bakery,
  expenses: [
    {
      id: 11,
      trip_id: 5,
      trip_title: 'Sydney Run',
      name: 'Crew breakfast',
      total_price: 84.5,
      currency: 'AUD',
      expense_date: '2026-07-10',
      created_at: '2026-07-10 09:30:00',
      receipt_file_id: null,
    },
  ],
  venues: [{ id: 21, trip_id: 5, trip_title: 'Sydney Run', name: 'Enmore Theatre' }],
  spendByEvent: [{ trip_id: 5, trip_title: 'Sydney Run', currency: 'AUD', total: 184.5, count: 3 }],
};

// ── Handler harness: captures requests, serves the fixtures ───────────────────
let seenQueries: (string | null)[];
let putBodies: Record<string, unknown>[];
let enrichCalls: number;
let deleteCalls: number;
let deleted: boolean;

function useSupplierHandlers() {
  server.use(
    http.get('/api/addons/suppliers', ({ request }) => {
      const q = new URL(request.url).searchParams.get('q');
      seenQueries.push(q);
      let rows = deleted ? [avHire] : [bakery, avHire];
      if (q) rows = rows.filter(s => s.name.toLowerCase().includes(q.toLowerCase()));
      return HttpResponse.json({ suppliers: rows });
    }),
    http.get('/api/addons/suppliers/:id', ({ params }) =>
      params.id === '1'
        ? HttpResponse.json({ supplier: bakeryDetail })
        : HttpResponse.json({ error: 'Supplier not found' }, { status: 404 }),
    ),
    http.put('/api/addons/suppliers/:id', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      putBodies.push(body);
      return HttpResponse.json({ supplier: { ...bakery, ...body } });
    }),
    http.post('/api/addons/suppliers/:id/enrich', () => {
      enrichCalls += 1;
      return HttpResponse.json({
        supplier: { ...bakeryDetail, website: 'https://enriched.example', enriched_at: '2026-07-18 00:00:00' },
      });
    }),
    http.delete('/api/addons/suppliers/:id', () => {
      deleteCalls += 1;
      deleted = true;
      return HttpResponse.json({ success: true });
    }),
    http.post('/api/addons/suppliers', async ({ request }) => {
      const body = (await request.json()) as { name: string };
      return HttpResponse.json({ supplier: { ...avHire, id: 3, name: body.name } }, { status: 201 });
    }),
  );
}

async function openBakeryDetail(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => expect(screen.getByText('Baker Street Bakery')).toBeInTheDocument());
  await user.click(screen.getByText('Baker Street Bakery'));
  // Detail loaded once the contact form is populated.
  await waitFor(() => expect(screen.getByDisplayValue('+61 2 5550 1234')).toBeInTheDocument());
}

beforeEach(() => {
  resetAllStores();
  vi.clearAllMocks();
  seenQueries = [];
  putBodies = [];
  enrichCalls = 0;
  deleteCalls = 0;
  deleted = false;
  seedStore(useAuthStore, { isAuthenticated: true, user: buildUser() });
  seedStore(useSettingsStore, { settings: buildSettings({ dark_mode: false }) });
  // The route is addon-gated (/suppliers behind ProtectedRoute addonId="suppliers");
  // seed the addon store the way other addon-gated page tests do.
  seedStore(useAddonStore, {
    addons: [{ id: 'suppliers', name: 'Suppliers', type: 'global', icon: 'Store', enabled: true }],
    loaded: true,
  });
  useSupplierHandlers();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SuppliersPage', () => {
  describe('FE-PAGE-SUPPLIERS-001: list renders supplier cards', () => {
    it('shows every supplier from the list endpoint with category chip and aggregates', async () => {
      render(<SuppliersPage />);

      await waitFor(() => {
        expect(screen.getByText('Baker Street Bakery')).toBeInTheDocument();
        expect(screen.getByText('Redline AV Hire')).toBeInTheDocument();
      });

      // Category chip + receipt-source badge on the scanned supplier.
      expect(screen.getByText('Catering')).toBeInTheDocument();
      expect(screen.getByText(/from a receipt scan/i)).toBeInTheDocument();
      // Aggregates: 2 events / 3 expenses / 1 venue; the untouched one shows the empty label.
      expect(screen.getByText('2 events')).toBeInTheDocument();
      expect(screen.getByText('3 expenses')).toBeInTheDocument();
      expect(screen.getByText('1 venues')).toBeInTheDocument();
      expect(screen.getByText(/no interactions yet/i)).toBeInTheDocument();
    });
  });

  describe('FE-PAGE-SUPPLIERS-002: search filters the grid', () => {
    it('sends the query to the API and renders only matching suppliers', async () => {
      const user = userEvent.setup();
      render(<SuppliersPage />);

      await waitFor(() => expect(screen.getByText('Redline AV Hire')).toBeInTheDocument());

      await user.type(screen.getByPlaceholderText(/search suppliers/i), 'baker');

      await waitFor(() => {
        expect(screen.queryByText('Redline AV Hire')).not.toBeInTheDocument();
      });
      expect(screen.getByText('Baker Street Bakery')).toBeInTheDocument();
      // The (debounced) reload carried the query param.
      expect(seenQueries).toContain('baker');
    });

    it('shows the no-results note when nothing matches', async () => {
      const user = userEvent.setup();
      render(<SuppliersPage />);

      await waitFor(() => expect(screen.getByText('Baker Street Bakery')).toBeInTheDocument());
      await user.type(screen.getByPlaceholderText(/search suppliers/i), 'zzz');

      await waitFor(() => {
        expect(screen.getByText(/no suppliers match "zzz"/i)).toBeInTheDocument();
      });
    });
  });

  describe('FE-PAGE-SUPPLIERS-003: detail modal', () => {
    it('opens on card click with contact fields, AI notes, spend and interactions', async () => {
      const user = userEvent.setup();
      render(<SuppliersPage />);

      await openBakeryDetail(user);

      // Contact fields carry the supplier's values.
      expect(screen.getByDisplayValue('Catering')).toBeInTheDocument();
      expect(screen.getByDisplayValue('orders@bakerstreet.example')).toBeInTheDocument();
      expect(screen.getByDisplayValue('https://bakerstreet.example')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1 Baker St, Sydney')).toBeInTheDocument();
      // AI notes block (read-only, present because ai_summary is set).
      expect(screen.getByText(/family-run bakery the crew uses/i)).toBeInTheDocument();
      // Spend by event: trip title + formatted AUD total + expense count (the
      // count also sits on the card behind the modal, hence getAllByText).
      expect(screen.getAllByText('Sydney Run').length).toBeGreaterThan(0);
      expect(screen.getByText('$184.50')).toBeInTheDocument();
      expect(screen.getAllByText('3 expenses').length).toBeGreaterThan(1);
      // Interactions: the expense row with its own amount.
      expect(screen.getByText('Crew breakfast')).toBeInTheDocument();
      expect(screen.getByText('$84.50')).toBeInTheDocument();
      // Venue chip.
      expect(screen.getByText('Enmore Theatre')).toBeInTheDocument();
    });
  });

  describe('FE-PAGE-SUPPLIERS-004: save', () => {
    it('PUTs the edited contact fields', async () => {
      const user = userEvent.setup();
      render(<SuppliersPage />);

      await openBakeryDetail(user);

      const categoryInput = screen.getByDisplayValue('Catering');
      await user.clear(categoryInput);
      await user.type(categoryInput, 'AV hire');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => expect(putBodies).toHaveLength(1));
      expect(putBodies[0]).toMatchObject({
        category: 'AV hire',
        phone: '+61 2 5550 1234',
        email: 'orders@bakerstreet.example',
        website: 'https://bakerstreet.example',
        address: '1 Baker St, Sydney',
        notes: '',
      });
    });
  });

  describe('FE-PAGE-SUPPLIERS-005: enrich', () => {
    it('POSTs to the enrich endpoint and applies the refreshed detail', async () => {
      const user = userEvent.setup();
      render(<SuppliersPage />);

      await openBakeryDetail(user);

      await user.click(screen.getByRole('button', { name: /enrich/i }));

      await waitFor(() => expect(enrichCalls).toBe(1));
      // The gap-filled website from the enrich response lands in the form.
      await waitFor(() => {
        expect(screen.getByDisplayValue('https://enriched.example')).toBeInTheDocument();
      });
    });
  });

  describe('FE-PAGE-SUPPLIERS-006: delete via nested confirm', () => {
    it('opens the confirm modal, DELETEs on confirm and drops the card', async () => {
      const user = userEvent.setup();
      render(<SuppliersPage />);

      await openBakeryDetail(user);

      // Footer delete opens the nested confirm modal (its body names the supplier).
      await user.click(screen.getByRole('button', { name: 'Delete supplier' }));
      await waitFor(() => {
        expect(screen.getByText(/this removes Baker Street Bakery from the book/i)).toBeInTheDocument();
      });

      // Two "Delete supplier" buttons now exist (detail footer + confirm footer);
      // the confirm modal portals in last.
      const deleteButtons = screen.getAllByRole('button', { name: 'Delete supplier' });
      await user.click(deleteButtons[deleteButtons.length - 1]);

      await waitFor(() => expect(deleteCalls).toBe(1));
      // Detail + confirm close, list reloads without the deleted supplier.
      await waitFor(() => {
        expect(screen.queryByText(/this removes Baker Street Bakery/i)).not.toBeInTheDocument();
        expect(screen.queryByText('Baker Street Bakery')).not.toBeInTheDocument();
      });
      expect(screen.getByText('Redline AV Hire')).toBeInTheDocument();
    });
  });

  describe('FE-PAGE-SUPPLIERS-007: create flow', () => {
    it('POSTs the name and opens the fresh supplier detail', async () => {
      server.use(
        http.get('/api/addons/suppliers/3', () =>
          HttpResponse.json({
            supplier: { ...avHire, id: 3, name: 'Night Owl Security', expenses: [], venues: [], spendByEvent: [] },
          }),
        ),
      );
      const user = userEvent.setup();
      render(<SuppliersPage />);

      await waitFor(() => expect(screen.getByText('Baker Street Bakery')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /add supplier/i }));
      await user.type(screen.getByPlaceholderText(/business name/i), 'Night Owl Security');
      // The create modal footer's confirm button shares the "Add supplier" label.
      const addButtons = screen.getAllByRole('button', { name: /add supplier/i });
      await user.click(addButtons[addButtons.length - 1]);

      // The created supplier's detail modal opens (name as the modal title).
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Night Owl Security' })).toBeInTheDocument();
      });
      expect(screen.getByText(/nothing recorded with this supplier yet/i)).toBeInTheDocument();
    });
  });
});
