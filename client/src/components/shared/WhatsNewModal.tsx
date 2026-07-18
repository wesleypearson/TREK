import React, { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import Modal from './Modal'
import { updatesApi, type TravlaReleaseDto } from '../../api/client'
import { useTranslation } from '../../i18n'

interface WhatsNewModalProps {
  isOpen: boolean
  onClose: () => void
}

/** One release body: '- ' lines become a bullet list, other lines paragraphs. */
function ReleaseBody({ body }: { body: string }) {
  const lines = body.split('\n').map(l => l.trim()).filter(Boolean)
  const blocks: Array<{ type: 'list'; items: string[] } | { type: 'text'; text: string }> = []
  for (const line of lines) {
    if (line.startsWith('- ')) {
      const last = blocks[blocks.length - 1]
      if (last && last.type === 'list') last.items.push(line.slice(2))
      else blocks.push({ type: 'list', items: [line.slice(2)] })
    } else {
      blocks.push({ type: 'text', text: line })
    }
  }
  return (
    <>
      {blocks.map((block, i) =>
        block.type === 'list' ? (
          <ul key={i} className="text-content-secondary" style={{ margin: '6px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'calc(13px * var(--fs-scale-body, 1))', lineHeight: 1.55 }}>
            {block.items.map((item, j) => <li key={j}>{item}</li>)}
          </ul>
        ) : (
          <p key={i} className="text-content-secondary" style={{ margin: '6px 0 0', fontSize: 'calc(13px * var(--fs-scale-body, 1))', lineHeight: 1.55 }}>
            {block.text}
          </p>
        ),
      )}
    </>
  )
}

/**
 * "What's new" — the Travla changelog for crew and stakeholders. Fetches the
 * local release history from /api/updates (auth-only, not admin-gated) and
 * renders each release as a card, newest first (the server keeps the list
 * newest-first). Opened from the footer version stamp and Settings → About.
 */
export default function WhatsNewModal({ isOpen, onClose }: WhatsNewModalProps) {
  const { t } = useTranslation()
  const [releases, setReleases] = useState<TravlaReleaseDto[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setError(false)
    updatesApi.list()
      .then(data => { if (!cancelled) setReleases(data.releases) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [isOpen])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('updates.title')} size="lg">
      {error ? (
        <p className="text-content-secondary" style={{ margin: 0, fontSize: 'calc(13px * var(--fs-scale-body, 1))' }}>
          {t('updates.error')}
        </p>
      ) : !releases ? (
        <div role="status" style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <Loader2 className="animate-spin text-content-faint" size={22} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {releases.map(release => (
            <div key={release.tag_name} className="border border-edge-secondary bg-surface-card" style={{ borderRadius: 12, padding: '14px 16px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className="tour-sticker">{release.tag_name}</span>
                <span className="text-content" style={{ fontWeight: 700, fontSize: 'calc(14px * var(--fs-scale-body, 1))' }}>
                  {release.name}
                </span>
                <span className="text-content-faint" style={{ marginLeft: 'auto', fontSize: 'calc(11px * var(--fs-scale-caption, 1))', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {new Date(release.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
              <ReleaseBody body={release.body} />
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
