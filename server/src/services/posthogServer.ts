/**
 * Server-side PostHog capture (custom): a minimal fire-and-forget POST to the
 * self-hosted PostHog ingest, used for backend-originated events (integrity
 * broadcasts etc.) that never pass through the client bundle. Production only —
 * dev and test runs must stay off the network.
 */

const POSTHOG_API_KEY = 'phc_stBiHVefs88jF6XWGe8ycxJCbbasQorKjhrCsGnBoWJt';
const POSTHOG_CAPTURE_URL = 'https://ph.artgrp.au/capture/';
const POSTHOG_TIMEOUT_MS = 3000;

/**
 * Fire-and-forget: never throws, never blocks the caller, no-op outside production.
 * distinctId defaults to the server identity; funnel events may pass a stable
 * per-subject id (e.g. 'invite:<id>' pre-registration, 'user:<id>' after) so
 * PostHog can stitch a journey without any PII in the id.
 */
export function capturePosthog(event: string, properties: Record<string, unknown> = {}, distinctId = 'travla-server'): void {
  if (process.env.NODE_ENV !== 'production') return;
  try {
    void fetch(POSTHOG_CAPTURE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_API_KEY,
        event,
        distinct_id: distinctId,
        properties,
      }),
      signal: AbortSignal.timeout(POSTHOG_TIMEOUT_MS),
    }).catch(() => {
      /* analytics must never surface as an app error */
    });
  } catch {
    /* fire-and-forget */
  }
}
