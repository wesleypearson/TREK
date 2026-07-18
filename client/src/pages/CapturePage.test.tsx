// Capture page — consent-first foreground sensor recording. Follows the
// SuppliersPage.test idiom: real useCapture hook + real translations, stores
// seeded, shared Navbar mocked out, geolocation stubbed on navigator so the
// location watch callback can be driven by hand.
// Covers: consent toggles render (all OFF), start creates a session UI,
// samples counter + last fix update on a watchPosition callback, stop shows
// the summary card and emits the capture_session_summary analytics event.
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '../../tests/helpers/render';
import userEvent from '@testing-library/user-event';
import { resetAllStores, seedStore } from '../../tests/helpers/store';
import { buildUser, buildSettings } from '../../tests/helpers/factories';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useAddonStore } from '../store/addonStore';
import { captureEvent } from '../analytics/posthog';
import CapturePage from './CapturePage';

// The shared Navbar pulls addons/plugins/auth — out of scope here.
vi.mock('../components/Layout/Navbar', () => ({
  default: () => React.createElement('nav', { 'data-testid': 'navbar' }),
}));

// Samples flush through the app-wide analytics wrapper — spy on it.
vi.mock('../analytics/posthog', () => ({
  captureEvent: vi.fn(),
}));

// ── Geolocation stub: capture the watch callback so tests can fire fixes ──────
let watchSuccess: PositionCallback | null;
let watchOptions: PositionOptions | undefined;
const geoMock = {
  watchPosition: vi.fn((success: PositionCallback, _error?: PositionErrorCallback | null, options?: PositionOptions) => {
    watchSuccess = success;
    watchOptions = options;
    return 42;
  }),
  clearWatch: vi.fn(),
  getCurrentPosition: vi.fn(),
};

function buildFix(lat: number, lng: number): GeolocationPosition {
  return {
    coords: {
      latitude: lat,
      longitude: lng,
      accuracy: 5,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  } as GeolocationPosition;
}

async function startLocationSession(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('switch', { name: 'Location trail' }));
  await user.click(screen.getByRole('button', { name: /start capture/i }));
  await waitFor(() => expect(screen.getByRole('button', { name: /stop capture/i })).toBeInTheDocument());
}

