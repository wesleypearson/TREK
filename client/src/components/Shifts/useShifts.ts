import { useCallback, useEffect, useMemo, useState } from 'react'
import { shiftsApi, type Shift } from '../../api/client'
import { addListener, removeListener, addReconnectListener, removeReconnectListener } from '../../api/websocket'
import { useAuthStore } from '../../store/authStore'
import { useTranslation } from '../../i18n'
import { useToast } from '../shared/Toast'
import { captureEvent } from '../../analytics/posthog'

/**
 * Shifts panel logic — the rostering timeclock. Loads the trip's shift list,
 * keeps it live over WebSocket (shift:started/stopped/deleted), runs the 1 s
 * tick that drives every elapsed readout, and owns the sign-on/sign-off flow
 * with its one-shot geolocation capture (location is OPTIONAL — a denied or
 * unavailable fix proceeds with a note, Capture-tool style).
 */

/** 'YYYY-MM-DD HH:MM:SS' (SQLite CURRENT_TIMESTAMP, UTC) → epoch millis. */
export function parseShiftDate(value: string): number {
  const iso = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`
  const ms = Date.parse(iso)
  return Number.isNaN(ms) ? Date.parse(value) : ms
}

/** Worked seconds of a shift; open shifts count up to `now`. */
export function shiftSeconds(shift: Pick<Shift, 'started_at' | 'ended_at'>, now: number): number {
  const start = parseShiftDate(shift.started_at)
  const end = shift.ended_at ? parseShiftDate(shift.ended_at) : now
  return Math.max(0, Math.floor((end - start) / 1000))
}

/** One-shot geolocation fix; resolves null on denial/unsupported/timeout. */
function getOneShotPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise(resolve => {
    const geo = typeof navigator !== 'undefined' ? navigator.geolocation : undefined
    if (!geo || typeof geo.getCurrentPosition !== 'function') { resolve(null); return }
    let settled = false
    const done = (v: { lat: number; lng: number } | null) => { if (!settled) { settled = true; resolve(v) } }
    const timer = window.setTimeout(() => done(null), 8000)
    try {
      geo.getCurrentPosition(
        pos => { window.clearTimeout(timer); done({ lat: pos.coords.latitude, lng: pos.coords.longitude }) },
        () => { window.clearTimeout(timer); done(null) },
        { enableHighAccuracy: true, maximumAge: 60_000, timeout: 8000 },
      )
    } catch { window.clearTimeout(timer); done(null) }
  })
}

export interface ShiftTotalLive {
  user_id: number
  username: string
  avatar?: string | null
  total_seconds: number
  open: boolean
}

export function useShifts(tripId: number) {
  const { t, locale } = useTranslation()
  const toast = useToast()
  const me = useAuthStore(s => s.user?.id)

  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [locationDenied, setLocationDenied] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const upsert = useCallback((shift: Shift) => {
    setShifts(prev => {
      const rest = prev.filter(s => s.id !== shift.id)
      return [shift, ...rest].sort((a, b) => parseShiftDate(b.started_at) - parseShiftDate(a.started_at) || b.id - a.id)
    })
  }, [])

  /** Silent re-sync with the canonical list (no spinner) — used whenever local
   *  state may have drifted: WS reconnect, or a 409 sign-on from another tab. */
  const reload = useCallback(() => {
    shiftsApi.list(tripId)
      .then(d => setShifts(d.shifts || []))
      .catch(() => { /* keep current state; the next trigger retries */ })
  }, [tripId])

  /* ── load ── */
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    shiftsApi.list(tripId)
      .then(d => { if (!cancelled) { setShifts(d.shifts || []); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [tripId])

  /* ── live updates (same subscribe pattern as the collab chat) ── */
  useEffect(() => {
    const handler = (event: { type?: string; tripId?: number | string; shift?: Shift; shiftId?: number }) => {
      if (String(event.tripId) !== String(tripId)) return
      if ((event.type === 'shift:started' || event.type === 'shift:stopped') && event.shift) upsert(event.shift)
      if (event.type === 'shift:deleted' && event.shiftId != null) setShifts(prev => prev.filter(s => s.id !== event.shiftId))
    }
    addListener(handler)
    return () => removeListener(handler)
  }, [tripId, upsert])

  /* ── reconnect recovery: shift events dropped while the socket was down are
        gone (the store refetch only re-hydrates trip data) — re-pull the list ── */
  useEffect(() => {
    addReconnectListener(reload)
    return () => removeReconnectListener(reload)
  }, [reload])

  /* ── 1 s tick while anyone is on shift ── */
  const anyOpen = shifts.some(s => !s.ended_at)
  useEffect(() => {
    if (!anyOpen) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [anyOpen])

  /* ── derived state ── */
  const myShift = useMemo(() => shifts.find(s => !s.ended_at && s.user_id === me) || null, [shifts, me])
  const onShiftNow = useMemo(() => shifts.filter(s => !s.ended_at), [shifts])
  const myElapsed = myShift ? shiftSeconds(myShift, now) : 0

  /** History (finished shifts) grouped by local day, newest day first. */
  const historyDays = useMemo(() => {
    const groups: { day: string; shifts: Shift[] }[] = []
    for (const s of shifts) {
      if (!s.ended_at) continue
      const day = new Date(parseShiftDate(s.started_at)).toLocaleDateString(locale || undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
      const last = groups[groups.length - 1]
      if (last && last.day === day) last.shifts.push(s)
      else groups.push({ day, shifts: [s] })
    }
    return groups
  }, [shifts, locale])

  /** Hours per member — computed from the shift list so open shifts tick live. */
  const totals = useMemo<ShiftTotalLive[]>(() => {
    const byUser = new Map<number, ShiftTotalLive>()
    for (const s of shifts) {
      const entry = byUser.get(s.user_id) || { user_id: s.user_id, username: s.username, avatar: s.avatar, total_seconds: 0, open: false }
      entry.total_seconds += shiftSeconds(s, now)
      if (!s.ended_at) entry.open = true
      byUser.set(s.user_id, entry)
    }
    return [...byUser.values()].sort((a, b) => b.total_seconds - a.total_seconds)
  }, [shifts, now])

  /* ── actions ── */
  const signOn = useCallback(async () => {
    if (busy || myShift) return
    setBusy(true)
    try {
      const pos = await getOneShotPosition()
      setLocationDenied(!pos)
      const data = await shiftsApi.start(tripId, pos
        ? { lat: pos.lat, lng: pos.lng }
        : { note: t('shifts.locationDenied') })
      if (data?.shift) upsert(data.shift)
      setNow(Date.now())
      captureEvent('shift_started', { trip_id: tripId, has_location: !!pos })
    } catch (err) {
      const resp = (err as { response?: { status?: number; data?: { error?: string } } })?.response
      if (resp?.status === 409) {
        // Already on shift server-side (second device, or this tab missed the
        // WS event) — re-pull so the open shift becomes visible here too.
        toast.info(t('shifts.alreadyOn'))
        reload()
      } else {
        toast.error(resp?.data?.error || (err instanceof Error ? err.message : t('common.unknownError')))
      }
    } finally { setBusy(false) }
  }, [busy, myShift, tripId, t, toast, upsert, reload])

  const signOff = useCallback(async () => {
    if (busy || !myShift) return
    setBusy(true)
    try {
      const pos = await getOneShotPosition()
      setLocationDenied(!pos)
      const data = await shiftsApi.stop(tripId, myShift.id, pos ? { lat: pos.lat, lng: pos.lng } : {})
      if (data?.shift) upsert(data.shift)
      captureEvent('shift_ended', {
        trip_id: tripId,
        has_location: !!pos,
        duration_s: data?.shift ? shiftSeconds(data.shift, Date.now()) : myElapsed,
      })
    } catch (err) {
      const resp = (err as { response?: { status?: number; data?: { error?: string } } })?.response
      toast.error(resp?.data?.error || (err instanceof Error ? err.message : t('common.unknownError')))
    } finally { setBusy(false) }
  }, [busy, myShift, myElapsed, tripId, t, toast, upsert])

  return {
    t, locale, me,
    shifts, loading, busy, locationDenied, now,
    myShift, myElapsed, onShiftNow, historyDays, totals,
    signOn, signOff,
  }
}
