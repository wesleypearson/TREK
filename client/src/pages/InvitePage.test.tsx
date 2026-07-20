// FE-INVITE-001 to FE-INVITE-007 — public guest-invite redemption landing.
// MSW serves resolve/register/colleagues; the authStore's adoptSession is
// mocked so redemption doesn't drag in the offline DB machinery.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { render, screen, waitFor } from '../../tests/helpers/render';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../tests/helpers/msw/server';
import { captureEvent } from '../analytics/posthog';
import { useAuthStore } from '../store/authStore';
import InvitePage from './InvitePage';

vi.mock('../analytics/posthog', () => ({
  captureEvent: vi.fn(),
  identifyUser: vi.fn(),
  initAnalytics: vi.fn(),
  resetAnalytics: vi.fn(),
  setAnalyticsOptOut: vi.fn(),
  isAnalyticsOptedOut: vi.fn(() => false),
}));

const adoptSession = vi.fn(async () => {});

const PREFILL = {
  kind: 'guest',
  guest_name: 'Rigger Rae',
  contact_email: 'rae@example.com',
  trip_title: 'Autumn Tour 26',
  inviter_name: 'Wes',
  company_name: null,
  expires_at: new Date(Date.now() + 86400000).toISOString(),
};

function mountAt(token = 'tok123') {
  return render(
    <Routes>
      <Route path="/invite/:token" element={<InvitePage />} />
      <Route path="/trips/:id" element={<div>TRIP PAGE</div>} />
      <Route path="/dashboard" element={<div>DASH</div>} />
    </Routes>,
    { initialEntries: [`/invite/${token}`] },
  );
}

beforeEach(() => {
  vi.mocked(captureEvent).mockClear();
  adoptSession.mockClear();
  useAuthStore.setState({ adoptSession } as never);
});

describe('InvitePage', () => {
  it('FE-INVITE-001 renders the prefilled landing for a valid token', async () => {
    server.use(http.get('/api/guest-invites/:token', () => HttpResponse.json(PREFILL)));
    mountAt();
    expect(await screen.findByText(/Rigger Rae/)).toBeInTheDocument();
    expect(screen.getByText('Autumn Tour 26')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toHaveValue('rae@example.com');
    expect(vi.mocked(captureEvent)).toHaveBeenCalledWith('invite_landing_viewed', { state: 'valid' });
  });

  it('FE-INVITE-002 renders the expired state on 410', async () => {
    server.use(http.get('/api/guest-invites/:token', () => HttpResponse.json({ error: 'expired' }, { status: 410 })));
    mountAt();
    expect(await screen.findByText('This invite link has expired')).toBeInTheDocument();
    expect(vi.mocked(captureEvent)).toHaveBeenCalledWith('invite_landing_viewed', { state: 'expired' });
  });

  it('FE-INVITE-003 renders the invalid state on 404', async () => {
    server.use(http.get('/api/guest-invites/:token', () => HttpResponse.json({ error: 'Invalid invite link' }, { status: 404 })));
    mountAt();
    expect(await screen.findByText('This invite link is no longer valid')).toBeInTheDocument();
  });

  it('FE-INVITE-004 submits the form, adopts the session and lands in the trip', async () => {
    let registerBody: Record<string, unknown> | null = null;
    server.use(
      http.get('/api/guest-invites/:token', () => HttpResponse.json(PREFILL)),
      http.post('/api/guest-invites/:token/register', async ({ request }) => {
        registerBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ token: 'jwt', user: { id: 42, username: 'foxreal' }, trip_id: 7 }, { status: 201 });
      }),
    );
    mountAt();
    await screen.findByText(/Rigger Rae/);
    await userEvent.type(screen.getByLabelText('Username'), 'foxreal');
    await userEvent.type(screen.getByLabelText('Password'), 'Str0ng!Passw0rd');
    await userEvent.click(screen.getByRole('button', { name: /Create account/ }));

    await screen.findByText('TRIP PAGE');
    expect(registerBody).toMatchObject({ username: 'foxreal', email: 'rae@example.com' });
    expect(registerBody).not.toHaveProperty('company_name');
    expect(adoptSession).toHaveBeenCalledWith({ id: 42, username: 'foxreal' });
    expect(vi.mocked(captureEvent)).toHaveBeenCalledWith('invite_registration_completed', { trip_id: 7 });
  });

  it('FE-INVITE-005 a company entry routes through the colleagues step and generates links', async () => {
    server.use(
      http.get('/api/guest-invites/:token', () => HttpResponse.json(PREFILL)),
      http.post('/api/guest-invites/:token/register', () =>
        HttpResponse.json({ token: 'jwt', user: { id: 43, username: 'compuser' }, trip_id: 7 }, { status: 201 })),
      http.post('/api/guest-invites/colleagues', () =>
        HttpResponse.json({ company_name: 'Neon Audio', invite_paths: ['/invite/aaa', '/invite/bbb'] }, { status: 201 })),
    );
    mountAt();
    await screen.findByText(/Rigger Rae/);
    await userEvent.type(screen.getByLabelText('Username'), 'compuser');
    await userEvent.type(screen.getByLabelText('Password'), 'Str0ng!Passw0rd');
    await userEvent.type(screen.getByLabelText(/Company/), 'Neon Audio');
    await userEvent.click(screen.getByRole('button', { name: /Create account/ }));

    expect(await screen.findByText('Invite your colleagues')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Generate links' }));
    await waitFor(() => {
      expect(screen.getByText(new RegExp('/invite/aaa'))).toBeInTheDocument();
    });
    expect(vi.mocked(captureEvent)).toHaveBeenCalledWith('invite_colleague_links_generated', { count: 2 });
    await userEvent.click(screen.getByRole('button', { name: 'Go to trip' }));
    await screen.findByText('TRIP PAGE');
  });

  it('FE-INVITE-006 a 409 shows the taken-credentials error and keeps the form', async () => {
    server.use(
      http.get('/api/guest-invites/:token', () => HttpResponse.json(PREFILL)),
      http.post('/api/guest-invites/:token/register', () =>
        HttpResponse.json({ error: 'Registration failed. Please try different credentials.' }, { status: 409 })),
    );
    mountAt();
    await screen.findByText(/Rigger Rae/);
    await userEvent.type(screen.getByLabelText('Username'), 'dup');
    await userEvent.type(screen.getByLabelText('Password'), 'Str0ng!Passw0rd');
    await userEvent.click(screen.getByRole('button', { name: /Create account/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That username or email is already in use');
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(adoptSession).not.toHaveBeenCalled();
  });

  it('FE-INVITE-007 skipping colleagues goes straight into the trip', async () => {
    server.use(
      http.get('/api/guest-invites/:token', () => HttpResponse.json(PREFILL)),
      http.post('/api/guest-invites/:token/register', () =>
        HttpResponse.json({ token: 'jwt', user: { id: 44, username: 'skipper' }, trip_id: 9 }, { status: 201 })),
    );
    mountAt();
    await screen.findByText(/Rigger Rae/);
    await userEvent.type(screen.getByLabelText('Username'), 'skipper');
    await userEvent.type(screen.getByLabelText('Password'), 'Str0ng!Passw0rd');
    await userEvent.type(screen.getByLabelText(/Company/), 'Solo AV');
    await userEvent.click(screen.getByRole('button', { name: /Create account/ }));

    expect(await screen.findByText('Invite your colleagues')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Skip for now' }));
    await screen.findByText('TRIP PAGE');
  });
});
