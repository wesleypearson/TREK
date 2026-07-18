import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../i18n'
import { captureEvent } from '../../analytics/posthog'

/**
 * Capture page logic — the honest foreground PWA equivalent of CrowdSense:
 * consent-first sensor recording that only runs while the app is open.
 *
 * Every sensor is OFF by default; nothing samples until the user switches a
 * sensor on and starts a session. Samples buffer in the hook and flush every
 * 10 s to the crew's own PostHog instance via the app-wide analytics wrapper
 * (captureEvent — itself guarded so analytics can never throw into app code).
 */

export type SensorId = 'location' | 'motion' | 'battery' | 'network' | 'visibility'

export const SENSOR_IDS: readonly SensorId[] = ['location', 'motion', 'battery', 'network', 'visibility'] as const

export type SensorStatus = 'idle' | 'active' | 'denied' | 'unsupported'

export interface CaptureSummary {
  sessionId: string
  durationS: number
  counts: Record<SensorId, number>
}

interface Sample {
  sensor: SensorId
  data: Record<string, unknown>
}

/** ≥5 s between recorded location samples (the watch may fire far more often). */
const LOCATION_MIN_INTERVAL_MS = 5000
/** Motion aggregates to 1 Hz — peak accel magnitude per second, never raw 60 Hz. */
const MOTION_AGGREGATE_MS = 1000
/** Battery/network re-sample on this slow poll on top of their change events. */
const SLOW_POLL_MS = 60_000
/** Buffered samples flush to PostHog on this cadence. */
const FLUSH_INTERVAL_MS = 10_000

const ZERO_COUNTS: Record<SensorId, number> = { location: 0, motion: 0, battery: 0, network: 0, visibility: 0 }
const IDLE_STATUSES: Record<SensorId, SensorStatus> = {
  location: 'idle', motion: 'idle', battery: 'idle', network: 'idle', visibility: 'idle',
}

// Browser APIs that TS's DOM lib doesn't (fully) type.
interface BatteryLike {
  level: number
  charging: boolean
  addEventListener: (type: string, listener: () => void) => void
  removeEventListener: (type: string, listener: () => void) => void
}
interface ConnectionLike {
  effectiveType?: string
  downlink?: number
  rtt?: number
  saveData?: boolean
  addEventListener?: (type: string, listener: () => void) => void
  removeEventListener?: (type: string, listener: () => void) => void
}
type MotionEventCtor = typeof DeviceMotionEvent & { requestPermission?: () => Promise<string> }

