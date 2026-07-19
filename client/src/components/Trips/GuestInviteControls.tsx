import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Copy, Mail, Send, X } from 'lucide-react'
import { guestInviteApi, type GuestInviteFunnelEntry } from '../../api/client'
import { useToast } from '../shared/Toast'
import { useTranslation } from '../../i18n'
import { getApiErrorMessage } from '../../types'
import { captureEvent } from '../../analytics/posthog'

/**
 * Per-guest invite-link controls + funnel stage chip for TripMembersModal's
 * guest section. All invite logic lives here so the modal only mounts the
 * component. Raw links exist only in the create response — copying happens
 * immediately, nothing sensitive is kept in state longer than the session.
 */

type Stage = NonNullable<GuestInviteFunnelEntry['invite']>['stage']

const STAGE_COLORS: Record<Stage, { bg: string; fg: string }> = {
  created: { bg: 'var(--bg-tertiary)', fg: 'var(--text-muted)' },
  sent: { bg: 'rgba(59,130,246,0.12)', fg: '#2563eb' },
  opened: { bg: 'rgba(245,158,11,0.14)', fg: '#b45309' },
  registered: { bg: 'rgba(16,185,129,0.14)', fg: '#047857' },
  promoted: { bg: 'rgba(16,185,129,0.2)', fg: '#065f46' },
  revoked: { bg: 'rgba(239,68,68,0.12)', fg: '#b91c1c' },
  expired: { bg: 'rgba(239,68,68,0.08)', fg: '#991b1b' },
}

export function useGuestInviteFunnel(tripId: number, enabled: boolean) {
  const [funnel, setFunnel] = useState<Map<number, GuestInviteFunnelEntry>>(new Map())
  const [converted, setConverted] = useState<GuestInviteFunnelEntry[]>([])

  const refresh = useCallback(() => {
    if (!enabled) return
    guestInviteApi.funnel(tripId)
      .then(({ guests }) => {
        const byGuest = new Map<number, GuestInviteFunnelEntry>()
        const done: GuestInviteFunnelEntry[] = []
        for (const g of guests) {
          if (g.guest_user_id != null) byGuest.set(g.guest_user_id, g)
          else done.push(g)
        }
        setFunnel(byGuest)
        setConverted(done)
      })
      .catch(() => { /* funnel is decoration — the modal still works without it */ })
  }, [tripId, enabled])

  useEffect(() => { refresh() }, [refresh])
  return { funnel, converted, refresh }
}

function StageChip({ stage, t }: { stage: Stage; t: (k: string, p?: Record<string, string | number>) => string }) {
  const c = STAGE_COLORS[stage]
  return (
    <span style={{
      fontSize: 'calc(10px * var(--fs-scale-caption, 1))', fontWeight: 700,
      background: c.bg, color: c.fg, padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap',
    }}>
      {t(`invites.admin.stage.${stage}`)}
    </span>
  )
}

interface ControlsProps {
  tripId: number
  guestUserId: number
  hasEmail: boolean
  entry: GuestInviteFunnelEntry | undefined
  onChanged: () => void
}

