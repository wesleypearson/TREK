import { Check, Copy } from 'lucide-react'
import { useTranslation } from '../i18n'
import { useInvite } from './invite/useInvite'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid #d1d5db',
  fontSize: 'calc(16px * var(--fs-scale-body, 1))',
  background: '#fff',
  color: '#111827',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 'calc(12px * var(--fs-scale-body, 1))',
  fontWeight: 700,
  color: '#374151',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

/**
 * Public invite redemption landing — gig-poster treatment like PublicTabPage,
 * forced to the neutral light look via isSharedPage. The form is pre-filled
 * from the guest row; registering adopts the server-set cookie session and
 * ends inside the event (optionally via the colleague-links step).
 */
export default function InvitePage() {
  const { t } = useTranslation()
  const inv = useInvite()

  if (inv.view === 'loading') return (
    <div className="bg-[#f3f4f6]" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#111827', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (inv.view === 'expired' || inv.view === 'invalid') return (
    <div className="bg-[#f3f4f6]" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', padding: 40, maxWidth: 420 }}>
        <div style={{ fontSize: 'calc(48px * var(--fs-scale-title, 1))', marginBottom: 16 }}>🔒</div>
        <h1 className="text-[#111827]" style={{ fontSize: 'calc(20px * var(--fs-scale-title, 1))', fontWeight: 700 }}>
          {t(inv.view === 'expired' ? 'invites.landing.expired' : 'invites.landing.invalid')}
        </h1>
        <p className="text-[#6b7280]" style={{ marginTop: 8 }}>{t('invites.landing.expiredHint')}</p>
      </div>
    </div>
  )

  const prefill = inv.prefill

  return (
    <div className="bg-[#f3f4f6]" style={{ minHeight: '100vh', fontFamily: 'var(--font-system)', overflowX: 'hidden' }}>
      <div className="text-white tour-gradient" style={{ padding: '32px 20px 60px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div className="tour-halftone" />
        <div className="bg-[rgba(255,255,255,0.03)]" style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%' }} />
        <div className="bg-[rgba(255,255,255,0.12)]" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 12, backdropFilter: 'blur(8px)', marginBottom: 12, border: '1px solid rgba(255,255,255,0.18)', position: 'relative' }}>
          <img src="/icons/icon-white.svg" alt="Travla" width="26" height="26" />
        </div>
        <h1 className="tour-title" style={{ margin: '0 0 8px', fontSize: 'calc(23px * var(--fs-scale-title, 1))', position: 'relative', textShadow: '2px 2px 0 rgba(0,0,0,0.3)' }}>
          {inv.step === 'colleagues' ? t('invites.success.title') : t('invites.landing.title')}
        </h1>
        {prefill?.trip_title && (
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <span className="tour-sticker">{prefill.trip_title}</span>
          </div>
        )}
        <div style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', opacity: 0.75, maxWidth: 420, margin: '0 auto', lineHeight: 1.5, position: 'relative' }}>
          {inv.step === 'colleagues'
            ? t('invites.success.body')
            : t('invites.landing.subtitle', { inviter: prefill?.inviter_name || 'Your crew', trip: prefill?.trip_title || 'your event' })}
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '-36px auto 0', padding: '0 16px 40px', position: 'relative', zIndex: 1 }}>
        {inv.step === 'form' ? (
          <form
            className="bg-white"
            style={{ borderRadius: 16, padding: 24, boxShadow: 'var(--shadow-md, 0 4px 12px rgba(0,0,0,0.08))', display: 'flex', flexDirection: 'column', gap: 16 }}
            onSubmit={(e) => { e.preventDefault(); inv.submit() }}
          >
            {prefill?.guest_name && (
              <div className="text-[#6b7280]" style={{ fontSize: 'calc(14px * var(--fs-scale-body, 1))' }}>
                {t('invites.landing.cta')} — <strong className="text-[#111827]">{prefill.guest_name}</strong>
              </div>
            )}
            <div>
              <label style={labelStyle} htmlFor="inv-username">{t('invites.form.username')}</label>
              <input id="inv-username" style={inputStyle} autoComplete="username" autoCapitalize="none"
                value={inv.username} onChange={(e) => inv.setUsername(e.target.value)} required />
            </div>
            <div>
              <label style={labelStyle} htmlFor="inv-email">{t('invites.form.email')}</label>
              <input id="inv-email" type="email" style={inputStyle} autoComplete="email" inputMode="email"
                value={inv.email} onChange={(e) => inv.setEmail(e.target.value)} required />
            </div>
            <div>
              <label style={labelStyle} htmlFor="inv-password">{t('invites.form.password')}</label>
              <input id="inv-password" type="password" style={inputStyle} autoComplete="new-password"
                value={inv.password} onChange={(e) => inv.setPassword(e.target.value)} required minLength={8} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="inv-company">{t('invites.form.company')}</label>
              <input id="inv-company" style={inputStyle} autoComplete="organization" maxLength={120}
                value={inv.company} onChange={(e) => inv.setCompany(e.target.value)} />
              <div className="text-[#9ca3af]" style={{ fontSize: 'calc(12px * var(--fs-scale-body, 1))', marginTop: 4 }}>
                {t('invites.form.companyHint')}
              </div>
            </div>
            {inv.error && (
              <div className="text-[#b91c1c] bg-[#fef2f2]" style={{ padding: '10px 12px', borderRadius: 8, fontSize: 'calc(13px * var(--fs-scale-body, 1))' }} role="alert">
                {t(inv.error)}
              </div>
            )}
            <button
              type="submit"
              disabled={inv.submitting}
              className="text-white"
              style={{
                padding: '14px 16px', borderRadius: 12, border: 'none', cursor: inv.submitting ? 'default' : 'pointer',
                background: 'var(--accent, #e0197d)', fontWeight: 800, fontSize: 'calc(15px * var(--fs-scale-body, 1))',
                opacity: inv.submitting ? 0.7 : 1, boxShadow: 'var(--shadow-sm, 2px 2px 0 rgba(0,0,0,0.2))',
              }}
            >
              {inv.submitting ? t('invites.form.submitting') : t('invites.form.submit')}
            </button>
          </form>
        ) : (
          <div className="bg-white" style={{ borderRadius: 16, padding: 24, boxShadow: 'var(--shadow-md, 0 4px 12px rgba(0,0,0,0.08))', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 className="text-[#111827]" style={{ margin: 0, fontSize: 'calc(17px * var(--fs-scale-title, 1))', fontWeight: 800 }}>
              {t('invites.colleagues.title')}
            </h2>
            <p className="text-[#6b7280]" style={{ margin: 0, fontSize: 'calc(13px * var(--fs-scale-body, 1))' }}>
              {t('invites.colleagues.subtitle', { company: inv.prefill?.company_name || inv.company || '' })}
            </p>
            {inv.colleagueLinks.length === 0 ? (
              <>
                <div>
                  <label style={labelStyle} htmlFor="inv-count">{t('invites.colleagues.count')}</label>
                  <input id="inv-count" type="number" min={1} max={10} style={{ ...inputStyle, width: 100 }} inputMode="numeric"
                    value={inv.colleagueCount} onChange={(e) => inv.setColleagueCount(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} />
                </div>
                <button
                  onClick={inv.generateColleagues}
                  disabled={inv.generating}
                  className="text-white"
                  style={{ padding: '12px 16px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'var(--accent, #e0197d)', fontWeight: 800, opacity: inv.generating ? 0.7 : 1 }}
                >
                  {t('invites.colleagues.generate')}
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {inv.colleagueLinks.map((url, idx) => (
                  <button
                    key={url}
                    onClick={() => inv.copyLink(idx)}
                    className="text-[#111827] bg-[#f9fafb]"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer', textAlign: 'left' }}
                    aria-label={t('invites.admin.copy')}
                  >
                    {inv.copiedIdx === idx ? <Check size={16} className="text-[#059669]" /> : <Copy size={16} />}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'calc(12px * var(--fs-scale-body, 1))', flex: 1 }}>
                      {inv.copiedIdx === idx ? t('invites.colleagues.copied') : url}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={inv.finish}
              className="text-[#374151] bg-white"
              style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid #d1d5db', cursor: 'pointer', fontWeight: 700 }}
            >
              {inv.colleagueLinks.length > 0 ? t('invites.success.goToTrip') : t('invites.colleagues.skip')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
