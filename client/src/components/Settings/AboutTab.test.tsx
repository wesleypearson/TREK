import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '../../../tests/helpers/render';
import { resetAllStores } from '../../../tests/helpers/store';
import AboutTab from './AboutTab';

beforeEach(() => {
  resetAllStores();
  vi.clearAllMocks();
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
    expect(screen.getByText(/self-hosted travel planner/i)).toBeInTheDocument();
  });

  it('FE-COMP-ABOUT-011: version prop change is reflected', () => {
    render(<AboutTab appVersion="1.0.0" />);
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    expect(screen.queryByText('v2.9.10')).toBeNull();
  });
});
