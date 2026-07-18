import React, { useState } from 'react'
import { Info, Sparkles } from 'lucide-react'
import { useTranslation } from '../../i18n'
import Section from './Section'
import WhatsNewModal from '../shared/WhatsNewModal'

interface Props {
  appVersion: string
}

export default function AboutTab({ appVersion }: Props): React.ReactElement {
  const { t } = useTranslation()
  const [showWhatsNew, setShowWhatsNew] = useState(false)

  return (
    <Section title={t('settings.about')} icon={Info}>
      <p className="text-content-secondary" style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', lineHeight: 1.6, marginBottom: 6, marginTop: -4 }}>
        {t('settings.about.description')}
      </p>
      <p className="text-content-faint" style={{ fontSize: 'calc(12px * var(--fs-scale-body, 1))', lineHeight: 1.6, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span className="text-content-faint bg-surface-tertiary" style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 99, padding: '1px 7px', fontSize: 'calc(10px * var(--fs-scale-caption, 1))', fontWeight: 600 }}>v{appVersion}</span>
        <button
          type="button"
          onClick={() => setShowWhatsNew(true)}
          aria-haspopup="dialog"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 0, padding: 0, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--accent)', fontSize: 'calc(12px * var(--fs-scale-body, 1))', fontWeight: 700 }}
        >
          <Sparkles size={13} /> {t('updates.open')}
        </button>
      </p>
      {showWhatsNew && <WhatsNewModal isOpen onClose={() => setShowWhatsNew(false)} />}
    </Section>
  )
}
