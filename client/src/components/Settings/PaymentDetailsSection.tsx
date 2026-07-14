import React, { useEffect, useState } from 'react'
import { HandCoins, Save } from 'lucide-react'
import { useTranslation } from '../../i18n'
import { useToast } from '../shared/Toast'
import { settingsApi } from '../../api/client'
import Section from './Section'

/**
 * Payment details (custom): how people pay YOU back. Pulled onto every public
 * expense-tab page you share, so a visitor sees your bank / PayID / Venmo
 * details next to their balance. All fields optional; stored as plain
 * per-user settings keys (payment_bank / payment_payid / payment_venmo /
 * payment_other) — never shown to anyone without one of your tab links.
 */

const FIELDS: { key: string; labelKey: string; multiline?: boolean }[] = [
  { key: 'payment_bank', labelKey: 'settings.paymentBank', multiline: true },
  { key: 'payment_payid', labelKey: 'settings.paymentPayid' },
  { key: 'payment_venmo', labelKey: 'settings.paymentVenmo' },
  { key: 'payment_other', labelKey: 'settings.paymentOther', multiline: true },
]

export default function PaymentDetailsSection(): React.ReactElement {
  const { t } = useTranslation()
  const toast = useToast()
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    settingsApi.get().then((data: { settings?: Record<string, unknown> }) => {
      const s = data?.settings || {}
      setValues(Object.fromEntries(FIELDS.map(f => [f.key, typeof s[f.key] === 'string' ? (s[f.key] as string) : ''])))
    }).catch(() => {})
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await settingsApi.setBulk(Object.fromEntries(FIELDS.map(f => [f.key, (values[f.key] || '').trim()])))
      toast.success(t('settings.paymentSaved'))
    } catch {
      toast.error(t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 focus:border-transparent'

  return (
    <Section title={t('settings.paymentDetails')} icon={HandCoins}>
      <p className="text-sm m-0 text-content-muted" style={{ lineHeight: 1.5 }}>{t('settings.paymentDetailsHint')}</p>
      {FIELDS.map(f => (
        <div key={f.key}>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">{t(f.labelKey)}</label>
          {f.multiline ? (
            <textarea rows={2} value={values[f.key] || ''} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} className={inputCls} style={{ resize: 'vertical' }} />
          ) : (
            <input type="text" value={values[f.key] || ''} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} className={inputCls} />
          )}
        </div>
      ))}
      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-edge bg-surface-card text-content-secondary disabled:opacity-50"
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-card)')}
      >
        <Save size={14} />
        {t('common.save')}
      </button>
    </Section>
  )
}
