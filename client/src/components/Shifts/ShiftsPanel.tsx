import React from 'react'
import { Timer, MapPin, LogIn, LogOut } from 'lucide-react'
import InfoDot from '../shared/InfoDot'
import { Spinner } from '../shared/Spinner'
import type { Shift } from '../../api/client'
import { useShifts, parseShiftDate, shiftSeconds, type ShiftTotalLive } from './useShifts'

/**
 * Shifts — the crew rostering timeclock tab. Big ticking ON-SHIFT timer,
 * one-tap sign on/sign off (with a one-shot, optional location fix), the live
 * "On shift now" roster, history grouped by day and hours-per-member totals.
 * All logic lives in useShifts; this component is presentation only.
 */

const AVATAR_COLORS = ['#e0197d', '#7c3aed', '#0891b2', '#ea580c', '#16a34a', '#4f46e5', '#db2777', '#b45309']

function Avatar({ userId, username, avatar, size = 28 }: { userId: number; username: string; avatar?: string | null; size?: number }) {
  if (avatar) {
    return <img src={avatar} alt={username} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }} />
  }
  const color = AVATAR_COLORS[Math.abs(userId) % AVATAR_COLORS.length]
  return (
    <span aria-hidden style={{ width: size, height: size, borderRadius: '50%', background: color, color: '#fff', display: 'grid', placeItems: 'center', fontSize: size * 0.42, fontWeight: 700, flexShrink: 0, textTransform: 'uppercase' }}>
      {(username || '?').slice(0, 1)}
    </span>
  )
}

