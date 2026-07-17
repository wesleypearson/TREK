import React from 'react'
import { Plus, Users, Camera, Lock, MapPin, Link2, Check, UserPlus, Eye } from 'lucide-react'
import Modal from '../shared/Modal'
import { useTranslation } from '../../i18n'

/**
 * The in-app expenses guide: how lodging, splitting, scanning, venues, tabs,
 * settling and guests work — and, importantly, how each of them LOOKS to the
 * rest of the crew (visibility is the part people ask about).
 */
const SECTIONS = [
  { Icon: Plus, color: '#0ea5e9', titleKey: 'costs.guide.lodgeTitle', bodyKey: 'costs.guide.lodgeBody' },
  { Icon: Users, color: '#8b5cf6', titleKey: 'costs.guide.splitTitle', bodyKey: 'costs.guide.splitBody' },
  { Icon: Camera, color: '#f59e0b', titleKey: 'costs.guide.scanTitle', bodyKey: 'costs.guide.scanBody' },
  { Icon: Lock, color: '#64748b', titleKey: 'costs.guide.personalTitle', bodyKey: 'costs.guide.personalBody' },
  { Icon: MapPin, color: '#10b981', titleKey: 'costs.guide.venuesTitle', bodyKey: 'costs.guide.venuesBody' },
  { Icon: Link2, color: '#ec4899', titleKey: 'costs.guide.tabsTitle', bodyKey: 'costs.guide.tabsBody' },
  { Icon: Check, color: '#16a34a', titleKey: 'costs.guide.settleTitle', bodyKey: 'costs.guide.settleBody' },
  { Icon: UserPlus, color: '#f97316', titleKey: 'costs.guide.guestsTitle', bodyKey: 'costs.guide.guestsBody' },
  { Icon: Eye, color: '#3b82f6', titleKey: 'costs.guide.viewsTitle', bodyKey: 'costs.guide.viewsBody' },
] as const

export default function ExpensesGuideModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <Modal isOpen onClose={onClose} title={t('costs.guide.title')} size="xl">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p className="text-content-secondary" style={{ margin: 0, fontSize: 'calc(13.5px * var(--fs-scale-body, 1))', lineHeight: 1.6 }}>
          {t('costs.guide.intro')}
        </p>
        {SECTIONS.map(({ Icon, color, titleKey, bodyKey }) => (
          <div key={titleKey} style={{ display: 'grid', gridTemplateColumns: '38px 1fr', gap: 12, alignItems: 'start' }}>
            <span style={{ width: 38, height: 38, borderRadius: 11, display: 'grid', placeItems: 'center', background: color + '22', color }}>
              <Icon size={18} />
            </span>
            <div>
              <div className="text-content" style={{ fontSize: 'calc(13.5px * var(--fs-scale-body, 1))', fontWeight: 700, marginBottom: 3 }}>
                {t(titleKey)}
              </div>
              <div className="text-content-secondary" style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', lineHeight: 1.6 }}>
                {t(bodyKey)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
