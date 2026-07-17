import type { TranslationStrings } from '../types';

const system_notice: TranslationStrings = {
  'system_notice.v3_photos.title': 'Photos have moved in 3.0',
  'system_notice.v3_photos.body':
    '**Photos** in the Event Planner have been removed. Your photos are safe — Travla never modified your Immich or Synology library.\n\nPhotos now live in the **Tour** addon. Tour is optional — if it is not yet available, ask your admin to enable it under Admin → Addons.',
  'system_notice.v3_journey.title': 'Meet Tour — the tour journal',
  'system_notice.v3_journey.body':
    'Document your events as rich tour stories with timelines, photo galleries, and interactive maps.',
  'system_notice.v3_journey.cta_label': 'Open Tour',
  'system_notice.v3_journey.highlight_timeline': 'Day-by-day timeline & gallery',
  'system_notice.v3_journey.highlight_photos': 'Import from Immich or Synology',
  'system_notice.v3_journey.highlight_share': 'Share publicly — no login needed',
  'system_notice.v3_journey.highlight_export': 'Export as a PDF photo book',
  'system_notice.v3_features.title': 'More highlights in 3.0',
  'system_notice.v3_features.body': 'A few more things worth knowing about this release.',
  'system_notice.v3_features.highlight_dashboard': 'Mobile-first dashboard redesign',
  'system_notice.v3_features.highlight_offline': 'Full offline mode as a PWA',
  'system_notice.v3_features.highlight_search': 'Real-time venue search autocomplete',
  'system_notice.v3_features.highlight_import': 'Import venues from KMZ/KML files',
  'system_notice.v3_mcp.title': 'MCP: OAuth 2.1 upgrade',
  'system_notice.v3_mcp.body':
    'The MCP integration has been fully overhauled. OAuth 2.1 is now the recommended auth method. Legacy static tokens (trek_…) are deprecated and will be removed in a future release.',
  'system_notice.v3_mcp.highlight_oauth': 'OAuth 2.1 recommended (mcp-remote)',
  'system_notice.v3_mcp.highlight_scopes': '24 fine-grained permission scopes',
  'system_notice.v3_mcp.highlight_deprecated': 'Static trek_ tokens deprecated',
  'system_notice.v3_mcp.highlight_tools': 'Expanded toolset & prompts',
  'system_notice.v3014_whitespace_collision.title': 'Action required: user account conflict',
  'system_notice.v3014_whitespace_collision.body':
    'The 3.0.14 upgrade detected one or more username or email collisions caused by leading/trailing whitespace in stored accounts. Affected accounts were renamed automatically. Check the server logs for lines starting with **[migration] WHITESPACE COLLISION** to identify which accounts need review.',
  'system_notice.welcome_v1.title': 'Welcome to Travla',
  'system_notice.welcome_v1.body':
    'Your all-in-one live event & production planner. Build schedules, share events with your crew, and stay organized — online or offline.',
  'system_notice.welcome_v1.cta_label': 'Plan an event',
  'system_notice.welcome_v1.hero_alt': 'A live event venue with Travla planning UI overlay',
  'system_notice.welcome_v1.highlight_plan': 'Day-by-day schedules for any event',
  'system_notice.welcome_v1.highlight_share': 'Collaborate with your whole crew',
  'system_notice.welcome_v1.highlight_offline': 'Works offline on mobile',
  'system_notice.dev_test_modal.title': '[Dev] Test notice',
  'system_notice.dev_test_modal.body': 'This is a dev-only test notice.',
  'system_notice.pager.prev': 'Previous notice',
  'system_notice.pager.next': 'Next notice',
  'system_notice.pager.counter': '{current} / {total}',
  'system_notice.pager.goto': 'Go to notice {n}',
  'system_notice.pager.position': 'Notice {current} of {total}',
};
export default system_notice;
