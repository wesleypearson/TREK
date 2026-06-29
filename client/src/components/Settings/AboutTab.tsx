import React from 'react'
import { Info, Coffee, Heart, ExternalLink, Bug, Lightbulb, BookOpen, Tent, Compass, Plane, Crown, Infinity as InfinityIcon } from 'lucide-react'
import { useTranslation } from '../../i18n'
import Section from './Section'

interface Props {
  appVersion: string
}

type SupporterTierId = 'no_return_ticket' | 'lost_luggage_vip' | 'business_class_dreamer' | 'budget_traveller' | 'hostel_bunkmate'

interface SupporterTier {
  id: SupporterTierId
  labelKey: string
  price: string
  gradient: string
  glow: string
  icon: typeof Tent
}

const SUPPORTER_TIERS: SupporterTier[] = [
  { id: 'no_return_ticket', labelKey: 'settings.about.supporter.tier.noReturnTicket', price: '∞', gradient: 'linear-gradient(135deg, #fbbf24, #ec4899 55%, #6366f1)', glow: 'rgba(236,72,153,0.45)', icon: InfinityIcon },
  { id: 'lost_luggage_vip', labelKey: 'settings.about.supporter.tier.lostLuggageVip', price: '$30', gradient: 'linear-gradient(135deg, #a855f7, #ec4899)', glow: 'rgba(168,85,247,0.35)', icon: Crown },
  { id: 'business_class_dreamer', labelKey: 'settings.about.supporter.tier.businessClassDreamer', price: '$15', gradient: 'linear-gradient(135deg, #6366f1, #0ea5e9)', glow: 'rgba(99,102,241,0.35)', icon: Plane },
  { id: 'budget_traveller', labelKey: 'settings.about.supporter.tier.budgetTraveller', price: '$10', gradient: 'linear-gradient(135deg, #14b8a6, #06b6d4)', glow: 'rgba(20,184,166,0.3)', icon: Compass },
  { id: 'hostel_bunkmate', labelKey: 'settings.about.supporter.tier.hostelBunkmate', price: '$5', gradient: 'linear-gradient(135deg, #64748b, #94a3b8)', glow: 'rgba(100,116,139,0.25)', icon: Tent },
]

interface Supporter {
  username: string
  tier: SupporterTierId
  since: string
  link?: string
}

const SUPPORTERS: Supporter[] = [
  { username: 'Someone', tier: 'hostel_bunkmate', since: '2026-04' },
]