beforeEach(() => {
  resetAllStores();
  vi.clearAllMocks();
  watchSuccess = null;
  watchOptions = undefined;
  // Keep the real Navigator prototype chain (userEvent reads other props) and
  // override just the geolocation member.
  vi.stubGlobal('navigator', Object.assign(Object.create(window.navigator), { geolocation: geoMock }));
  seedStore(useAuthStore, { isAuthenticated: true, user: buildUser() });
  seedStore(useSettingsStore, { settings: buildSettings({ dark_mode: false }) });
  // The route is addon-gated (/capture behind ProtectedRoute addonId="capture");
  // seed the addon store the way other addon-gated page tests do.
  seedStore(useAddonStore, {
    addons: [{ id: 'capture', name: 'Capture', type: 'global', icon: 'Radio', enabled: true }],
    loaded: true,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('CapturePage', () => {
  describe('FE-PAGE-CAPTURE-001: consent toggles render OFF by default', () => {
    it('shows all five sensor toggles unchecked and start disabled until one is on', async () => {
      const user = userEvent.setup();
      render(<CapturePage />);

      const names = ['Location trail', 'Motion', 'Battery', 'Network', 'Screen visibility'];
      for (const name of names) {
        const toggle = screen.getByRole('switch', { name });
        expect(toggle).toHaveAttribute('aria-checked', 'false');
      }
      // Consent-first: nothing can start until a sensor is switched on.
      expect(screen.getByRole('button', { name: /start capture/i })).toBeDisabled();
      expect(screen.getByText(/switch on at least one sensor/i)).toBeInTheDocument();
      // The foreground-only warning is always visible.
      expect(screen.getByText(/only runs while the app is open/i)).toBeInTheDocument();

      await user.click(screen.getByRole('switch', { name: 'Location trail' }));
      expect(screen.getByRole('switch', { name: 'Location trail' })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('button', { name: /start capture/i })).toBeEnabled();
    });
  });

  describe('FE-PAGE-CAPTURE-002: start creates a session UI', () => {
    it('starts a high-accuracy location watch and shows the live stats card', async () => {
      const user = userEvent.setup();
      render(<CapturePage />);

      await startLocationSession(user);

      // The geolocation watch started with high accuracy, as CrowdSense would.
      expect(geoMock.watchPosition).toHaveBeenCalledTimes(1);
      expect(watchOptions).toMatchObject({ enableHighAccuracy: true });
      // Live stats: recording chip, elapsed timer at zero, zeroed counters, no fix yet.
      expect(screen.getByText('Recording')).toBeInTheDocument();
      expect(screen.getByText('0:00')).toBeInTheDocument();
      expect(screen.getByTestId('capture-count-location')).toHaveTextContent('0');
      expect(screen.getByTestId('capture-last-fix')).toHaveTextContent('No fix yet');
      // Consent is locked for the life of the session.
      expect(screen.getByRole('switch', { name: 'Motion' })).toBeDisabled();
    });
  });

  describe('FE-PAGE-CAPTURE-003: samples counter updates on watch callbacks', () => {
    it('counts a fix, shows lat/lng at 4 dp, and throttles fixes inside 5s', async () => {
      const user = userEvent.setup();
      render(<CapturePage />);

      await startLocationSession(user);
      expect(watchSuccess).not.toBeNull();

      act(() => {
        watchSuccess!(buildFix(-33.891234, 151.203987));
      });

      await waitFor(() => expect(screen.getByTestId('capture-count-location')).toHaveTextContent('1'));
      expect(screen.getByTestId('capture-last-fix')).toHaveTextContent('-33.8912, 151.2040');

      // A second callback inside the 5 s throttle window is dropped.
      act(() => {
        watchSuccess!(buildFix(-33.9, 151.21));
      });
      expect(screen.getByTestId('capture-count-location')).toHaveTextContent('1');
      expect(screen.getByTestId('capture-last-fix')).toHaveTextContent('-33.8912, 151.2040');
    });
  });

  describe('FE-PAGE-CAPTURE-004: stop shows the summary and reports the session', () => {
    it('tears down the watch, flushes samples, and renders the summary card', async () => {
      const user = userEvent.setup();
      render(<CapturePage />);

      await startLocationSession(user);
      act(() => {
        watchSuccess!(buildFix(-33.891234, 151.203987));
      });
      await waitFor(() => expect(screen.getByTestId('capture-count-location')).toHaveTextContent('1'));

      await user.click(screen.getByRole('button', { name: /stop capture/i }));

      // Summary card with the session's aggregate numbers.
      await waitFor(() => expect(screen.getByText('Session summary')).toBeInTheDocument());
      expect(screen.getByText('Total samples')).toBeInTheDocument();
      expect(geoMock.clearWatch).toHaveBeenCalledWith(42);

      // The buffered sample flushed on stop, then the summary event fired.
      const calls = vi.mocked(captureEvent).mock.calls;
      const sampleCall = calls.find(([name]) => name === 'capture_sample');
      expect(sampleCall).toBeDefined();
      expect(sampleCall![1]).toMatchObject({ sensor: 'location', lat: -33.891234, lng: 151.203987 });
      const summaryCall = calls.find(([name]) => name === 'capture_session_summary');
      expect(summaryCall).toBeDefined();
      expect(summaryCall![1]).toMatchObject({ duration_s: expect.any(Number) });
      expect((summaryCall![1] as { counts: Record<string, number> }).counts.location).toBe(1);
      // Both events share the same generated session id.
      expect((sampleCall![1] as { capture_session: string }).capture_session)
        .toBe((summaryCall![1] as { capture_session: string }).capture_session);

      // Toggles unlock again after stop.
      expect(screen.getByRole('switch', { name: 'Location trail' })).toBeEnabled();
    });
  });
});