export function GuestInviteControls({ tripId, guestUserId, hasEmail, entry, onChanged }: ControlsProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (copiedTimer.current) clearTimeout(copiedTimer.current) }, [])

  const invite = entry?.invite ?? null
  const stage: Stage | null = invite?.stage ?? null
  const live = stage != null && stage !== 'revoked' && stage !== 'expired' && stage !== 'registered' && stage !== 'promoted'

  const createAndCopy = useCallback(async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await guestInviteApi.create(tripId, guestUserId)
      const url = `${window.location.origin}${res.invite_path}`
      try { navigator.clipboard?.writeText(url) } catch { /* no async clipboard */ }
      setCopied(true)
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
      copiedTimer.current = setTimeout(() => setCopied(false), 1600)
      toast.success(t('invites.admin.copied'))
      captureEvent('invite_admin_link_created', { trip_id: tripId })
      onChanged()
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('invites.errors.generic')))
    } finally {
      setBusy(false)
    }
  }, [busy, tripId, guestUserId, toast, t, onChanged])

  const sendEmail = useCallback(async () => {
    if (busy) return
    setBusy(true)
    try {
      await guestInviteApi.send(tripId, guestUserId)
      toast.success(t('invites.admin.stage.sent'))
      captureEvent('invite_admin_email_sent', { trip_id: tripId, resend: (invite?.send_count ?? 0) > 0 })
      onChanged()
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 429) toast.error(t('invites.admin.cooldown'))
      else toast.error(getApiErrorMessage(err, t('invites.errors.generic')))
    } finally {
      setBusy(false)
    }
  }, [busy, tripId, guestUserId, invite, toast, t, onChanged])

  const revoke = useCallback(async () => {
    if (busy) return
    setBusy(true)
    try {
      await guestInviteApi.revoke(tripId, guestUserId)
      toast.success(t('invites.admin.revoked'))
      captureEvent('invite_admin_revoked', { trip_id: tripId })
      onChanged()
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('invites.errors.generic')))
    } finally {
      setBusy(false)
    }
  }, [busy, tripId, guestUserId, toast, t, onChanged])

  const smallBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 'calc(11px * var(--fs-scale-caption, 1))', fontWeight: 600,
    padding: '3px 8px', borderRadius: 7, border: '1px solid var(--border-color, #e5e7eb)',
    background: 'var(--bg-primary, transparent)', color: 'var(--text-secondary)',
    cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
  }

  const fmtDate = (d: string | null) => {
    if (!d) return ''
    try { return new Date(d).toLocaleDateString() } catch { return d }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', margin: '4px 0 2px 42px' }}>
      {stage && <StageChip stage={stage} t={t} />}
      {live && invite?.expires_at && (
        <span className="text-content-faint" style={{ fontSize: 'calc(10px * var(--fs-scale-caption, 1))' }}>
          {t('invites.admin.expires', { date: fmtDate(invite.expires_at) })}
        </span>
      )}
      {stage !== 'registered' && stage !== 'promoted' && (
        <>
          <button style={smallBtn} onClick={createAndCopy} disabled={busy} title={live ? t('invites.admin.regenerate') : t('invites.admin.generate')}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {live ? t('invites.admin.regenerate') : t('invites.admin.generate')}
          </button>
          <button
            style={{ ...smallBtn, ...(hasEmail ? {} : { opacity: 0.45, cursor: 'default' }) }}
            onClick={hasEmail ? sendEmail : undefined}
            disabled={busy || !hasEmail}
            title={hasEmail ? t('invites.admin.sendEmail') : t('invites.admin.noEmail')}
          >
            <Send size={12} />
            {(invite?.send_count ?? 0) > 0 ? t('invites.admin.resend') : t('invites.admin.sendEmail')}
          </button>
          {live && (
            <button style={{ ...smallBtn, color: '#b91c1c' }} onClick={revoke} disabled={busy} title={t('invites.admin.revoke')}>
              <X size={12} />
              {t('invites.admin.revoke')}
            </button>
          )}
        </>
      )}
    </div>
  )
}

export function BulkInviteButton({ tripId, onDone }: { tripId: number; onDone: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const run = useCallback(async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await guestInviteApi.sendAll(tripId)
      const skipped = res.skipped_no_email + res.skipped_cooldown + res.skipped_capped
      toast.success(t('invites.admin.bulkResult', { sent: res.sent, skipped }))
      captureEvent('invite_admin_bulk_send', { trip_id: tripId, count: res.sent })
      onDone()
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('invites.errors.generic')))
    } finally {
      setBusy(false)
    }
  }, [busy, tripId, toast, t, onDone])

  return (
    <button
      onClick={run}
      disabled={busy}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 'auto',
        fontSize: 'calc(11px * var(--fs-scale-caption, 1))', fontWeight: 700,
        padding: '4px 10px', borderRadius: 8, border: 'none',
        background: 'var(--accent, #e0197d)', color: '#fff',
        cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1,
      }}
    >
      <Mail size={12} />
      {t('invites.admin.bulkSend')}
    </button>
  )
}

/** Converted (promoted/registered) funnel entries — the guest row is gone, the win lives on. */
export function ConvertedInviteRows({ entries }: { entries: GuestInviteFunnelEntry[] }) {
  const { t } = useTranslation()
  if (entries.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
      {entries.map(e => (
        <div key={e.invite?.id ?? e.guest_name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="text-content-faint" style={{ fontSize: 'calc(12px * var(--fs-scale-caption, 1))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {e.guest_name}
          </span>
          {e.invite && <StageChip stage={e.invite.stage} t={t} />}
        </div>
      ))}
    </div>
  )
}
