/**
 * Travla release history (custom): the fork ships from a private repo, so the
 * admin panel's "Latest updates" section reads this local changelog instead of
 * upstream TREK's GitHub releases (which describe someone else's app and made
 * the update check compare against foreign version numbers).
 *
 * Add an entry at the TOP for every deploy; keep the GitHub-release field
 * shape — the admin GitHubPanel renders these verbatim.
 */

export interface TravlaRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  created_at: string;
  prerelease: boolean;
  html_url: string;
}

const rel = (tag: string, name: string, date: string, body: string): TravlaRelease => ({
  tag_name: tag,
  name,
  body,
  published_at: `${date}T00:00:00Z`,
  created_at: `${date}T00:00:00Z`,
  prerelease: false,
  html_url: '',
});

export const TRAVLA_RELEASES: TravlaRelease[] = [
  rel('v4.1.0', 'Faster lodging, Travla release notes', '2026-07-18', [
    '- Who paid and Venue now lead the expense form — the two answers you know first',
    '- Supplier shown on every expense row, so the ledger answers "who did we pay"',
    '- This release history: the admin Updates section now tracks Travla itself',
    '- Design polish: poster total card on desktop, marquee modal titles, dark-mode-correct reds/greens, bigger split chips and delete buttons, smarter phone keyboards',
    '- Accessibility: proper dialog semantics on every modal, labelled buttons and inputs',
  ].join('\n')),
  rel('v4.0.0', 'Suppliers CRM, auto-venues, Tour ’95', '2026-07-18', [
    '- Suppliers: an instance-wide vendor book built automatically from receipt scans — contacts, AI notes, spend across every event',
    '- Scans match the merchant on Google Maps and drop the business onto the event map as a venue, linked to the expense',
    '- Version stamp in every footer with a tap-to-refresh chip when a phone runs a stale cached build',
    "- Tour '95 design language: Archivo Black marquee titles, hard offset shadows, hot-magenta accent, gig-poster public pages",
  ].join('\n')),
  rel('v3.9.0', 'Crew & guest admin', '2026-07-17', [
    '- Full crew management per event: sectioned crew and guest admin with added-by details and proper confirm dialogs',
    '- Promote a guest onto their real account — splits, payments, settlements and tab links all move across',
    '- Fixed: deleting a guest who had paid for an expense crashed; guest management now follows the permission settings',
    '- Fixed: public share links no longer drift sideways on iPhone',
  ].join('\n')),
  rel('v3.8.0', 'Events, venues & the language shift', '2026-07-17', [
    '- The platform now speaks live events: Events, Crew, Venues, Tours across the whole app',
    '- Pin expenses to venues, see spend per venue, add a pre-pinned expense straight from a venue card',
    '- In-app Expenses guide plus (i) explainers on every expense feature, in all 22 languages',
    '- Bigger touch targets across the expense screens',
  ].join('\n')),
  rel('v3.7.0', 'Tabs, scanning & settling', '2026-07-16', [
    '- Public tabs: share a live running balance with anyone — no account needed, payment details included',
    '- Link tabs to crew members or temp guests; recording a payment writes real settlements',
    '- Receipt scanning opens the full iOS sheet (camera, library, Files/Notes scans), long dockets in up to six photos, real quantity per line',
    '- Personal (only-me) expenses, reset-expenses tool, add off-platform people to any bill',
  ].join('\n')),
  rel('v3.5.0', 'Mobile expense entry', '2026-07-10', [
    '- Fixed itemized expense entry on phones: totals and line prices type cleanly',
    '- Expense UX overhaul: clearer split editor and amounts',
  ].join('\n')),
  rel('v3.4.0', 'Travla launch', '2026-07-05', [
    '- Travla goes live at trav.artgrp.au on TREK v3.3.0',
    '- Private files with group sharing, venue visibility controls, full rebrand',
  ].join('\n')),
];

/** The newest local version — what the admin update check compares against. */
export const LATEST_TRAVLA_VERSION = TRAVLA_RELEASES[0].tag_name.replace(/^v/, '');
