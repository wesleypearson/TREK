import React from 'react'
import { RefreshCw } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useTranslation } from '../../i18n'

declare const __APP_VERSION__: string

/** The build baked into THIS bundle — what the device actually cached. */
export const bundleVersion: string = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'

/**
 * Page footer with the bundle version — the cache tracker. The version shown
 * is compiled into the JS a device is running, so a stale PWA cache is
 * immediately visible. When the signed-in server reports a different version,
 * a refresh chip appears (tapping it reloads past the old precache).
 */
export default function AppFooter({ public: isPublic }: { public?: boolean }) {
  const { t } = useTranslation()
  const serverVersion = useAuthStore(s => s.appVersion)
  const stale = !isPublic && !!serverVersion && bundleVersion !== 'dev' && serverVersion !== bundleVersion
  return (
    <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '18px 16px 22px', flexWrap: 'wrap' }}>
      <span className={isPublic ? 'text-[#9ca3af]' : 'text-content-faint'} style={{ fontSize: 'calc(11px * var(--fs-scale-caption, 1))', fontWeight: 600, letterSpacing: '0.04em' }}>
        Travla v{bundleVersion}
      </span>
      {stale && (
        <button onClick={() => window.location.reload()}
          className="text-white bg-[#dc2626]"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, border: 0, fontSize: 'calc(11px * var(--fs-scale-caption, 1))', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          <RefreshCw size={11} /> {t('common.staleBundle', { version: serverVersion })}
        </button>
      )}
    </footer>
  )
}