function SupporterSection({ t, locale }: { t: (key: string, vars?: Record<string, string | number>) => string; locale: string }) {
  if (SUPPORTERS.length === 0) return null

  const formatSince = (yearMonth: string): string => {
    const [y, m] = yearMonth.split('-').map(Number)
    if (!y || !m) return yearMonth
    try {
      return new Date(y, m - 1, 1).toLocaleDateString(locale, { year: 'numeric', month: 'long' })
    } catch { return yearMonth }
  }

  return (
    <div className="supporter-section">
      <style>{`
        .supporter-section { margin-top: 20px; }
        .supporter-card {
          position: relative;
          border-radius: 20px;
          padding: 22px 22px 18px;
          background: linear-gradient(180deg, rgba(99,102,241,0.06) 0%, rgba(236,72,153,0.04) 100%);
          border: 1px solid rgba(99,102,241,0.18);
          overflow: hidden;
        }
        .supporter-glow {
          position: absolute; inset: -60px; z-index: 0; pointer-events: none;
          background: radial-gradient(500px 240px at 15% -10%, rgba(99,102,241,0.18), transparent 60%), radial-gradient(400px 200px at 90% 110%, rgba(236,72,153,0.12), transparent 60%);
          animation: supporterGlow 6s ease-in-out infinite;
        }
        .supporter-header {
          position: relative; z-index: 1;
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
          margin-bottom: 6px;
        }
        .supporter-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 10px; border-radius: 999px;
          background: linear-gradient(90deg, #6366f1, #ec4899, #fbbf24);
          background-size: 200% 100%;
          animation: supporterShimmer 4s ease-in-out infinite;
          color: #fff; font-weight: 700; font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase;
          box-shadow: 0 4px 16px rgba(236,72,153,0.25);
          white-space: nowrap;
        }
        .supporter-title {
          margin: 0; font-size: 16px; font-weight: 700;
          color: var(--text-primary); letter-spacing: -0.01em;
        }
        .supporter-subtitle {
          position: relative; z-index: 1;
          margin: 0 0 16px; font-size: 12.5px;
          color: var(--text-secondary); line-height: 1.55;
        }
        .supporter-tiers {
          position: relative; z-index: 1;
          display: flex; flex-direction: column; gap: 10px;
        }
        .supporter-tier {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 10px 12px; border-radius: 14px;
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
        }
        .supporter-tier-icon {
          width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          color: #fff;
        }
        .supporter-tier-body { flex: 1; min-width: 0; }
        .supporter-tier-head {
          display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;
        }
        .supporter-tier-label {
          font-size: 13.5px; font-weight: 700; color: var(--text-primary);
        }
        .supporter-tier-price {
          font-size: 11px; font-weight: 600; color: var(--text-faint);
          padding: 1px 7px; border-radius: 6px; background: var(--bg-tertiary);
        }
        .supporter-tier-chips {
          display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;
        }
        .supporter-tier-empty {
          font-size: 11.5px; font-style: italic; color: var(--text-faint);
        }
        .supporter-chip {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 4px 10px; border-radius: 999px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          text-decoration: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          max-width: 100%;
        }
        .supporter-chip-name {
          font-size: 12px; font-weight: 600; color: var(--text-primary);
          white-space: nowrap;
        }
        .supporter-chip-since {
          font-size: 10.5px; font-weight: 500; color: var(--text-faint);
          white-space: nowrap;
        }
        .supporter-chip-since-short { display: none; }
        @keyframes supporterShimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes supporterGlow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.75; }
        }
        @media (max-width: 640px) {
          .supporter-card { border-radius: 16px; padding: 16px 14px 14px; }
          .supporter-glow { inset: -40px; }
          .supporter-header { gap: 8px; }
          .supporter-badge { font-size: 10px; padding: 3px 9px; letter-spacing: 0.03em; }
          .supporter-title { font-size: 15px; flex-basis: 100%; }
          .supporter-subtitle { font-size: 12px; margin-bottom: 14px; }
          .supporter-tier { padding: 10px; gap: 10px; border-radius: 12px; }
          .supporter-tier-icon { width: 34px; height: 34px; border-radius: 10px; }
          .supporter-tier-label { font-size: 13px; }
          .supporter-tier-chips { gap: 5px; margin-top: 7px; }
          .supporter-chip { padding: 3px 9px; }
          .supporter-chip-since { font-size: 10px; }
          .supporter-chip-since-full { display: none; }
          .supporter-chip-since-short { display: inline; }
        }
      `}</style>
      <div className="supporter-card">
        <div className="supporter-glow" />

        <div className="supporter-header">
          <span className="supporter-badge">{t('settings.about.supporters.badge')}</span>
          <h3 className="supporter-title">{t('settings.about.supporters.title')}</h3>
        </div>
        <p className="supporter-subtitle">{t('settings.about.supporters.subtitle')}</p>

        <div className="supporter-tiers">
          {SUPPORTER_TIERS.map(tier => {
            const members = SUPPORTERS.filter(s => s.tier === tier.id)
            const empty = members.length === 0
            const TierIcon = tier.icon
            return (
              <div key={tier.id} className="supporter-tier" style={{ opacity: empty ? 0.55 : 1 }}>
                <div className="supporter-tier-icon" style={{ background: tier.gradient, boxShadow: `0 6px 18px ${tier.glow}` }}>
                  <TierIcon size={18} strokeWidth={2.2} />
                </div>
                <div className="supporter-tier-body">
                  <div className="supporter-tier-head">
                    <span className="supporter-tier-label">{t(tier.labelKey)}</span>
                    <span className="supporter-tier-price">{tier.price}</span>
                  </div>
                  <div className="supporter-tier-chips">
                    {empty && (
                      <span className="supporter-tier-empty">
                        {t('settings.about.supporters.tierEmpty')}
                      </span>
                    )}
                    {members.map(m => {
                      const chipContent = (
                        <>
                          <span className="supporter-chip-name">{m.username}</span>
                          <span className="supporter-chip-since supporter-chip-since-full">
                            · {t('settings.about.supporters.since', { date: formatSince(m.since) })}
                          </span>
                          <span className="supporter-chip-since supporter-chip-since-short">
                            · {formatSince(m.since)}
                          </span>
                        </>
                      )
                      return m.link ? (
                        <a key={m.username} href={m.link} target="_blank" rel="noopener noreferrer" className="supporter-chip"
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-faint)'; e.currentTarget.style.boxShadow = `0 2px 8px ${tier.glow}` }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; e.currentTarget.style.boxShadow = 'none' }}
                        >
                          {chipContent}
                        </a>
                      ) : (
                        <div key={m.username} className="supporter-chip">{chipContent}</div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function AboutTab({ appVersion }: Props): React.ReactElement {
  const { t, locale } = useTranslation()

  return (
    <Section title={t('settings.about')} icon={Info}>
      <style>{`
        @keyframes heartPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>
      <p className="text-content-secondary" style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 16, marginTop: -4 }}>
        Travla — your family travel planner.{' '}
        <span className="text-content-faint bg-surface-tertiary" style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 99, padding: '1px 7px', fontSize: 10, fontWeight: 600, verticalAlign: '1px' }}>v{appVersion}</span>
      </p>
    </Section>
  )
}
