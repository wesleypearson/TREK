// Unit tests for the PostHog analytics wrapper. posthog-js is mocked globally
// in tests/setup.ts — these tests only exercise our gating/opt-out logic.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import posthog from 'posthog-js'

const OPTOUT_KEY = 'travla_analytics_optout'

// The module keeps state (initialized/analyticsEnabled), so import it fresh
// per test.
async function loadAnalytics() {
  return await import('./posthog')
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('analytics/posthog', () => {
  it('does not init outside production builds', async () => {
    const analytics = await loadAnalytics()
    analytics.initAnalytics()
    expect(posthog.init).not.toHaveBeenCalled()
    expect(analytics.analyticsEnabled).toBe(false)
  })

  it('inits in production with the crew config', async () => {
    vi.stubEnv('PROD', true)
    const analytics = await loadAnalytics()
    analytics.initAnalytics()
    expect(posthog.init).toHaveBeenCalledTimes(1)
    expect(posthog.init).toHaveBeenCalledWith(
      'phc_stBiHVefs88jF6XWGe8ycxJCbbasQorKjhrCsGnBoWJt',
      expect.objectContaining({
        api_host: 'https://ph.artgrp.au',
        defaults: '2026-05-30',
        person_profiles: 'identified_only',
        respect_dnt: true,
      }),
    )
    expect(analytics.analyticsEnabled).toBe(true)
  })

  it('skips init in production when the opt-out flag is set', async () => {
    vi.stubEnv('PROD', true)
    localStorage.setItem(OPTOUT_KEY, 'true')
    const analytics = await loadAnalytics()
    analytics.initAnalytics()
    expect(posthog.init).not.toHaveBeenCalled()
    expect(analytics.analyticsEnabled).toBe(false)
  })

  it('setAnalyticsOptOut(true) persists the flag, opts out and stops capture', async () => {
    vi.stubEnv('PROD', true)
    const analytics = await loadAnalytics()
    analytics.initAnalytics()
    analytics.setAnalyticsOptOut(true)
    expect(localStorage.getItem(OPTOUT_KEY)).toBe('true')
    expect(posthog.opt_out_capturing).toHaveBeenCalledTimes(1)
    analytics.captureEvent('supplier_created')
    expect(posthog.capture).not.toHaveBeenCalled()
  })

  it('setAnalyticsOptOut(false) clears the flag and lazily inits + opts back in', async () => {
    vi.stubEnv('PROD', true)
    localStorage.setItem(OPTOUT_KEY, 'true')
    const analytics = await loadAnalytics()
    analytics.initAnalytics() // skipped: opted out at startup
    expect(posthog.init).not.toHaveBeenCalled()

    analytics.setAnalyticsOptOut(false)
    expect(localStorage.getItem(OPTOUT_KEY)).toBeNull()
    expect(posthog.init).toHaveBeenCalledTimes(1)
    expect(posthog.opt_in_capturing).toHaveBeenCalledTimes(1)
    analytics.captureEvent('supplier_created', { via: 'test' })
    expect(posthog.capture).toHaveBeenCalledWith('supplier_created', { via: 'test' })
  })

  it('opting back in outside production stays disabled (no init, no opt-in)', async () => {
    localStorage.setItem(OPTOUT_KEY, 'true')
    const analytics = await loadAnalytics()
    analytics.setAnalyticsOptOut(false)
    expect(localStorage.getItem(OPTOUT_KEY)).toBeNull()
    expect(posthog.init).not.toHaveBeenCalled()
    expect(posthog.opt_in_capturing).not.toHaveBeenCalled()
    expect(analytics.analyticsEnabled).toBe(false)
  })

  it('identifyUser/resetAnalytics/captureEvent forward when enabled', async () => {
    vi.stubEnv('PROD', true)
    const analytics = await loadAnalytics()
    analytics.initAnalytics()
    analytics.identifyUser(42, 'wesley')
    expect(posthog.identify).toHaveBeenCalledWith('42', { username: 'wesley' })
    analytics.captureEvent('supplier_created')
    expect(posthog.capture).toHaveBeenCalledWith('supplier_created', undefined)
    analytics.resetAnalytics()
    expect(posthog.reset).toHaveBeenCalledTimes(1)
  })

  it('identifyUser/resetAnalytics/captureEvent are no-ops when disabled', async () => {
    const analytics = await loadAnalytics()
    analytics.identifyUser(42, 'wesley')
    analytics.captureEvent('supplier_created')
    analytics.resetAnalytics()
    expect(posthog.identify).not.toHaveBeenCalled()
    expect(posthog.capture).not.toHaveBeenCalled()
    expect(posthog.reset).not.toHaveBeenCalled()
  })

  it('never throws even when posthog itself throws', async () => {
    vi.stubEnv('PROD', true)
    vi.mocked(posthog.init).mockImplementation(() => { throw new Error('boom') })
    vi.mocked(posthog.capture).mockImplementation(() => { throw new Error('boom') })
    const analytics = await loadAnalytics()
    expect(() => analytics.initAnalytics()).not.toThrow()
    expect(analytics.analyticsEnabled).toBe(false)
    expect(() => analytics.captureEvent('x')).not.toThrow()
    expect(() => analytics.setAnalyticsOptOut(true)).not.toThrow()
    expect(() => analytics.setAnalyticsOptOut(false)).not.toThrow()
  })
})
