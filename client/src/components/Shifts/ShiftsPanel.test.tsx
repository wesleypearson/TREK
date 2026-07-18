// FE-COMP-SHIFTS-001 to FE-COMP-SHIFTS-007 — Shifts rostering timeclock panel.
// MSW serves list/start/stop; geolocation is stubbed on navigator the same way
// CapturePage.test does, so sign-on can be driven with and without a fix.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '../../../tests/helpers/render';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../tests/helpers/msw/server';
import { resetAllStores, seedStore } from '../../../tests/helpers/store';
import { buildUser } from '../../../tests/helpers/factories';
import { useAuthStore } from '../../store/authStore';
import { captureEvent } from '../../analytics/posthog';
import { addReconnectListener } from '../../api/websocket';
import type { Shift } from '../../api/client';
import ShiftsPanel from './ShiftsPanel';
import { fmtClock } from './ShiftsPanel';

vi.mock('../../analytics/posthog', () => ({
  captureEvent: vi.fn(),
}));

// ── Geolocation stub (one-shot getCurrentPosition) ───────────────────────────
let geoBehavior: 'grant' | 'deny' = 'grant';
const geoMock = {
  getCurrentPosition: vi.fn((success: PositionCallback, error?: PositionErrorCallback | null) => {
    if (geoBehavior === 'grant') {
      success({
        coords: { latitude: -33.8688, longitude: 151.2093, accuracy: 5, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
        timestamp: Date.now(),
      } as GeolocationPosition);
    } else {
      error?.({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: 'denied' } as GeolocationPositionError);
    }
  }),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

/** SQLite-style UTC timestamp, offset minutes back from now. */
function sqlTime(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString().slice(0, 19).replace('T', ' ');
}

function buildShift(overrides: Partial<Shift> = {}): Shift {
  return {
    id: 1,
    trip_id: 1,
    user_id: 1,
    started_at: sqlTime(120),
    ended_at: null,
    start_lat: null,
    start_lng: null,
    end_lat: null,
    end_lng: null,
    note: null,
    username: 'user1',
    avatar: null,
    ...overrides,
  };
}

let startBody: Record<string, unknown> | null;
let stopBody: Record<string, unknown> | null;

function useShiftHandlers(shifts: Shift[]) {
  server.use(
    http.get('/api/trips/:id/shifts', () => HttpResponse.json({ shifts, totals: [] })),
    http.post('/api/trips/:id/shifts/start', async ({ request }) => {
      startBody = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ shift: buildShift({ id: 99, started_at: sqlTime(0), note: (startBody?.note as string) ?? null }) }, { status: 201 });
    }),
    http.post('/api/trips/:id/shifts/:shiftId/stop', async ({ request, params }) => {
      stopBody = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ shift: buildShift({ id: Number(params.shiftId), started_at: sqlTime(90), ended_at: sqlTime(0) }) });
    }),
  );
}

