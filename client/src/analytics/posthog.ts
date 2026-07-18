import posthog from 'posthog-js'

/**
 * Thin wrapper around posthog-js for the crew's self-hosted PostHog instance.
 *
 * Rules:
 * - Init only in production builds (import.meta.env.PROD) and only when the
 *   user has not opted out (localStorage 'travla_analytics_optout').
 * - Autocapture + pageviews come from the '2026-05-30' defaults preset.
 * - Every entry point is wrapped in try/catch — analytics must never throw
 *   into app code.
 */

const OPTOUT_KEY = 'travla_analytics_optout'

const POSTHOG_KEY = 'phc_stBiHVefs88jF6XWGe8ycxJCbbasQorKjhrCsGnBoWJt'
const POSTHOG_HOST = 'https://ph.artgrp.au'

/** True once posthog.init() has actually run this session. */
let initialized = false

/** Live capture state: initialized and not opted out. */
export let analyticsEnabled = false

/** Whether the user has persisted an opt-out (drives the settings toggle). */
export function isAnalyticsOptedOut(): boolean {
  try {
    return localStorage.getItem(OPTOUT_KEY) === 'true'
  } catch {
    return false
  }
}

export function initAnalytics(): void {
  try {
    if (initialized) return
    if (!import.meta.env.PROD) return
    if (isAnalyticsOptedOut()) return
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      defaults: '2026-05-30',
      person_profiles: 'identified_only',
      respect_dnt: true,
    })
    initialized = true
    analyticsEnabled = true
  } catch {
    analyticsEnabled = false
  }
}

export function identifyUser(id: string | number, username: string): void {
  if (!analyticsEnabled) return
  try {
    posthog.identify(String(id), { username })
  } catch {
    /* never throw */
  }
}

export function resetAnalytics(): void {
  if (!initialized) return
  try {
    posthog.reset()
  } catch {
    /* never throw */
  }
}

export function captureEvent(name: string, props?: Record<string, unknown>): void {
  if (!analyticsEnabled) return
  try {
    posthog.capture(name, props)
  } catch {
    /* never throw */
  }
}

/** Persist the opt-out flag and flip live capture accordingly. */
export function setAnalyticsOptOut(v: boolean): void {
  try {
    if (v) localStorage.setItem(OPTOUT_KEY, 'true')
    else localStorage.removeItem(OPTOUT_KEY)
  } catch {
    /* localStorage unavailable — still flip runtime state below */
  }
  try {
    if (v) {
      if (initialized) posthog.opt_out_capturing()
      analyticsEnabled = false
    } else {
      // May have skipped init at startup because of a stored opt-out.
      if (!initialized) initAnalytics()
      if (initialized) {
        posthog.opt_in_capturing()
        analyticsEnabled = true
      }
    }
  } catch {
    /* never throw */
  }
}
