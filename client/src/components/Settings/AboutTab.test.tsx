import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '../../../tests/helpers/render';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../tests/helpers/msw/server';
import { resetAllStores } from '../../../tests/helpers/store';
import AboutTab from './AboutTab';

beforeEach(() => {
  resetAllStores();
  vi.clearAllMocks();
});

afterEach(() => {
  server.resetHandlers();
});

describe('AboutTab', () => {
  it('FE-COMP-ABOUT-001: renders without crashing', () => {
    render(<AboutTab appVersion="2.9.10" />);
    expect(document.body).toBeInTheDocument();
  });

  it('FE-COMP-ABOUT-002: displays the version badge', () => {
    render(<AboutTab appVersion="2.9.10" />);
    expect(screen.getByText('v2.9.10')).toBeInTheDocument();
  });

  it('FE-COMP-ABOUT-003: does not render any donation links', () => {
    render(<AboutTab appVersion="2.9.10" />);
    expect(screen.queryByText('Ko-fi')).toBeNull();
    expect(screen.queryByText('Buy Me a Coffee')).toBeNull();
    expect(document.querySelector('a[href*="ko-fi.com"]')).toBeNull();
    expect(document.querySelector('a[href*="buymeacoffee.com"]')).toBeNull();
  });

  it('FE-COMP-ABOUT-005: does not render community or upstream project links', () => {
    render(<AboutTab appVersion="2.9.10" />);
    expect(screen.queryByText('Discord')).toBeNull();
    expect(screen.queryByText('Wiki')).toBeNull();
    expect(document.querySelectorAll('a')).toHaveLength(0);
    expect(document.querySelector('a[href*="discord.gg"]')).toBeNull();
    expect(document.querySelector('a[href*="github.com"]')).toBeNull();
  });

  it('FE-COMP-ABOUT-006: displays the about description', () => {
    render(<AboutTab appVersion="2.9.10" />);
    expect(screen.getByText(/self-hosted production planner/i)).toBeInTheDocument();
  });

  it('FE-COMP-ABOUT-011: version prop change is reflected', () => {
    render(<AboutTab appVersion="1.0.0" />);
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    expect(screen.queryByText('v2.9.10')).toBeNull();
  });

  it('FE-COMP-ABOUT-012: "What\'s new" opens the release notes modal', async () => {
    server.use(
      http.get('/api/updates', () =>
        HttpResponse.json({
          releases: [
            { tag_name: 'v4.1.0', name: 'Faster lodging', body: '- Who paid leads the form', published_at: '2026-07-18T00:00:00Z' },
          ],
        }),
      ),
    );
    const user = userEvent.setup();
    render(<AboutTab appVersion="9.9.9" />);
    await user.click(screen.getByRole('button', { name: /What's new/ }));
    await screen.findByText('v4.1.0');
    expect(screen.getByText('Faster lodging')).toBeInTheDocument();
    expect(screen.getByText('Who paid leads the form')).toBeInTheDocument();
  });
});