export function useCapture() {
  const { t, locale } = useTranslation()

  // ── Consent toggles (all OFF by default — CrowdSense-style) ─────────────
  const [toggles, setToggles] = useState<Record<SensorId, boolean>>({
    location: false, motion: false, battery: false, network: false, visibility: false,
  })
  const [statuses, setStatuses] = useState<Record<SensorId, SensorStatus>>(IDLE_STATUSES)

  // ── Session state ───────────────────────────────────────────────────────
  const [running, setRunning] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [counts, setCounts] = useState<Record<SensorId, number>>(ZERO_COUNTS)
  const [lastFix, setLastFix] = useState<{ lat: number; lng: number } | null>(null)
  const [summary, setSummary] = useState<CaptureSummary | null>(null)

  // Refs mirror the live session so listeners/timers never read stale state.
  const sessionIdRef = useRef<string | null>(null)
  const startedAtRef = useRef(0)
  const countsRef = useRef<Record<SensorId, number>>({ ...ZERO_COUNTS })
  const bufferRef = useRef<Sample[]>([])
  const cleanupsRef = useRef<Array<() => void>>([])
  const lastLocationTsRef = useRef(0)
  const motionPeakRef = useRef(0)

  const record = useCallback((sensor: SensorId, data: Record<string, unknown>) => {
    bufferRef.current.push({ sensor, data })
    countsRef.current = { ...countsRef.current, [sensor]: countsRef.current[sensor] + 1 }
    setCounts(countsRef.current)
  }, [])

  /** Drain the buffer into PostHog — one capture_sample event per sample. */
  const flush = useCallback(() => {
    const sid = sessionIdRef.current
    if (!sid || bufferRef.current.length === 0) return
    const pending = bufferRef.current
    bufferRef.current = []
    for (const s of pending) {
      captureEvent('capture_sample', { capture_session: sid, sensor: s.sensor, ...s.data })
    }
  }, [])

  const teardown = useCallback(() => {
    for (const fn of cleanupsRef.current) {
      try { fn() } catch { /* listener already gone */ }
    }
    cleanupsRef.current = []
  }, [])

  const toggleSensor = useCallback((sensor: SensorId) => {
    // Consent set is fixed for the life of a session — stop to change it.
    setToggles(prev => (running ? prev : { ...prev, [sensor]: !prev[sensor] }))
  }, [running])

  const anySensorOn = SENSOR_IDS.some(s => toggles[s])

  // ── Start (must run inside the user gesture for iOS motion permission) ──
  const handleStart = useCallback(async () => {
    if (running || !anySensorOn) return

    const sid = crypto.randomUUID()
    sessionIdRef.current = sid
    startedAtRef.current = Date.now()
    countsRef.current = { ...ZERO_COUNTS }
    bufferRef.current = []
    lastLocationTsRef.current = 0
    motionPeakRef.current = 0
    setSessionId(sid)
    setCounts({ ...ZERO_COUNTS })
    setElapsed(0)
    setLastFix(null)
    setSummary(null)
    setRunning(true)

    const cleanups: Array<() => void> = []
    const nextStatuses: Record<SensorId, SensorStatus> = { ...IDLE_STATUSES }

    // Location trail — high-accuracy watch, throttled to ≥5 s between samples.
    if (toggles.location) {
      const geo = navigator.geolocation
      if (geo && typeof geo.watchPosition === 'function') {
        const watchId = geo.watchPosition(
          pos => {
            const now = Date.now()
            if (now - lastLocationTsRef.current < LOCATION_MIN_INTERVAL_MS) return
            lastLocationTsRef.current = now
            const c = pos.coords
            setLastFix({ lat: c.latitude, lng: c.longitude })
            record('location', {
              lat: c.latitude,
              lng: c.longitude,
              accuracy: c.accuracy,
              altitude: c.altitude,
              speed: c.speed,
              heading: c.heading,
            })
          },
          err => {
            if (err.code === err.PERMISSION_DENIED) {
              setStatuses(prev => ({ ...prev, location: 'denied' }))
            }
          },
          { enableHighAccuracy: true, maximumAge: 0 },
        )
        cleanups.push(() => geo.clearWatch(watchId))
        nextStatuses.location = 'active'
      } else {
        nextStatuses.location = 'unsupported'
      }
    }

    // Motion — 1 Hz aggregate: peak accel magnitude per second, not raw 60 Hz.
    if (toggles.motion) {
      const MotionEvent = (window as { DeviceMotionEvent?: MotionEventCtor }).DeviceMotionEvent
      if (!MotionEvent) {
        nextStatuses.motion = 'unsupported'
      } else {
        let granted = true
        // iOS requires an explicit permission request inside the user gesture.
        if (typeof MotionEvent.requestPermission === 'function') {
          try {
            granted = (await MotionEvent.requestPermission()) === 'granted'
          } catch {
            granted = false
          }
        }
        if (!granted) {
          nextStatuses.motion = 'denied'
        } else {
          const onMotion = (e: DeviceMotionEvent) => {
            const a = e.acceleration ?? e.accelerationIncludingGravity
            if (!a) return
            const mag = Math.sqrt((a.x ?? 0) ** 2 + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2)
            if (mag > motionPeakRef.current) motionPeakRef.current = mag
          }
          window.addEventListener('devicemotion', onMotion)
          const tick = window.setInterval(() => {
            record('motion', { peak_accel: Math.round(motionPeakRef.current * 1000) / 1000 })
            motionPeakRef.current = 0
          }, MOTION_AGGREGATE_MS)
          cleanups.push(() => {
            window.removeEventListener('devicemotion', onMotion)
            window.clearInterval(tick)
          })
          nextStatuses.motion = 'active'
        }
      }
    }

    // Battery — on change + every 60 s (where the Battery API exists).
    if (toggles.battery) {
      const getBattery = (navigator as Navigator & { getBattery?: () => Promise<BatteryLike> }).getBattery
      if (typeof getBattery !== 'function') {
        nextStatuses.battery = 'unsupported'
      } else {
        try {
          const battery = await getBattery.call(navigator)
          const sample = () => record('battery', { level: battery.level, charging: battery.charging })
          sample()
          battery.addEventListener('levelchange', sample)
          battery.addEventListener('chargingchange', sample)
          const tick = window.setInterval(sample, SLOW_POLL_MS)
          cleanups.push(() => {
            battery.removeEventListener('levelchange', sample)
            battery.removeEventListener('chargingchange', sample)
            window.clearInterval(tick)
          })
          nextStatuses.battery = 'active'
        } catch {
          nextStatuses.battery = 'unsupported'
        }
      }
    }

    // Network — on change + every 60 s (where the Network Information API exists).
    if (toggles.network) {
      const conn = (navigator as Navigator & { connection?: ConnectionLike }).connection
      if (!conn) {
        nextStatuses.network = 'unsupported'
      } else {
        const sample = () => record('network', {
          effective_type: conn.effectiveType ?? null,
          downlink: conn.downlink ?? null,
          rtt: conn.rtt ?? null,
          save_data: conn.saveData ?? null,
          online: navigator.onLine,
        })
        sample()
        conn.addEventListener?.('change', sample)
        const tick = window.setInterval(sample, SLOW_POLL_MS)
        cleanups.push(() => {
          conn.removeEventListener?.('change', sample)
          window.clearInterval(tick)
        })
        nextStatuses.network = 'active'
      }
    }

    // Screen visibility — the honest record of when foreground capture pauses.
    if (toggles.visibility) {
      const onVisibility = () => record('visibility', { state: document.visibilityState })
      onVisibility()
      document.addEventListener('visibilitychange', onVisibility)
      cleanups.push(() => document.removeEventListener('visibilitychange', onVisibility))
      nextStatuses.visibility = 'active'
    }

    // Session-wide timers: elapsed tick + 10 s flush.
    const elapsedTick = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000))
    }, 1000)
    const flushTick = window.setInterval(flush, FLUSH_INTERVAL_MS)
    cleanups.push(() => {
      window.clearInterval(elapsedTick)
      window.clearInterval(flushTick)
    })

    cleanupsRef.current = cleanups
    setStatuses(nextStatuses)
  }, [running, anySensorOn, toggles, record, flush])

  // ── Stop: tear down, flush the tail, emit the session summary ───────────
  const handleStop = useCallback(() => {
    const sid = sessionIdRef.current
    if (!sid) return
    teardown()
    flush()
    const durationS = Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000))
    const finalCounts = { ...countsRef.current }
    captureEvent('capture_session_summary', { capture_session: sid, duration_s: durationS, counts: finalCounts })
    setSummary({ sessionId: sid, durationS, counts: finalCounts })
    sessionIdRef.current = null
    setSessionId(null)
    setRunning(false)
    setStatuses(IDLE_STATUSES)
  }, [teardown, flush])

  // Leaving the page mid-session: stop sampling and flush what's buffered.
  useEffect(() => () => {
    teardown()
    flush()
    sessionIdRef.current = null
  }, [teardown, flush])

  return {
    t, locale,
    // consent toggles
    toggles, toggleSensor, statuses, anySensorOn,
    // session
    running, sessionId, elapsed, counts, lastFix, summary,
    handleStart, handleStop,
  }
}
