// FE-COMP-REPORT-001 to FE-COMP-REPORT-004 — Production report modal (SM/PM digest).
// MSW serves GET /report and POST /report/share; PostHog capture is mocked.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '../../../tests/helpers/render';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../tests/helpers/msw/server';
import { captureEvent } from '../../analytics/posthog';
import type { ProductionReport } from '../../api/client';
import ProductionReportModal from './ProductionReportModal';

vi.mock('../../analytics/posthog', () => ({
  captureEvent: vi.fn(),
}));

const FULL_REPORT: ProductionReport = {
  days: 7,
  changes: [{
    id: 1, actor_user_id: 2, actor_name: 'Wes', source: 'edit', entity: 'reservation', entity_id: 5,
    label: 'Soundcheck', field: 'reservation_time',
    old_value: '2026-07-18T16:00', new_value: '2026-07-18T17:00', created_at: '2026-07-17 10:00:00',
  }],
  files: [{
    id: 3, original_name: 'stage-plot.pdf', file_size: 1000, mime_type: 'application/pdf',
    is_private: 0, created_at: '2026-07-17 09:00:00', uploaded_by_name: 'Wes',
  }],
  shifts: [{ user_id: 2, username: 'Wes', total_seconds: 12600, open: 1 }],
  upcoming: [{
    kind: 'reservation', id: 9, title: 'Doors', time: '2026-07-19T18:00',
    day_date: '2026-07-19', type: 'event', location: 'Enmore Theatre',
  }],
};

const EMPTY_REPORT: ProductionReport = { days: 7, changes: [], files: [], shifts: [], upcoming: [] };

let requestedDays: (string | null)[];
let shareBody: Record<string, unknown> | null;

function useReportHandlers(report: ProductionReport) {
  server.use(
    http.get('/api/trips/:id/report', ({ request }) => {
      requestedDays.push(new URL(request.url).searchParams.get('days'));
      return HttpResponse.json(report);
    }),
    http.post('/api/trips/:id/report/share', async ({ request }) => {
      shareBody = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ shared: true });
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  requestedDays = [];
  shareBody = null;
});

