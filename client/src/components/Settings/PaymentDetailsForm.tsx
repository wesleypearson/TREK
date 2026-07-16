import React, { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { useTranslation } from '../../i18n'
import { useToast } from '../shared/Toast'
import { settingsApi } from '../../api/client'

/**
 * The four payment-method fields (bank / PayID / Venmo / other) shared by the
 * Settings section and the "add your details before sharing a tab" prompt.
 * Loads and saves the per-user settings keys itself; `onSaved` lets the host
 * close a modal or refresh once the details are stored.
 */

export const PAYMENT_FIELDS: { key: string; labelKey: string; multiline?: boolean }[] = [
  { key: 'payment_bank', labelKey: 'settings.paymentBank', multiline: true },
  { key: 'payment_payid', labelKey: 'settings.paymentPayid' },
  { key: 'payment_venmo', labelKey: 'settings.paymentVenmo' },
  { key: 'payment_other', labelKey: 'settings.paymentOther', multiline: true },
]

/** True when at least one payment method is filled in. */
export function hasPaymentDetails(settings: Record<string, unknown> | undefined | null): boolean {
  if (!settings) return false
  return PAYMENT_FIELDS.some(f => typeof settings[f.key] === 'string' && (settings[f.key] as string).trim().length > 0)
}

export default function PaymentDetailsForm({ onSaved }: { onSaved?: (configured: boolean) => void }): React.ReactElement {
  const { t } = useTranslation()
  const toast = useToast()
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    settingsApi.get().then((data: { settings?: Record<string, unknown> }) => {
      const s = data?.settings || {}
      setValues(Object.fromEntries(PAYMENT_FIELDS.map(f => [f.key, typeof s[f.key] === 'string' ? (s[f.key] as string) : ''])))
    }).catch(() => {})
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const payload = Object.fromEntries(PAYMENT_FIELDS.map(f => [f.key, (values[f.key] || '').trim()]))
      await settingsApi.setBulk(payload)
      toast.success(t('settings.paymentSaved'))
      onSaved?.(Object.values(payload).some(v => v.length > 0))
    } catch {
      toast.error(t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 focus:border-transparent'

  return (
    <div className="space-y-4">
      {PAYMENT_FIELDS.map(f => (
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
    </div>
  )
}
