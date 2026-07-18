import React, { useEffect, useState } from 'react'
import { FileText, ArrowRight, Share2, Clock, CalendarClock, MapPin } from 'lucide-react'
import Modal from '../shared/Modal'
import InfoDot from '../shared/InfoDot'
import { Spinner } from '../shared/Spinner'
import { useToast } from '../shared/Toast'
import { useTranslation } from '../../i18n'
import { reportsApi, type ProductionReport } from '../../api/client'
import { captureEvent } from '../../analytics/posthog'

/**
 * Production report (custom) — the SM/PM digest modal. Four sections over a
 * selectable range (24h / 48h / 7d): schedule changes (old → new, actor, time),
 * files loaded, shift hours per member, and everything with a clock on it in
 * the next 48 hours. The footer shares a compact text summary into the event
 * chat via the Travla bot.
 */

const RANGES: { days: number; key: string }[] = [
  { days: 1, key: 'report.range.24h' },
  { days: 2, key: 'report.range.48h' },
  { days: 7, key: 'report.range.7d' },
]

/** 'YYYY-MM-DD HH:MM:SS' (SQLite CURRENT_TIMESTAMP, UTC) → epoch millis. */
function parseUtc(value: string): number {
  const iso = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`
  const ms = Date.parse(iso)
  return Number.isNaN(ms) ? Date.parse(value) : ms
}

/** Shorten a schedule-change value: datetimes lose the 'T', empties become —. */
function changeValue(v: string | null): string {
  return v == null || v.trim() === '' ? '—' : v.replace('T', ' ')
}

function useProductionReport(tripId: number, isOpen: boolean) {
  const { t, locale } = useTranslation()
  const toast = useToast()
  const [days, setDays] = useState(7)
  const [report, setReport] = useState<ProductionReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setLoading(true)
    setError(null)
    reportsApi.get(tripId, days)
      .then(d => {
        if (cancelled) return
        setReport(d)
        captureEvent('report_viewed', { trip_id: tripId, days })
      })
      .catch(err => {
        if (cancelled) return
        // A failed load must never leave a permanent spinner (or, on a range
        // switch, silently keep showing the previous range's data) — surface
        // an inline error with a retry instead.
        const resp = (err as { response?: { data?: { error?: string } } })?.response
        setError(resp?.data?.error || (err instanceof Error ? err.message : t('common.unknownError')))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // toast/t are stable enough; the report reloads on open + range change (and retry) only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tripId, days, attempt])

  const retry = () => setAttempt(a => a + 1)

  const share = async () => {
    if (sharing) return
    setSharing(true)
    try {
      await reportsApi.share(tripId, days)
      captureEvent('report_shared', { trip_id: tripId, days })
      toast.success(t('report.shared'))
    } catch (err) {
      const resp = (err as { response?: { data?: { error?: string } } })?.response
      toast.error(resp?.data?.error || (err instanceof Error ? err.message : t('common.unknownError')))
    } finally { setSharing(false) }
  }

  return { t, locale, days, setDays, report, loading, error, retry, sharing, share }
}

export default function ProductionReportModal({ tripId, isOpen, onClose }: {
  tripId: number
  isOpen: boolean
  onClose: () => void
}) {
  const { t, locale, days, setDays, report, loading, error, retry, sharing, share } = useProductionReport(tripId, isOpen)

  const fmtWhen = (value: string) =>
    new Date(parseUtc(value)).toLocaleString(locale || undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  // Upcoming times are local-naive planner datetimes ('YYYY-MM-DDTHH:MM').
  const fmtUpcoming = (value: string) =>
    new Date(value).toLocaleString(locale || undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  const fmtHours = (seconds: number) =>
    t('shifts.hours', { h: Math.floor(seconds / 3600), m: Math.floor((seconds % 3600) / 60) })

  const sectionCls = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-content-faint'
  const rowCls = 'bg-surface-tertiary'
  const emptyCls = 'text-content-faint'
  const emptyStyle: React.CSSProperties = { fontSize: 'calc(12.5px * var(--fs-scale-body, 1))', padding: '4px 2px' }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={(
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <FileText size={16} /> {t('report.title')}
          <InfoDot title={t('report.info.title')}>
            <p style={{ margin: 0 }}>{t('report.info.body')}</p>
          </InfoDot>
        </span>
      )}
      footer={(
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose}
            className="bg-surface-tertiary text-content"
            style={{ border: 0, cursor: 'pointer', fontFamily: 'inherit', padding: '10px 16px', borderRadius: 10, fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 500 }}>
            {t('common.close')}
          </button>
          <button onClick={share} disabled={sharing || loading}
            className="bg-accent text-accent-text disabled:opacity-50"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: 0, cursor: 'pointer', fontFamily: 'inherit', padding: '10px 16px', borderRadius: 10, fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 600, boxShadow: 'var(--shadow-sm)' }}>
            <Share2 size={14} /> {t('report.share')}
          </button>
        </div>
      )}
    >
      {/* ── range selector ── */}
      <div style={{ display: 'inline-flex', gap: 4, marginBottom: 20 }} role="group" aria-label={t('report.title')}>
        {RANGES.map(r => {
          const active = days === r.days
          return (
            <button key={r.days} onClick={() => setDays(r.days)}
              className={active ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]' : 'bg-surface-tertiary text-content-muted'}
              style={{ border: 0, cursor: 'pointer', fontFamily: 'inherit', padding: '7px 14px', borderRadius: 99, fontSize: 'calc(12.5px * var(--fs-scale-body, 1))', fontWeight: active ? 600 : 400 }}>
              {t(r.key)}
            </button>
          )
        })}
      </div>

      {error ? (
        <div style={{ display: 'grid', placeItems: 'center', gap: 12, padding: '48px 0' }}>
          <span className={emptyCls} style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))' }}>{t('report.loadFailed')}</span>
          <button onClick={retry}
            className="bg-surface-tertiary text-content"
            style={{ border: 0, cursor: 'pointer', fontFamily: 'inherit', padding: '9px 16px', borderRadius: 10, fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 500 }}>
            {t('report.retry')}
          </button>
        </div>
      ) : loading || !report ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: '60px 0' }}><Spinner /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* ── schedule changes ── */}
          <section>
            <div className={sectionCls} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Clock size={12} /> {t('report.changes')} · <span className="text-content">{report.changes.length}</span>
            </div>
            {report.changes.length === 0 ? (
              <div className={emptyCls} style={emptyStyle}>{t('report.changesEmpty')}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {report.changes.map(c => (
                  <div key={c.id} className={rowCls} data-testid={`report-change-${c.id}`} style={{ borderRadius: 12, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="text-content" style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 600 }}>{c.label}</span>
                      <span className="text-content-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'calc(12.5px * var(--fs-scale-body, 1))', fontVariantNumeric: 'tabular-nums' }}>
                        <s style={{ opacity: 0.7 }}>{changeValue(c.old_value)}</s>
                        <ArrowRight size={12} aria-hidden style={{ flexShrink: 0 }} />
                        <span className="text-content" style={{ fontWeight: 600 }}>{changeValue(c.new_value)}</span>
                      </span>
                    </div>
                    <div className="text-content-faint" style={{ fontSize: 'calc(11.5px * var(--fs-scale-caption, 1))', marginTop: 3 }}>
                      {fmtWhen(c.created_at)}{c.actor_name ? ` · ${t('report.by', { name: c.actor_name })}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── files loaded ── */}
          <section>
            <div className={sectionCls} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <FileText size={12} /> {t('report.files')} · <span className="text-content">{report.files.length}</span>
            </div>
            {report.files.length === 0 ? (
              <div className={emptyCls} style={emptyStyle}>{t('report.filesEmpty')}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {report.files.map(f => (
                  <div key={f.id} className={rowCls} data-testid={`report-file-${f.id}`} style={{ borderRadius: 12, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="text-content" style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.original_name}</span>
                    <span className="text-content-faint" style={{ fontSize: 'calc(11.5px * var(--fs-scale-caption, 1))', flexShrink: 0 }}>
                      {f.uploaded_by_name ? `${t('report.by', { name: f.uploaded_by_name })} · ` : ''}{fmtWhen(f.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── shift hours ── */}
          <section>
            <div className={sectionCls} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Clock size={12} /> {t('report.shiftHours')}
            </div>
            {report.shifts.length === 0 ? (
              <div className={emptyCls} style={emptyStyle}>{t('report.shiftsEmpty')}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {report.shifts.map(s => (
                  <div key={s.user_id} className={rowCls} data-testid={`report-total-${s.user_id}`} style={{ borderRadius: 12, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="text-content" style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.username}</span>
                    {s.open ? (
                      <span className="text-content-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 'calc(11px * var(--fs-scale-caption, 1))', flexShrink: 0 }}>
                        <span className="bg-accent" style={{ width: 7, height: 7, borderRadius: '50%', display: 'inline-block' }} aria-hidden />
                        {t('report.onShift')}
                      </span>
                    ) : null}
                    <span className="text-content" style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmtHours(s.total_seconds)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── next 48 hours ── */}
          <section>
            <div className={sectionCls} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <CalendarClock size={12} /> {t('report.upcoming')}
            </div>
            {report.upcoming.length === 0 ? (
              <div className={emptyCls} style={emptyStyle}>{t('report.upcomingEmpty')}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {report.upcoming.map(u => (
                  <div key={`${u.kind}-${u.id}`} className={rowCls} data-testid={`report-upcoming-${u.kind}-${u.id}`} style={{ borderRadius: 12, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="text-content-muted" style={{ fontSize: 'calc(12.5px * var(--fs-scale-body, 1))', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmtUpcoming(u.time)}</span>
                    <span className="text-content" style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.title}</span>
                    {u.location && (
                      <span className="text-content-faint" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'calc(11.5px * var(--fs-scale-caption, 1))', flexShrink: 0 }}>
                        <MapPin size={11} /> {u.location}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </Modal>
  )
}