beforeEach(() => {
  resetAllStores();
  vi.clearAllMocks();
  startBody = null;
  stopBody = null;
  geoBehavior = 'grant';
  vi.stubGlobal('navigator', Object.assign(Object.create(window.navigator), { geolocation: geoMock }));
  seedStore(useAuthStore, { isAuthenticated: true, user: buildUser({ id: 1, username: 'user1' }) });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('fmtClock', () => {
  it('FE-COMP-SHIFTS-000: formats seconds as h:mm:ss', () => {
    expect(fmtClock(0)).toBe('0:00:00');
    expect(fmtClock(65)).toBe('0:01:05');
    expect(fmtClock(9345)).toBe('2:35:45');
  });
});

describe('ShiftsPanel', () => {
  it('FE-COMP-SHIFTS-001: renders title, empty state and the sign-on button', async () => {
    useShiftHandlers([]);
    render(<ShiftsPanel tripId={1} />);
    await waitFor(() => expect(screen.getByText('Shifts')).toBeInTheDocument());
    expect(screen.getAllByText(/No shifts yet/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Nobody is on shift')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign on/i })).toBeEnabled();
  });

  it('FE-COMP-SHIFTS-002: sign on captures a one-shot fix, posts it, and shows the ticking timer', async () => {
    const user = userEvent.setup();
    useShiftHandlers([]);
    render(<ShiftsPanel tripId={1} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /sign on/i })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /sign on/i }));

    await waitFor(() => expect(screen.getByTestId('shift-elapsed')).toBeInTheDocument());
    // The one-shot fix went out with the start call.
    expect(geoMock.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(startBody).toMatchObject({ lat: -33.8688, lng: 151.2093 });
    // Button flips to sign off; the analytics event fired.
    expect(screen.getByRole('button', { name: /sign off/i })).toBeInTheDocument();
    expect(vi.mocked(captureEvent)).toHaveBeenCalledWith('shift_started', expect.objectContaining({ has_location: true }));
    // The signed-on member appears on the live roster.
    expect(screen.getByTestId('on-shift-1')).toBeInTheDocument();
  });

  it('FE-COMP-SHIFTS-003: denied location still signs on, with a note instead of coords', async () => {
    const user = userEvent.setup();
    geoBehavior = 'deny';
    useShiftHandlers([]);
    render(<ShiftsPanel tripId={1} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /sign on/i })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /sign on/i }));

    await waitFor(() => expect(screen.getByTestId('shift-elapsed')).toBeInTheDocument());
    expect(startBody).not.toBeNull();
    expect(startBody!.lat).toBeUndefined();
    expect(startBody!.note).toMatch(/location unavailable/i);
    // The denied marker shows next to the consent note.
    expect(screen.getByText(/Location unavailable/i)).toBeInTheDocument();
    expect(vi.mocked(captureEvent)).toHaveBeenCalledWith('shift_started', expect.objectContaining({ has_location: false }));
  });

  it('FE-COMP-SHIFTS-004: an open shift of mine renders the big elapsed timer immediately', async () => {
    useShiftHandlers([buildShift({ id: 5, started_at: sqlTime(150) })]);
    render(<ShiftsPanel tripId={1} />);

    await waitFor(() => expect(screen.getByTestId('shift-elapsed')).toBeInTheDocument());
    // ~2h30m elapsed → the clock starts with "2:"
    expect(screen.getByTestId('shift-elapsed').textContent).toMatch(/^2:(29|30):/);
    expect(screen.getByRole('button', { name: /sign off/i })).toBeInTheDocument();
    expect(screen.getByText(/Signed on/)).toBeInTheDocument();
  });

  it('FE-COMP-SHIFTS-005: sign off posts the stop with the fix and ends the session', async () => {
    const user = userEvent.setup();
    useShiftHandlers([buildShift({ id: 5, started_at: sqlTime(90) })]);
    render(<ShiftsPanel tripId={1} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /sign off/i })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /sign off/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /sign on/i })).toBeInTheDocument());
    expect(stopBody).toMatchObject({ lat: -33.8688, lng: 151.2093 });
    expect(screen.queryByTestId('shift-elapsed')).not.toBeInTheDocument();
    expect(vi.mocked(captureEvent)).toHaveBeenCalledWith('shift_ended', expect.objectContaining({ has_location: true }));
    // The finished shift lands in the day-grouped history (and the totals card).
    expect(screen.getAllByText(/1h 30m/).length).toBeGreaterThan(0);
  });

  it('FE-COMP-SHIFTS-006: roster shows everyone on shift now with live elapsed', async () => {
    useShiftHandlers([
      buildShift({ id: 10, user_id: 2, username: 'rigger', started_at: sqlTime(45) }),
      buildShift({ id: 11, user_id: 3, username: 'sound', started_at: sqlTime(130) }),
    ]);
    render(<ShiftsPanel tripId={1} />);

    await waitFor(() => expect(screen.getByTestId('on-shift-2')).toBeInTheDocument());
    expect(screen.getByTestId('on-shift-2')).toHaveTextContent('rigger');
    expect(screen.getByTestId('on-shift-2')).toHaveTextContent('0h 45m');
    expect(screen.getByTestId('on-shift-3')).toHaveTextContent('sound');
    expect(screen.getByTestId('on-shift-3')).toHaveTextContent('2h 10m');
    // Not my shift → I can still sign on.
    expect(screen.getByRole('button', { name: /sign on/i })).toBeInTheDocument();
  });

  it('FE-COMP-SHIFTS-007: history groups finished shifts by day and totals sum per member', async () => {
    useShiftHandlers([
      buildShift({ id: 20, user_id: 2, username: 'rigger', started_at: '2026-07-01 08:00:00', ended_at: '2026-07-01 12:00:00' }),
      buildShift({ id: 21, user_id: 2, username: 'rigger', started_at: '2026-07-02 09:00:00', ended_at: '2026-07-02 10:30:00' }),
      buildShift({ id: 22, user_id: 3, username: 'sound', started_at: '2026-07-02 09:00:00', ended_at: '2026-07-02 09:45:00' }),
    ]);
    render(<ShiftsPanel tripId={1} />);

    await waitFor(() => expect(screen.getByTestId('total-2')).toBeInTheDocument());
    // Totals: rigger 4h + 1h30m = 5h 30m; sound 45m. Biggest first.
    expect(screen.getByTestId('total-2')).toHaveTextContent('5h 30m');
    expect(screen.getByTestId('total-3')).toHaveTextContent('0h 45m');
    // History rows show the per-shift sign-on/off summary.
    expect(screen.getAllByText(/4h 0m/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0h 45m/).length).toBeGreaterThan(0);
    // Two distinct day groups (started_at days rendered as labels).
    const dayLabels = screen.getAllByText(/, 2026|2026/);
    expect(dayLabels.length).toBeGreaterThanOrEqual(2);
  });

  it('FE-COMP-SHIFTS-008: a 409 sign-on refetches the list so the open shift reconciles', async () => {
    const user = userEvent.setup();
    // First list load: empty (this tab missed the WS event); after the 409
    // re-pull, the server's open shift for me appears.
    let listCalls = 0;
    server.use(
      http.get('/api/trips/:id/shifts', () => {
        listCalls++;
        return HttpResponse.json({
          shifts: listCalls > 1 ? [buildShift({ id: 7, started_at: sqlTime(30) })] : [],
          totals: [],
        });
      }),
      http.post('/api/trips/:id/shifts/start', () =>
        HttpResponse.json({ error: 'Already on shift' }, { status: 409 })),
    );
    render(<ShiftsPanel tripId={1} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /sign on/i })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /sign on/i }));

    // The open shift from the other device/tab is now visible locally.
    await waitFor(() => expect(screen.getByTestId('shift-elapsed')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /sign off/i })).toBeInTheDocument();
    expect(listCalls).toBe(2);
  });

  it('FE-COMP-SHIFTS-009: a WS reconnect re-pulls the list (events dropped offline)', async () => {
    let listCalls = 0;
    server.use(
      http.get('/api/trips/:id/shifts', () => {
        listCalls++;
        return HttpResponse.json({
          shifts: listCalls > 1 ? [buildShift({ id: 42, user_id: 2, username: 'rigger', started_at: sqlTime(10) })] : [],
          totals: [],
        });
      }),
    );
    render(<ShiftsPanel tripId={1} />);
    await waitFor(() => expect(screen.getByText('Nobody is on shift')).toBeInTheDocument());

    // The hook registered for reconnects; fire the captured callback like the
    // socket's onopen does after a re-join.
    expect(vi.mocked(addReconnectListener)).toHaveBeenCalled();
    const reconnect = vi.mocked(addReconnectListener).mock.calls[0][0] as () => void;
    act(() => { reconnect(); });

    // The sign-on that happened during the outage is now on the roster.
    await waitFor(() => expect(screen.getByTestId('on-shift-2')).toBeInTheDocument());
    expect(screen.getByTestId('on-shift-2')).toHaveTextContent('rigger');
    expect(listCalls).toBe(2);
  });
});