describe('ProductionReportModal', () => {
  it('FE-COMP-REPORT-001: renders all four sections from the report payload', async () => {
    useReportHandlers(FULL_REPORT);
    render(<ProductionReportModal tripId={1} isOpen onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Soundcheck')).toBeInTheDocument());
    // Change row: old → new (T stripped for reading), actor and time.
    expect(screen.getByText('2026-07-18 16:00')).toBeInTheDocument();
    expect(screen.getByText('2026-07-18 17:00')).toBeInTheDocument();
    expect(screen.getAllByText(/by Wes/).length).toBeGreaterThanOrEqual(2);
    // Files loaded.
    expect(screen.getByText('stage-plot.pdf')).toBeInTheDocument();
    // Shift hours: 12600 s = 3h 30m, flagged as on shift now.
    expect(screen.getByTestId('report-total-2')).toHaveTextContent('3h 30m');
    expect(screen.getByText(/on shift now/i)).toBeInTheDocument();
    // Next 48h.
    expect(screen.getByTestId('report-upcoming-reservation-9')).toHaveTextContent('Doors');
    expect(screen.getByText(/Enmore Theatre/)).toBeInTheDocument();
    // Analytics: the view was captured with the default 7-day range.
    expect(vi.mocked(captureEvent)).toHaveBeenCalledWith('report_viewed', { trip_id: 1, days: 7 });
    expect(requestedDays).toEqual(['7']);
  });

  it('FE-COMP-REPORT-002: switching the range refetches with the new days window', async () => {
    const user = userEvent.setup();
    useReportHandlers(FULL_REPORT);
    render(<ProductionReportModal tripId={1} isOpen onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Soundcheck')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /last 24h/i }));

    await waitFor(() => expect(requestedDays).toEqual(['7', '1']));
    expect(vi.mocked(captureEvent)).toHaveBeenCalledWith('report_viewed', { trip_id: 1, days: 1 });
  });

  it('FE-COMP-REPORT-003: Share to chat posts the share for the active range', async () => {
    const user = userEvent.setup();
    useReportHandlers(FULL_REPORT);
    render(<ProductionReportModal tripId={1} isOpen onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Soundcheck')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /share to chat/i }));

    // The body carries the local wall-clock `now` — planner times are
    // local-naive, so the server anchors the 48h window on the caller's clock.
    await waitFor(() => expect(shareBody).toEqual({
      days: 7,
      now: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
    }));
    expect(vi.mocked(captureEvent)).toHaveBeenCalledWith('report_shared', { trip_id: 1, days: 7 });
  });

  it('FE-COMP-REPORT-004: an empty report shows every section empty state', async () => {
    useReportHandlers(EMPTY_REPORT);
    render(<ProductionReportModal tripId={1} isOpen onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText(/No schedule changes/i)).toBeInTheDocument());
    expect(screen.getByText(/No files loaded/i)).toBeInTheDocument();
    expect(screen.getByText(/No shifts in this range/i)).toBeInTheDocument();
    expect(screen.getByText(/Nothing scheduled in the next 48 hours/i)).toBeInTheDocument();
  });

  it('FE-COMP-REPORT-005: the GET carries the local wall-clock now for the 48h window', async () => {
    let nowParam: string | null = null;
    server.use(http.get('/api/trips/:id/report', ({ request }) => {
      nowParam = new URL(request.url).searchParams.get('now');
      return HttpResponse.json(FULL_REPORT);
    }));
    render(<ProductionReportModal tripId={1} isOpen onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Soundcheck')).toBeInTheDocument());

    expect(nowParam).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    // 'YYYY-MM-DDTHH:MM' parses as LOCAL time in JS — it must be the viewer's
    // wall clock (within a couple of minutes of now), not UTC.
    expect(Math.abs(new Date(nowParam!).getTime() - Date.now())).toBeLessThan(2 * 60_000);
  });

  it('FE-COMP-REPORT-006: a failed load shows an inline error with a working retry', async () => {
    const user = userEvent.setup();
    let calls = 0;
    server.use(http.get('/api/trips/:id/report', () => {
      calls++;
      return calls === 1
        ? HttpResponse.json({ error: 'boom' }, { status: 500 })
        : HttpResponse.json(FULL_REPORT);
    }));
    render(<ProductionReportModal tripId={1} isOpen onClose={vi.fn()} />);

    // No permanent spinner: the error state renders with a retry button.
    await waitFor(() => expect(screen.getByText(/load the report/i)).toBeInTheDocument());
    expect(screen.queryByText('Soundcheck')).not.toBeInTheDocument();
    expect(vi.mocked(captureEvent)).not.toHaveBeenCalledWith('report_viewed', expect.anything());

    await user.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(screen.getByText('Soundcheck')).toBeInTheDocument());
    expect(calls).toBe(2);
  });

  it('FE-COMP-REPORT-007: a failed range switch shows the error, not stale data', async () => {
    const user = userEvent.setup();
    server.use(http.get('/api/trips/:id/report', ({ request }) => {
      const days = new URL(request.url).searchParams.get('days');
      return days === '1'
        ? HttpResponse.json({ error: 'boom' }, { status: 500 })
        : HttpResponse.json(FULL_REPORT);
    }));
    render(<ProductionReportModal tripId={1} isOpen onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Soundcheck')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /last 24h/i }));

    // The previous range's sections must not linger as if they were the 24h data.
    await waitFor(() => expect(screen.getByText(/load the report/i)).toBeInTheDocument());
    expect(screen.queryByText('Soundcheck')).not.toBeInTheDocument();
  });

  it('FE-COMP-REPORT-008: a failed share never fires the success analytics event', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/trips/:id/report', () => HttpResponse.json(FULL_REPORT)),
      http.post('/api/trips/:id/report/share', () =>
        HttpResponse.json({ error: 'Could not post the report to the event chat' }, { status: 502 })),
    );
    render(<ProductionReportModal tripId={1} isOpen onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Soundcheck')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /share to chat/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /share to chat/i })).toBeEnabled());
    expect(vi.mocked(captureEvent)).not.toHaveBeenCalledWith('report_shared', expect.anything());
  });
});
