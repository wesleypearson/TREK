// FE-INVITE-CTRL-001 to FE-INVITE-CTRL-005 — crew-admin invite controls.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '../../../tests/helpers/render';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../tests/helpers/msw/server';
import type { GuestInviteFunnelEntry } from '../../api/client';
import { GuestInviteControls, BulkInviteButton, ConvertedInviteRows } from './GuestInviteControls';

vi.mock('../../analytics/posthog', () => ({
  captureEvent: vi.fn(),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('../shared/Toast', () => ({
  useToast: () => ({ success: toastSuccess, error: toastError }),
}));

function buildEntry(stage: NonNullable<GuestInviteFunnelEntry['invite']>['stage'], overrides: Partial<NonNullable<GuestInviteFunnelEntry['invite']>> = {}): GuestInviteFunnelEntry {
  return {
    guest_user_id: 5,
    guest_name: 'Deck Hand',
    contact_email: 'dh@example.com',
    invite: {
      id: 1,
      stage,
      created_at: '2026-07-01 10:00:00',
      sent_at: null,
      last_sent_at: null,
      send_count: 0,
      opened_at: null,
      registered_at: null,
      promoted_at: null,
      revoked_at: null,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      ...overrides,
    },
  };
}

const writeText = vi.fn();

beforeEach(() => {
  writeText.mockClear();
  Object.assign(navigator, { clipboard: { writeText } });
});

describe('GuestInviteControls', () => {
  it('FE-INVITE-CTRL-001 shows the stage chip and expiry for a live invite', () => {
    render(<GuestInviteControls tripId={1} guestUserId={5} hasEmail entry={buildEntry('sent', { send_count: 1 })} onChanged={() => {}} />);
    expect(screen.getByText('Invite sent')).toBeInTheDocument();
    expect(screen.getByText(/Expires/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resend/ })).toBeInTheDocument();
  });

  it('FE-INVITE-CTRL-002 generate copies the minted link and reports the change', async () => {
    server.use(http.post('/api/trips/:tripId/guest-invites/:guestUserId', () =>
      HttpResponse.json({ invite_id: 9, invite_path: '/invite/rawtok', expires_at: null, regenerated: false }, { status: 201 })));
    const onChanged = vi.fn();
    render(<GuestInviteControls tripId={1} guestUserId={5} hasEmail entry={undefined} onChanged={onChanged} />);
    await userEvent.click(screen.getByRole('button', { name: /Generate invite link/ }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/invite/rawtok`);
  });

  it('FE-INVITE-CTRL-003 the email button is disabled without a contact email', () => {
    render(<GuestInviteControls tripId={1} guestUserId={5} hasEmail={false} entry={undefined} onChanged={() => {}} />);
    const btn = screen.getByRole('button', { name: /Email invite/ });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', 'Add a contact email first');
  });

  it('FE-INVITE-CTRL-004 promoted entries render no action buttons', () => {
    render(<GuestInviteControls tripId={1} guestUserId={5} hasEmail entry={buildEntry('promoted')} onChanged={() => {}} />);
    expect(screen.getByText('Promoted')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('FE-INVITE-CTRL-005 bulk send surfaces the summary toast and refreshes', async () => {
    server.use(http.post('/api/trips/:tripId/guest-invites/send-all', () =>
      HttpResponse.json({ sent: 3, skipped_no_email: 1, skipped_cooldown: 1, skipped_capped: 0, failed: 0 })));
    const onDone = vi.fn();
    render(<BulkInviteButton tripId={1} onDone={onDone} />);
    await userEvent.click(screen.getByRole('button', { name: /Invite all guests/ }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(toastSuccess).toHaveBeenCalledWith('Sent 3, skipped 2');
  });

  it('FE-INVITE-CTRL-006 converted rows list promoted guests by their name snapshot', () => {
    const entries: GuestInviteFunnelEntry[] = [
      { guest_user_id: null, guest_name: 'Foley Fox', contact_email: null, registered_user_id: 42, invite: buildEntry('promoted').invite },
    ];
    render(<ConvertedInviteRows entries={entries} />);
    expect(screen.getByText('Foley Fox')).toBeInTheDocument();
    expect(screen.getByText('Promoted')).toBeInTheDocument();
  });
});
