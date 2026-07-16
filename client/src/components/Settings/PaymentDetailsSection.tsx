import React from 'react'
import { HandCoins } from 'lucide-react'
import { useTranslation } from '../../i18n'
import Section from './Section'
import PaymentDetailsForm from './PaymentDetailsForm'

/**
 * Payment details (custom): how people pay YOU back. Pulled onto every public
 * expense-tab page you share, so a visitor sees your bank / PayID / Venmo
 * details next to their balance. All fields optional; stored as plain
 * per-user settings keys — never shown to anyone without one of your tab
 * links. The form itself is shared with the Costs "add your details" prompt.
 */
export default function PaymentDetailsSection(): React.ReactElement {
  const { t } = useTranslation()
  return (
    <Section title={t('settings.paymentDetails')} icon={HandCoins}>
      <p className="text-sm m-0 text-content-muted" style={{ lineHeight: 1.5 }}>{t('settings.paymentDetailsHint')}</p>
      <PaymentDetailsForm />
    </Section>
  )
}
