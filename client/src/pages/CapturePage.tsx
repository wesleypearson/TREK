import React from 'react'
import { Activity, AlertTriangle, BatteryMedium, Eye, MapPin, Play, Radio, Square, Wifi } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Navbar from '../components/Layout/Navbar'
import InfoDot from '../components/shared/InfoDot'
import { useCapture, SENSOR_IDS } from './capture/useCapture'
import type { SensorId, SensorStatus } from './capture/useCapture'
import type { TranslationFn } from '../types'
import '../styles/dashboard.css'

const SENSOR_ICONS: Record<SensorId, LucideIcon> = {
  location: MapPin,
  motion: Activity,
  battery: BatteryMedium,
  network: Wifi,
  visibility: Eye,
}

/** Pure display helper — 65s → "1:05", 3665s → "1:01:05". */
function formatElapsed(totalS: number): string {
  const h = Math.floor(totalS / 3600)
  const m = Math.floor((totalS % 3600) / 60)
  const s = totalS % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`
}

export default function CapturePage(): React.ReactElement {
  const c = useCapture()
  const { t } = c

  // t-dependent display array for the sensor consent rows (page-level per PATTERN.md).
  const sensors = SENSOR_IDS.map(id => ({
    id,
    name: t(`capture.sensors.${id}`),
    hint: t(`capture.sensors.${id}Hint`),
    Icon: SENSOR_ICONS[id],
  }))

  const totalSamples = SENSOR_IDS.reduce((sum, id) => sum + c.counts[id], 0)

  return (
    <>
      <Navbar />
      <div className="trek-dash" style={{ minHeight: '100vh', paddingTop: 'var(--nav-h)', background: 'var(--bg-primary)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '30px 24px 120px' }}>

          {/* Header: title + consent info, subtitle */}
          <div style={{ marginBottom: 16 }}>
            <h1 className="tour-title text-content" style={{ margin: 0, fontSize: 'calc(24px * var(--fs-scale-title, 1))', display: 'flex', alignItems: 'center', gap: 8 }}>
              {t('capture.title')}
              <InfoDot title={t('capture.info.title')}>
                <p style={{ margin: 0 }}>{t('capture.info.body')}</p>
              </InfoDot>
            </h1>
            <p className="text-content-muted" style={{ margin: '4px 0 0', fontSize: 'calc(13px * var(--fs-scale-body, 1))', maxWidth: 640 }}>
              {t('capture.subtitle')}
            </p>
          </div>

          {/* Foreground-only warning — a PWA cannot sense in the background */}
          <div
            className="rounded-xl border border-edge bg-surface-tertiary flex items-start gap-2.5"
            style={{ padding: '11px 14px', marginBottom: 22 }}
          >
            <AlertTriangle size={16} className="text-content-faint flex-shrink-0" style={{ marginTop: 1 }} />
            <p className="text-[12.5px] text-content-secondary" style={{ margin: 0, lineHeight: 1.55 }}>
              {t('capture.foregroundWarning')}
            </p>
          </div>

          {/* Consent toggles — each sensor OFF until switched on */}
          <div className="rounded-2xl border border-edge bg-surface-card overflow-hidden" style={{ marginBottom: 22 }}>
            {sensors.map(s => (
              <SensorRow
                key={s.id}
                Icon={s.Icon}
                name={s.name}
                hint={s.hint}
                on={c.toggles[s.id]}
                status={c.statuses[s.id]}
                disabled={c.running}
                onToggle={() => c.toggleSensor(s.id)}
                t={t}
              />
            ))}
          </div>

          {/* Start / stop */}
          <div className="flex items-center gap-3" style={{ marginBottom: 26 }}>
            {c.running ? (
              <button
                type="button"
                onClick={c.handleStop}
                className="inline-flex items-center gap-2 rounded-lg bg-danger text-white text-[14px] font-semibold hover:opacity-90"
                style={{ border: 'none', cursor: 'pointer', height: 42, padding: '0 18px' }}
              >
                <Square size={15} strokeWidth={2.5} />
                {t('capture.stop')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { void c.handleStart() }}
                disabled={!c.anySensorOn}
                className="bg-accent text-accent-text inline-flex items-center gap-2 rounded-lg text-[14px] font-semibold disabled:opacity-50"
                style={{ border: 'none', cursor: c.anySensorOn ? 'pointer' : 'default', height: 42, padding: '0 18px' }}
              >
                <Play size={15} strokeWidth={2.5} />
                {t('capture.start')}
              </button>
            )}
            {!c.running && !c.anySensorOn && (
              <span className="text-[12.5px] text-content-faint">{t('capture.selectSensor')}</span>
            )}
            {c.running && (
              <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-content-secondary">
                <Radio size={13} className="text-accent" />
                {t('capture.recording')}
              </span>
            )}
          </div>

          {/* Live session stats */}
          {c.running && (
            <div className="rounded-2xl border border-edge bg-surface-card" style={{ padding: '20px 22px', marginBottom: 22 }}>
              <div className="text-[11px] font-semibold uppercase text-content-faint" style={{ letterSpacing: '0.1em', marginBottom: 6 }}>
                {t('capture.elapsed')}
              </div>
              <div className="tour-title text-content" style={{ fontSize: 'calc(44px * var(--fs-scale-title, 1))', lineHeight: 1 }}>
                {formatElapsed(c.elapsed)}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12, marginTop: 18 }}>
                {sensors.map(s => (
                  <div key={s.id} className="rounded-xl border border-edge-secondary bg-surface-tertiary" style={{ padding: '10px 12px', opacity: c.toggles[s.id] ? 1 : 0.45 }}>
                    <div className="text-[11px] text-content-faint truncate">{s.name}</div>
                    <div className="text-[18px] font-semibold text-content" data-testid={`capture-count-${s.id}`}>
                      {c.counts[s.id]}
                    </div>
                  </div>
                ))}
              </div>

              {c.toggles.location && (
                <div className="text-[12.5px] text-content-muted" style={{ marginTop: 14 }}>
                  {t('capture.lastFix')}:{' '}
                  <span className="font-medium text-content" data-testid="capture-last-fix">
                    {c.lastFix ? `${c.lastFix.lat.toFixed(4)}, ${c.lastFix.lng.toFixed(4)}` : t('capture.noFix')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Session summary (after stop) */}
          {!c.running && c.summary && (
            <div className="rounded-2xl border border-edge bg-surface-card" style={{ padding: '20px 22px' }}>
              <div className="text-[15px] font-semibold text-content" style={{ marginBottom: 12 }}>
                {t('capture.summaryTitle')}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2" style={{ marginBottom: 14 }}>
                <div>
                  <div className="text-[11px] text-content-faint">{t('capture.summaryDuration')}</div>
                  <div className="text-[16px] font-semibold text-content">{formatElapsed(c.summary.durationS)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-content-faint">{t('capture.summaryTotal')}</div>
                  <div className="text-[16px] font-semibold text-content">
                    {SENSOR_IDS.reduce((sum, id) => sum + (c.summary?.counts[id] ?? 0), 0)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12 }}>
                {sensors.map(s => (
                  <div key={s.id} className="rounded-xl border border-edge-secondary bg-surface-tertiary" style={{ padding: '10px 12px' }}>
                    <div className="text-[11px] text-content-faint truncate">{s.name}</div>
                    <div className="text-[18px] font-semibold text-content">{c.summary?.counts[s.id] ?? 0}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hidden while idle, but keeps totals honest for a11y tools */}
          <span className="sr-only">{t('capture.samples')}: {totalSamples}</span>
        </div>
      </div>
    </>
  )
}

function SensorRow({ Icon, name, hint, on, status, disabled, onToggle, t }: {
  Icon: LucideIcon
  name: string
  hint: string
  on: boolean
  status: SensorStatus
  disabled: boolean
  onToggle: () => void
  t: TranslationFn
}): React.ReactElement {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-edge-secondary last:border-b-0">
      <Icon size={17} className="text-content-faint flex-shrink-0" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="text-[13.5px] font-medium text-content">{name}</div>
        <div className="text-[11.5px] text-content-faint">{hint}</div>
      </div>
      {status === 'denied' && (
        <span className="text-[11px] font-medium text-danger flex-shrink-0">{t('capture.permissionDenied')}</span>
      )}
      {status === 'unsupported' && (
        <span className="text-[11px] font-medium text-content-faint flex-shrink-0">{t('capture.notSupported')}</span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={name}
        disabled={disabled}
        onClick={onToggle}
        className="flex-shrink-0 disabled:opacity-50"
        style={{
          width: 40, height: 24, borderRadius: 12, border: 'none', padding: 2,
          cursor: disabled ? 'default' : 'pointer',
          background: on ? 'var(--accent)' : 'var(--border-secondary, rgba(128,128,128,0.35))',
          transition: 'background 0.15s',
          display: 'inline-flex', alignItems: 'center',
          justifyContent: on ? 'flex-end' : 'flex-start',
        }}
      >
        <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.25))' }} />
      </button>
    </div>
  )
}