/** 9345 s → "2:35:45" for the big ticking clock. */
export function fmtClock(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function ShiftsPanel({ tripId }: { tripId: number }) {
  const {
    t, locale, shifts, loading, busy, locationDenied,
    now, myShift, myElapsed, onShiftNow, historyDays, totals, signOn, signOff,
  } = useShifts(tripId)

  const fmtTime = (value: string) =>
    new Date(parseShiftDate(value)).toLocaleTimeString(locale || undefined, { hour: '2-digit', minute: '2-digit' })
  const fmtDur = (seconds: number) =>
    t('shifts.hours', { h: Math.floor(seconds / 3600), m: Math.floor((seconds % 3600) / 60) })

  const cardCls = 'bg-surface-card border border-edge'
  const labelCls = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-content-faint'

  if (loading) {
    return <div style={{ display: 'grid', placeItems: 'center', padding: '80px 0' }}><Spinner /></div>
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 28px 48px' }} className="max-md:!px-4">
      {/* ── header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <h2 className="text-content tour-title" style={{ margin: 0, fontSize: 'calc(24px * var(--fs-scale-title, 1))', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Timer size={22} /> {t('shifts.title')}
          <InfoDot title={t('shifts.info.title')}>
            <p style={{ margin: 0 }}>{t('shifts.info.body')}</p>
          </InfoDot>
        </h2>
        {myShift ? (
          <button onClick={signOff} disabled={busy}
            className="bg-accent text-accent-text disabled:opacity-50"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 12, fontSize: 'calc(14px * var(--fs-scale-body, 1))', fontWeight: 600, border: 0, cursor: 'pointer', fontFamily: 'inherit', boxShadow: 'var(--shadow-sm)' }}>
            <LogOut size={16} /> {t('shifts.signOff')}
          </button>
        ) : (
          <button onClick={signOn} disabled={busy}
            className="bg-[var(--text-primary)] text-[var(--bg-primary)] disabled:opacity-50"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 12, fontSize: 'calc(14px * var(--fs-scale-body, 1))', fontWeight: 600, border: 0, cursor: 'pointer', fontFamily: 'inherit', boxShadow: 'var(--shadow-sm)' }}>
            <LogIn size={16} /> {t('shifts.signOn')}
          </button>
        )}
      </div>

      {/* ── one-shot location consent note ── */}
      <div className="text-content-faint" style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 'calc(12px * var(--fs-scale-caption, 1))', marginBottom: 24 }}>
        <MapPin size={13} style={{ flexShrink: 0 }} />
        <span>{t('shifts.locationNote')}</span>
        {locationDenied && <span className="text-content-muted" style={{ fontWeight: 600 }}>· {t('shifts.locationDenied')}</span>}
      </div>

      {/* ── big ticking ON-SHIFT timer ── */}
      {myShift && (
        <div className={cardCls} style={{ borderRadius: 22, padding: '26px 28px', marginBottom: 24, textAlign: 'center', boxShadow: 'var(--shadow-md)' }}>
          <div className={labelCls} style={{ marginBottom: 8 }}>{t('shifts.elapsed')}</div>
          <div className="tour-title text-content" data-testid="shift-elapsed" style={{ fontSize: 'calc(52px * var(--fs-scale-title, 1))', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {fmtClock(myElapsed)}
          </div>
          <div className="text-content-muted" style={{ marginTop: 10, fontSize: 'calc(12.5px * var(--fs-scale-caption, 1))' }}>
            {t('shifts.signedOnAt', { time: fmtTime(myShift.started_at) })}
          </div>
        </div>
      )}

      {/* ── main grid: history + sidebar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }} className="max-md:!grid-cols-1">
        {/* history */}
        <div>
          <div className={labelCls} style={{ marginBottom: 12 }}>{t('shifts.history')}</div>
          {historyDays.length === 0 ? (
            <div className="text-content-faint" style={{ textAlign: 'center', padding: '48px 16px', fontSize: 'calc(13.5px * var(--fs-scale-body, 1))' }}>
              {t('shifts.empty')}
            </div>
          ) : historyDays.map(g => (
            <div key={g.day} style={{ marginBottom: 18 }}>
              <div className="text-content-muted" style={{ fontSize: 'calc(12px * var(--fs-scale-caption, 1))', fontWeight: 600, margin: '0 0 8px 4px' }}>{g.day}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {g.shifts.map((s: Shift) => (
                  <div key={s.id} className={cardCls} style={{ borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar userId={s.user_id} username={s.username} avatar={s.avatar} size={30} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="text-content" style={{ fontSize: 'calc(13.5px * var(--fs-scale-body, 1))', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.username}</div>
                      <div className="text-content-muted" style={{ fontSize: 'calc(12px * var(--fs-scale-caption, 1))' }}>
                        {t('shifts.signedOffSummary', { start: fmtTime(s.started_at), end: s.ended_at ? fmtTime(s.ended_at) : '—', duration: fmtDur(shiftSeconds(s, now)) })}
                      </div>
                      {s.note && <div className="text-content-faint" style={{ fontSize: 'calc(11.5px * var(--fs-scale-caption, 1))', marginTop: 2 }}>{s.note}</div>}
                    </div>
                    {(s.start_lat != null || s.end_lat != null) && (
                      <MapPin size={14} className="text-content-faint" style={{ flexShrink: 0 }} aria-label="location" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* on shift now */}
          <div className={cardCls} style={{ borderRadius: 22, padding: '20px 22px' }}>
            <div className={labelCls} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
              <span className="bg-accent" style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} aria-hidden />
              {t('shifts.onShiftNow')} · <span className="text-content">{onShiftNow.length}</span>
            </div>
            {onShiftNow.length === 0 ? (
              <div className="text-content-faint" style={{ fontSize: 'calc(12.5px * var(--fs-scale-body, 1))' }}>{t('shifts.nobodyOn')}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {onShiftNow.map((s: Shift) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }} data-testid={`on-shift-${s.user_id}`}>
                    <Avatar userId={s.user_id} username={s.username} avatar={s.avatar} />
                    <span className="text-content" style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.username}</span>
                    <span className="text-content-muted" style={{ fontSize: 'calc(12px * var(--fs-scale-caption, 1))', fontVariantNumeric: 'tabular-nums' }}>{fmtDur(shiftSeconds(s, now))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* hours per member */}
          <div className={cardCls} style={{ borderRadius: 22, padding: '20px 22px' }}>
            <div className={labelCls} style={{ marginBottom: 14 }}>{t('shifts.totals')}</div>
            {totals.length === 0 ? (
              <div className="text-content-faint" style={{ fontSize: 'calc(12.5px * var(--fs-scale-body, 1))' }}>{t('shifts.empty')}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {totals.map((tot: ShiftTotalLive) => (
                  <div key={tot.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10 }} data-testid={`total-${tot.user_id}`}>
                    <Avatar userId={tot.user_id} username={tot.username} avatar={tot.avatar} size={24} />
                    <span className="text-content" style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tot.username}</span>
                    <span className="text-content" style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtDur(tot.total_seconds)}{tot.open ? ' ·' : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
