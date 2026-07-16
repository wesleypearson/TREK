import { Copy, Check, Receipt, Landmark, Smartphone, Wallet, HandCoins, UserPlus, ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { useTranslation } from '../i18n'
import { publicTabApi, type PublicTabData } from '../api/client'
import { formatMoney } from '../utils/formatters'
import { usePublicTab } from './publicTab/usePublicTab'

/**
 * /public/tab/:token — the hosted repayment page (custom expense tabs).
 *
 * Anyone with the link sees their running balance, every shared charge (with
 * the original receipt when the owner shared it), payments received, and the
 * owner's payment methods — no Travla account needed. First visit asks for the
 * visitor's name (one-time, stored against the tab) and offers a one-use join
 * link to register into the trip. Styled like SharedTripPage: fixed light
 * palette, no session, no stores. Page = wiring container: all state lives
 * in usePublicTab().
 */

const PAYMENT_META: { key: keyof PublicTabData['payment_methods']; labelKey: string; Icon: typeof Landmark }[] = [
  { key: 'payment_bank', labelKey: 'publicTab.bank', Icon: Landmark },
  { key: 'payment_payid', labelKey: 'publicTab.payid', Icon: Smartphone },
  { key: 'payment_venmo', labelKey: 'publicTab.venmo', Icon: Wallet },
  { key: 'payment_other', labelKey: 'publicTab.otherPay', Icon: HandCoins },
]

export default function PublicTabPage() {
  const { t, locale } = useTranslation()
  const { token, data, error, copied, firstName, setFirstName, lastName, setLastName, claiming, claimError, copy, submitClaim } = usePublicTab()

  const fmt = (v: number) => formatMoney(v, data?.currency || 'AUD', locale)

  if (error) return (
    <div className="bg-[#f3f4f6]" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 'calc(48px * var(--fs-scale-title, 1))', marginBottom: 16 }}>🔒</div>
        <h1 className="text-[#111827]" style={{ fontSize: 'calc(20px * var(--fs-scale-title, 1))', fontWeight: 700 }}>{t('publicTab.expired')}</h1>
        <p className="text-[#6b7280]" style={{ marginTop: 8 }}>{t('publicTab.expiredHint')}</p>
      </div>
    </div>
  )

  if (!data) return (
    <div className="bg-[#f3f4f6]" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#111827', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  // A member-linked tab renders the LIVE ledger position (share of every group
  // bill + who is owed); a standalone tab renders its frozen charge list.
  const live = data.live || null
  const balance = live ? live.balance : data.balance
  const owing = balance > 0.004
  const paymentEntries = PAYMENT_META.filter(m => data.payment_methods[m.key])
  const sortedItems = [...data.items].sort((a, b) => String(b.expense_date || b.created_at || '').localeCompare(String(a.expense_date || a.created_at || '')))
  const heroFmt = (v: number) => formatMoney(v, live?.currency || data.currency || 'AUD', locale)

  const fmtDate = (d?: string | null) => {
    if (!d) return ''
    try { return new Date((d.length === 10 ? d + 'T00:00:00Z' : d)).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: d.length === 10 ? 'UTC' : undefined }) } catch { return d }
  }

  return (
    <div className="bg-[#f3f4f6]" style={{ minHeight: '100vh', fontFamily: 'var(--font-system)' }}>
      {/* Header */}
      <div className="text-white" style={{ background: 'linear-gradient(135deg, #000 0%, #0f172a 50%, #1e293b 100%)', padding: '32px 20px 60px', textAlign: 'center', position: 'relative' }}>
        <div className="bg-[rgba(255,255,255,0.03)]" style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%' }} />
        <div className="bg-[rgba(255,255,255,0.08)]" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 12, backdropFilter: 'blur(8px)', marginBottom: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
          <img src="/icons/icon-white.svg" alt="Travla" width="26" height="26" />
        </div>
        <h1 style={{ margin: '0 0 6px', fontSize: 'calc(24px * var(--fs-scale-title, 1))', fontWeight: 700, letterSpacing: -0.5 }}>
          {t('publicTab.hello', { name: data.first_name })}
        </h1>
        <div style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', opacity: 0.6, maxWidth: 420, margin: '0 auto', lineHeight: 1.5 }}>
          {t('publicTab.intro', { owner: data.owner_name, trip: data.trip_title })}
        </div>
      </div>

      {/* position:relative lifts the cards above the (positioned) header so the
          -36px overlap paints on top of the gradient, not underneath it. */}
      <div style={{ maxWidth: 560, margin: '-36px auto 0', padding: '0 16px 40px', display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', zIndex: 1 }}>
        {/* Balance hero */}
        <div className="bg-white" style={{ borderRadius: 18, padding: '22px 24px', boxShadow: '0 10px 30px -12px rgba(0,0,0,0.25)', textAlign: 'center' }}>
          <div className="text-[#6b7280]" style={{ fontSize: 'calc(11px * var(--fs-scale-caption, 1))', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('publicTab.balance')}</div>
          <div style={{ fontSize: 'calc(42px * var(--fs-scale-title, 1))', fontWeight: 700, letterSpacing: '-0.03em', marginTop: 6, color: owing ? '#dc2626' : '#16a34a' }}>
            {heroFmt(Math.max(balance, 0))}
          </div>
          {!owing && <div className="text-[#16a34a]" style={{ marginTop: 4, fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 600 }}>{t('publicTab.settled')}</div>}
          <div className="text-[#9ca3af]" style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 12, fontSize: 'calc(12px * var(--fs-scale-body, 1))', flexWrap: 'wrap' }}>
            <span>{t('publicTab.totalCharged')} · <b className="text-[#374151]">{heroFmt(live ? live.charged : data.charged)}</b></span>
            <span>{t('publicTab.totalPaid')} · <b className="text-[#374151]">{heroFmt(live ? live.paid : data.paid)}</b></span>
            {live && (live.credit || 0) > 0.004 && (
              <span>{t('publicTab.credit')} · <b className="text-[#16a34a]">{heroFmt(live.credit!)}</b></span>
            )}
          </div>
          {live && <div className="text-[#9ca3af]" style={{ marginTop: 10, fontSize: 'calc(11px * var(--fs-scale-caption, 1))', lineHeight: 1.4 }}>{t('publicTab.liveNote')}</div>}
        </div>

        {/* One-time name confirmation */}
        {!data.claimed && (
          <div className="bg-white" style={{ borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="text-[#111827]" style={{ fontSize: 'calc(14px * var(--fs-scale-body, 1))', fontWeight: 700 }}>{t('publicTab.claimTitle', { owner: data.owner_name })}</div>
            <div className="text-[#6b7280]" style={{ fontSize: 'calc(12px * var(--fs-scale-caption, 1))', marginTop: 3, lineHeight: 1.5 }}>{t('publicTab.claimHint')}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder={t('publicTab.firstName')}
                className="text-[#111827] bg-white border border-[#d1d5db]" style={{ flex: '1 1 120px', minWidth: 0, padding: '9px 12px', borderRadius: 10, fontSize: 'calc(14px * var(--fs-scale-body, 1))', fontFamily: 'inherit', outline: 'none' }} />
              <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder={t('publicTab.lastName')}
                className="text-[#111827] bg-white border border-[#d1d5db]" style={{ flex: '1 1 120px', minWidth: 0, padding: '9px 12px', borderRadius: 10, fontSize: 'calc(14px * var(--fs-scale-body, 1))', fontFamily: 'inherit', outline: 'none' }} />
              <button onClick={submitClaim} disabled={claiming || !firstName.trim() || !lastName.trim()}
                className="bg-[#111827] text-white disabled:opacity-40" style={{ padding: '9px 18px', borderRadius: 10, fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 600, border: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
                {t('publicTab.claimSubmit')}
              </button>
            </div>
            {claimError && <div className="text-[#dc2626]" style={{ fontSize: 'calc(12px * var(--fs-scale-caption, 1))', marginTop: 8 }}>{t('common.error')}</div>}
          </div>
        )}
        {data.claimed && (
          <div className="bg-[rgba(22,163,74,0.08)] text-[#166534]" style={{ borderRadius: 12, padding: '10px 16px', fontSize: 'calc(12.5px * var(--fs-scale-body, 1))', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Check size={15} /> {t('publicTab.claimedThanks', { name: `${data.first_name} ${data.last_name}`.trim() })}
          </div>
        )}

        {/* Who you owe (live, member-linked tabs): one card per creditor with
            their own payment details. */}
        {live && live.owed.map(o => {
          const entries = PAYMENT_META.filter(m => o.payment_methods[m.key])
          return (
            <div key={o.user_id} className="bg-white" style={{ borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: entries.length ? 12 : 0 }}>
                <div className="text-[#111827]" style={{ fontSize: 'calc(14px * var(--fs-scale-body, 1))', fontWeight: 700 }}>{t('publicTab.youOwe', { name: o.name })}</div>
                <div className="text-[#dc2626]" style={{ fontSize: 'calc(17px * var(--fs-scale-subtitle, 1))', fontWeight: 700, whiteSpace: 'nowrap' }}>{heroFmt(o.amount)}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {entries.map(({ key, labelKey, Icon }) => (
                  <div key={key} className="bg-[#f9fafb] border border-[#f3f4f6]" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12 }}>
                    <div className="bg-white border border-[#e5e7eb]" style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <Icon size={16} className="text-[#374151]" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="text-[#6b7280]" style={{ fontSize: 'calc(10.5px * var(--fs-scale-caption, 1))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t(labelKey)}</div>
                      <div className="text-[#111827]" style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 500, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{o.payment_methods[key]}</div>
                    </div>
                    <button onClick={() => copy(`${o.user_id}:${key}`, o.payment_methods[key]!)} title={t('publicTab.copy')}
                      className="bg-white border border-[#e5e7eb] text-[#6b7280]" style={{ width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
                      {copied === `${o.user_id}:${key}` ? <Check size={14} className="text-[#16a34a]" /> : <Copy size={14} />}
                    </button>
                  </div>
                ))}
                {entries.length === 0 && (
                  <div className="text-[#6b7280] bg-[#f9fafb] border border-[#f3f4f6]" style={{ borderRadius: 12, padding: '10px 12px', fontSize: 'calc(12.5px * var(--fs-scale-body, 1))', lineHeight: 1.5 }}>
                    {t('publicTab.noMethods', { name: o.name })}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Standalone tab, owner without details on file: say so instead of
            leaving the payer with an amount and no way to act on it. */}
        {!live && owing && paymentEntries.length === 0 && (
          <div className="bg-white" style={{ borderRadius: 16, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="text-[#111827]" style={{ fontSize: 'calc(14px * var(--fs-scale-body, 1))', fontWeight: 700, marginBottom: 4 }}>{t('publicTab.payWith', { owner: data.owner_name })}</div>
            <div className="text-[#6b7280]" style={{ fontSize: 'calc(12.5px * var(--fs-scale-body, 1))', lineHeight: 1.5 }}>{t('publicTab.noMethods', { name: data.owner_name })}</div>
          </div>
        )}

        {/* How to pay (standalone tabs: the tab owner's details) */}
        {!live && owing && paymentEntries.length > 0 && (
          <div className="bg-white" style={{ borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="text-[#111827]" style={{ fontSize: 'calc(14px * var(--fs-scale-body, 1))', fontWeight: 700, marginBottom: 12 }}>{t('publicTab.payWith', { owner: data.owner_name })}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {paymentEntries.map(({ key, labelKey, Icon }) => (
                <div key={key} className="bg-[#f9fafb] border border-[#f3f4f6]" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12 }}>
                  <div className="bg-white border border-[#e5e7eb]" style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Icon size={16} className="text-[#374151]" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="text-[#6b7280]" style={{ fontSize: 'calc(10.5px * var(--fs-scale-caption, 1))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t(labelKey)}</div>
                    <div className="text-[#111827]" style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 500, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{data.payment_methods[key]}</div>
                  </div>
                  <button onClick={() => copy(key, data.payment_methods[key]!)} title={t('publicTab.copy')}
                    className="bg-white border border-[#e5e7eb] text-[#6b7280]" style={{ width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    {copied === key ? <Check size={14} className="text-[#16a34a]" /> : <Copy size={14} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charges */}
        <div className="bg-white" style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="bg-[#f9fafb] text-[#6b7280]" style={{ padding: '10px 20px', fontSize: 'calc(11px * var(--fs-scale-caption, 1))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowDownRight size={13} /> {t('publicTab.charges')} · {live ? live.charges.length : sortedItems.length}
          </div>
          {(live ? live.charges.length : sortedItems.length) === 0 && <div className="text-[#9ca3af]" style={{ padding: '18px 20px', fontSize: 'calc(13px * var(--fs-scale-body, 1))' }}>—</div>}
          {live && live.charges.map(c => (
            <div key={c.id} style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #f9fafb' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="text-[#111827]" style={{ fontSize: 'calc(13.5px * var(--fs-scale-body, 1))', fontWeight: 600 }}>{c.label}</div>
                <div className="text-[#9ca3af]" style={{ fontSize: 'calc(11px * var(--fs-scale-caption, 1))', marginTop: 1 }}>
                  {fmtDate(c.expense_date || c.created_at)}{c.share < c.total ? ` · ${t('publicTab.ofTotal', { amount: formatMoney(c.total, c.currency || live.currency, locale) })}` : ''}
                </div>
              </div>
              <div className="text-[#111827]" style={{ fontSize: 'calc(14px * var(--fs-scale-body, 1))', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatMoney(c.share, c.currency || live.currency, locale)}</div>
            </div>
          ))}
          {!live && sortedItems.map(item => (
            <div key={item.id} style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #f9fafb' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="text-[#111827]" style={{ fontSize: 'calc(13.5px * var(--fs-scale-body, 1))', fontWeight: 600 }}>{item.label}</div>
                <div className="text-[#9ca3af]" style={{ fontSize: 'calc(11px * var(--fs-scale-caption, 1))', marginTop: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {fmtDate(item.expense_date || item.created_at)}
                  {item.has_receipt && token && (
                    <a href={publicTabApi.receiptUrl(token, item.id)} target="_blank" rel="noopener noreferrer"
                      className="text-[#2563eb]" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, textDecoration: 'none', fontWeight: 600 }}>
                      <Receipt size={11} /> {t('publicTab.viewReceipt')}
                    </a>
                  )}
                </div>
              </div>
              <div className="text-[#111827]" style={{ fontSize: 'calc(14px * var(--fs-scale-body, 1))', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmt(item.amount)}</div>
            </div>
          ))}
        </div>

        {/* Payments made / received */}
        {(live ? live.payments.length : data.payments.length) > 0 && (
          <div className="bg-white" style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="bg-[#f9fafb] text-[#6b7280]" style={{ padding: '10px 20px', fontSize: 'calc(11px * var(--fs-scale-caption, 1))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ArrowUpRight size={13} /> {t('publicTab.payments')} · {live ? live.payments.length : data.payments.length}
            </div>
            {live && live.payments.map(p => (
              <div key={p.id} style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #f9fafb' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="text-[#111827]" style={{ fontSize: 'calc(13.5px * var(--fs-scale-body, 1))', fontWeight: 500 }}>{t('publicTab.paidTo', { name: p.to_name })}</div>
                  <div className="text-[#9ca3af]" style={{ fontSize: 'calc(11px * var(--fs-scale-caption, 1))', marginTop: 1 }}>{fmtDate(p.created_at)}</div>
                </div>
                <div className="text-[#16a34a]" style={{ fontSize: 'calc(14px * var(--fs-scale-body, 1))', fontWeight: 700, whiteSpace: 'nowrap' }}>−{formatMoney(p.amount, p.currency || live.currency, locale)}</div>
              </div>
            ))}
            {!live && data.payments.map(p => (
              <div key={p.id} style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #f9fafb' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="text-[#111827]" style={{ fontSize: 'calc(13.5px * var(--fs-scale-body, 1))', fontWeight: 500 }}>{p.note || t('publicTab.payments')}</div>
                  <div className="text-[#9ca3af]" style={{ fontSize: 'calc(11px * var(--fs-scale-caption, 1))', marginTop: 1 }}>{fmtDate(p.created_at)}</div>
                </div>
                <div className="text-[#16a34a]" style={{ fontSize: 'calc(14px * var(--fs-scale-body, 1))', fontWeight: 700, whiteSpace: 'nowrap' }}>−{fmt(p.amount)}</div>
              </div>
            ))}
          </div>
        )}

        {/* Join the trip */}
        {data.join_url && (
          <a href={data.join_url}
            className="bg-[#111827] text-white" style={{ borderRadius: 16, padding: '16px 20px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 4px 14px -6px rgba(0,0,0,0.4)' }}>
            <div className="bg-[rgba(255,255,255,0.12)]" style={{ width: 38, height: 38, borderRadius: 11, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <UserPlus size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 'calc(14px * var(--fs-scale-body, 1))', fontWeight: 700 }}>{t('publicTab.joinCta')}</div>
              <div style={{ fontSize: 'calc(11.5px * var(--fs-scale-caption, 1))', opacity: 0.65, marginTop: 1, lineHeight: 1.4 }}>{t('publicTab.joinHint')}</div>
            </div>
          </a>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '20px 0 4px' }}>
          <div className="bg-white border border-[#e5e7eb]" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <img src="/icons/icon.svg" alt="Travla" width="18" height="18" style={{ borderRadius: 4 }} />
            <span className="text-[#9ca3af]" style={{ fontSize: 'calc(11px * var(--fs-scale-caption, 1))' }}>{t('shared.sharedVia')} <strong className="text-[#6b7280]">Travla</strong></span>
          </div>
        </div>
      </div>
    </div>
  )
}
