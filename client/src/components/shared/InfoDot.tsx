import React, { useState } from 'react'
import { Info } from 'lucide-react'
import Modal from './Modal'
import { useTranslation } from '../../i18n'

/**
 * The platform's "(i)" affordance: a small round info button that opens a
 * popup explaining the feature it sits next to. Body accepts rich content;
 * plain-string bodies get standard paragraph styling. Click never bubbles,
 * so a dot can sit inside other buttons/headers safely.
 */
export default function InfoDot({ title, children, size = 15, style }: {
  title: string
  children: React.ReactNode
  /** Icon size in px (the hit target is always ≥ 26px). */
  size?: number
  style?: React.CSSProperties
}) {
  const [open, setOpen] = useState(false)
  const { t } = useTranslation()
  return (
    <>
      <button
        type="button"
        aria-label={t('common.moreInfo')}
        title={t('common.moreInfo')}
        onClick={e => { e.stopPropagation(); e.preventDefault(); setOpen(true) }}
        className="text-content-faint"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          minWidth: 26, minHeight: 26, padding: 0, margin: '-4px 0',
          background: 'none', border: 0, borderRadius: '50%', cursor: 'pointer',
          flexShrink: 0, ...style,
        }}>
        <Info size={size} />
      </button>
      {open && (
        <Modal isOpen onClose={() => setOpen(false)} title={title} size="md">
          <div className="text-content-secondary" style={{ fontSize: 'calc(13.5px * var(--fs-scale-body, 1))', lineHeight: 1.65, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {children}
          </div>
        </Modal>
      )}
    </>
  )
}
