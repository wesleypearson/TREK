import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../../tests/helpers/render';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../tests/helpers/msw/server';
import { resetAllStores } from '../../../tests/helpers/store';
import WhatsNewModal from './WhatsNewModal';
import AppFooter from './AppFooter';

const RELEASES = [
  {
    tag_name: 'v4.1.0',
    name: 'Faster lodging',
    body: 'Intro line before the bullets\n- Who paid leads the form\n- Supplier on every row',
    published_at: '2026-07-18T00:00:00Z',
  },
  {
    tag_name: 'v4.0.0',
    name: 'Suppliers CRM',
    body: '- Vendor book built from scans',
    published_at: '2026-07-01T00:00:00Z',
  },
];

beforeEach(() => {
  resetAllStores();
  server.use(http.get('/api/updates', () => HttpResponse.json({ releases: RELEASES })));
});

afterEach(() => {
  server.resetHandlers();
});

describe('WhatsNewModal', () => {
  it('renders the title and each release as a card (tag + name + date)', async () => {
    render(<WhatsNewModal isOpen onClose={() => {}} />);
    expect(screen.getByText("What's new")).toBeInTheDocument();
    await screen.findByText('v4.1.0');
    expect(screen.getByText('Faster lodging')).toBeInTheDocument();
    expect(screen.getByText('v4.0.0')).toBeInTheDocument();
    expect(screen.getByText('Suppliers CRM')).toBeInTheDocument();
    // The version tags wear the tour-sticker poster style
    expect(screen.getByText('v4.1.0').className).toContain('tour-sticker');
    // A date is shown for each release
    const dates = document.body.textContent!;
    expect(dates).toMatch(/2026/);
  });

  it('renders "- " body lines as list items and plain lines as paragraphs', async () => {
    render(<WhatsNewModal isOpen onClose={() => {}} />);
    const bullet = await screen.findByText('Who paid leads the form');
    expect(bullet.closest('li')).toBeInTheDocument();
    expect(screen.getByText('Supplier on every row').closest('li')).toBeInTheDocument();
    const intro = screen.getByText('Intro line before the bullets');
    expect(intro.closest('li')).toBeNull();
    expect(intro.tagName.toLowerCase()).toBe('p');
  });

  it('renders releases newest first', async () => {
    render(<WhatsNewModal isOpen onClose={() => {}} />);
    await screen.findByText('v4.1.0');
    const text = document.body.textContent!;
    expect(text.indexOf('v4.1.0')).toBeLessThan(text.indexOf('v4.0.0'));
  });

  it('shows an error message when the endpoint fails', async () => {
    server.use(http.get('/api/updates', () => HttpResponse.json({ error: 'boom' }, { status: 500 })));
    render(<WhatsNewModal isOpen onClose={() => {}} />);
    await screen.findByText(/release notes/i);
  });

  it('renders nothing when closed', () => {
    render(<WhatsNewModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByText("What's new")).toBeNull();
  });
});

describe('AppFooter → WhatsNewModal entry point', () => {
  it('tapping the version stamp opens the release notes modal', async () => {
    const user = userEvent.setup();
    render(<AppFooter />);
    const versionButton = screen.getByRole('button', { name: /Travla v/ });
    await user.click(versionButton);
    await screen.findByText('v4.1.0');
    expect(screen.getByText("What's new")).toBeInTheDocument();
    expect(screen.getByText('Faster lodging')).toBeInTheDocument();
  });

  it('public footer keeps a plain version stamp (no button, no modal)', () => {
    render(<AppFooter public />);
    expect(screen.queryByRole('button', { name: /Travla v/ })).toBeNull();
    expect(screen.getByText(/Travla v/)).toBeInTheDocument();
  });

  it('closing the modal returns to the plain footer', async () => {
    const user = userEvent.setup();
    render(<AppFooter />);
    await user.click(screen.getByRole('button', { name: /Travla v/ }));
    await screen.findByText('v4.1.0');
    await user.click(screen.getByLabelText('Close'));
    await waitFor(() => expect(screen.queryByText('v4.1.0')).toBeNull());
  });
});
