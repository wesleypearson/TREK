import React, { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useTranslation } from '../../i18n'
import WhatsNewModal from './WhatsNewModal'

declare const __APP_VERSION__: string

/** The build baked into THIS bundle — what the device actually cached. */
export const bundleVersion: string = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'

/**
 * Page footer with the bundle version — the cache tracker. The version shown
 * is compiled into the JS a device is running, so a stale PWA cache is
 * immediately visible. When the signed-in server reports a different version,
 * a refresh chip appears (tapping it reloads past the old precache).
 *
 * For signed-in users the version stamp is also a subtle button that opens the
 * "What's new" release notes modal (the /api/updates endpoint needs auth, so
 * public pages keep the plain text stamp).
 */
export default function AppFooter({ public: isPublic }: { public?: boolean }) {
  const { t } = useTranslation()
  const serverVersion = useAuthStore(s => s.appVersion)
  const [showWhatsNew, setShowWhatsNew] = useState(false)
  const stale = !isPublic && !!serverVersion && bundleVersion !== 'dev' && serverVersion !== bundleVersion
  const versionStyle: React.CSSProperties = { fontSize: 'calc(11px * var(--fs-scale-caption, 1))', fontWeight: 600, letterSpacing: '0.04em' }
  return (
    <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '18px 16px 22px', flexWrap: 'wrap' }}>
      {isPublic ? (
        <span className="text-[#9ca3af]" style={versionStyle}>
          Travla v{bundleVersion}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setShowWhatsNew(true)}
          aria-haspopup="dialog"
          title={t('updates.open')}
          className="text-content-faint"
          style={{ ...versionStyle, background: 'none', border: 0, padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Travla v{bundleVersion}
        </button>
      )}
      {stale && (
        <button onClick={() => window.location.reload()}
          className="text-white bg-[#dc2626]"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, border: 0, fontSize: 'calc(11px * var(--fs-scale-caption, 1))', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          <RefreshCw size={11} /> {t('common.staleBundle', { version: serverVersion })}
        </button>
      )}
      {!isPublic && showWhatsNew && (
        <WhatsNewModal isOpen onClose={() => setShowWhatsNew(false)} />
      )}
    </footer>
  )
}
