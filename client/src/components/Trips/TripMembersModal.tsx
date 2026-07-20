import { useState, useEffect, useRef, type ReactNode, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../shared/Modal'
import InfoDot from '../shared/InfoDot'
import { tripsApi, authApi, shareApi, tripInviteApi } from '../../api/client'
import { useToast } from '../shared/Toast'
import { useAuthStore } from '../../store/authStore'
import { useCanDo } from '../../store/permissionsStore'
import { useTripStore } from '../../store/tripStore'
import { Crown, UserMinus, UserPlus, UserCheck, Users, LogOut, Link2, Trash2, Copy, Check, UserRound, Pencil, Plus, Mail } from 'lucide-react'
import { useTranslation } from '../../i18n'
import { getApiErrorMessage } from '../../types'
import CustomSelect from '../shared/CustomSelect'
import { GuestInviteControls, BulkInviteButton, ConvertedInviteRows, useGuestInviteFunnel } from './GuestInviteControls'

interface AvatarProps {
  username: string
  avatarUrl: string | null
  size?: number
}

function Avatar({ username, avatarUrl, size = 32 }: AvatarProps) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  }
  const letter = (username || '?')[0].toUpperCase()
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']
  const color = colors[letter.charCodeAt(0) % colors.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, color: 'white', flexShrink: 0,
    }}>
      {letter}
    </div>
  )
}

function ShareLinkSection({ tripId, t }: { tripId: number; t: (key: string, params?: Record<string, string | number>) => string }) {
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [perms, setPerms] = useState({ share_map: true, share_bookings: true, share_packing: false, share_budget: false, share_collab: false })
  const toast = useToast()
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current) }
  }, [])

  useEffect(() => {
    shareApi.getLink(tripId).then(d => {
      setShareToken(d.token)
      if (d.token) setPerms({ share_map: d.share_map ?? true, share_bookings: d.share_bookings ?? true, share_packing: d.share_packing ?? false, share_budget: d.share_budget ?? false, share_collab: d.share_collab ?? false })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [tripId])

  const shareUrl = shareToken ? `${window.location.origin}/shared/${shareToken}` : null

  const handleCreate = async () => {
    try {
      const d = await shareApi.createLink(tripId, perms)
      setShareToken(d.token)
    } catch { toast.error(t('share.createError')) }
  }

  const handleUpdatePerms = async (key: string, val: boolean) => {
    const newPerms = { ...perms, [key]: val }
    setPerms(newPerms)
    if (shareToken) {
      try { await shareApi.createLink(tripId, newPerms) } catch { toast.error(t('share.createError')) }
    }
  }

  const handleDelete = async () => {
    try {
      await shareApi.deleteLink(tripId)
      setShareToken(null)
    } catch { toast.error(t('common.error')) }
  }

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) return null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Link2 size={14} className="text-content-muted" />
        <span className="text-content" style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 600 }}>{t('share.linkTitle')}</span>
      </div>
      <p className="text-content-faint" style={{ fontSize: 'calc(11px * var(--fs-scale-caption, 1))', marginBottom: 10, lineHeight: 1.5 }}>{t('share.linkHint')}</p>

      {/* Permission checkboxes */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {[
          { key: 'share_map', label: t('share.permMap'), always: true },
          { key: 'share_bookings', label: t('share.permBookings') },
          { key: 'share_packing', label: t('share.permPacking') },
          { key: 'share_budget', label: t('share.permBudget') },
          { key: 'share_collab', label: t('share.permCollab') },
        ].map(opt => (
          <button key={opt.key} onClick={() => !opt.always && handleUpdatePerms(opt.key, !perms[opt.key])}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20,
              border: '1.5px solid', fontSize: 'calc(11px * var(--fs-scale-caption, 1))', fontWeight: 500, cursor: opt.always ? 'default' : 'pointer',
              fontFamily: 'inherit', transition: 'all 0.12s',
              background: perms[opt.key] ? 'var(--text-primary)' : 'transparent',
              borderColor: perms[opt.key] ? 'var(--text-primary)' : 'var(--border-primary)',
              color: perms[opt.key] ? 'var(--bg-primary)' : 'var(--text-muted)',
              opacity: opt.always ? 0.7 : 1,
            }}>
            {perms[opt.key] ? <Check size={10} /> : null}
            {opt.label}
          </button>
        ))}
      </div>

      {shareUrl ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="bg-surface-tertiary border border-edge-faint" style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px',
            borderRadius: 8,
          }}>
            <input type="text" value={shareUrl} readOnly className="text-content" style={{
              flex: 1, border: 'none', background: 'none', fontSize: 'calc(11px * var(--fs-scale-caption, 1))',
              outline: 'none', fontFamily: 'monospace',
            }} />
            <button onClick={handleCopy} style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6,
              border: 'none', background: copied ? '#16a34a' : 'var(--accent)', color: copied ? 'white' : 'var(--accent-text)',
              fontSize: 'calc(10px * var(--fs-scale-caption, 1))', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.2s',
            }}>
              {copied ? <><Check size={10} /> {t('common.copied')}</> : <><Copy size={10} /> {t('common.copy')}</>}
            </button>
          </div>
          <button onClick={handleDelete} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            padding: '6px 0', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)',
            background: 'rgba(239,68,68,0.06)', color: '#ef4444', fontSize: 'calc(11px * var(--fs-scale-caption, 1))', fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <Trash2 size={11} /> {t('share.deleteLink')}
          </button>
        </div>
      ) : (
        <button onClick={handleCreate} className="border border-dashed border-edge text-content-muted" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          width: '100%', padding: '8px 0', borderRadius: 8,
          background: 'none', fontSize: 'calc(12px * var(--fs-scale-body, 1))', fontWeight: 500,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <Link2 size={12} /> {t('share.createLink')}
        </button>
      )}
    </div>
  )
}

/**
 * Trip invite link (#1143). One rotating token per trip that an existing,
 * logged-in user opens to join the trip as a member. Mirrors ShareLinkSection
 * but the link points at /join/:token (login-required, no registration).
 */
function TripInviteLinkSection({ tripId, t }: { tripId: number; t: (key: string, params?: Record<string, string | number>) => string }) {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const toast = useToast()
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current) }, [])

  useEffect(() => {
    tripInviteApi.getLink(tripId)
      .then((d: { token: string | null }) => setToken(d.token))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tripId])

  const inviteUrl = token ? `${window.location.origin}/join/${token}` : null

  const create = async () => {
    setBusy(true)
    try { const d = await tripInviteApi.createLink(tripId); setToken(d.token) }
    catch { toast.error(t('share.createError')) }
    finally { setBusy(false) }
  }

  const remove = async () => {
    setBusy(true)
    try { await tripInviteApi.deleteLink(tripId); setToken(null) }
    catch { toast.error(t('common.error')) }
    finally { setBusy(false) }
  }

  const copy = () => {
    if (!inviteUrl) return
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return null

  return (
    <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border-faint)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <UserPlus size={14} className="text-content-muted" />
        <span className="text-content" style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 600 }}>{t('trip.invite.linkTitle')}</span>
      </div>
      <p className="text-content-faint" style={{ fontSize: 'calc(11px * var(--fs-scale-caption, 1))', marginBottom: 12, lineHeight: 1.5 }}>{t('trip.invite.linkHint')}</p>

      {inviteUrl ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="bg-surface-tertiary border border-edge-faint" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderRadius: 8 }}>
            <input type="text" value={inviteUrl} readOnly className="text-content" style={{ flex: 1, border: 'none', background: 'none', fontSize: 'calc(11px * var(--fs-scale-caption, 1))', outline: 'none', fontFamily: 'monospace' }} />
            <button onClick={copy} style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6,
              border: 'none', background: copied ? '#16a34a' : 'var(--accent)', color: copied ? 'white' : 'var(--accent-text)',
              fontSize: 'calc(10px * var(--fs-scale-caption, 1))', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.2s',
            }}>
              {copied ? <><Check size={10} /> {t('common.copied')}</> : <><Copy size={10} /> {t('common.copy')}</>}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={create} disabled={busy} className="border border-edge text-content-muted" style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              padding: '6px 0', borderRadius: 8, background: 'none', fontSize: 'calc(11px * var(--fs-scale-caption, 1))', fontWeight: 500,
              cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit',
            }}>
              <Link2 size={11} /> {t('trip.invite.regenerate')}
            </button>
            <button onClick={remove} disabled={busy} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              padding: '6px 0', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)',
              background: 'rgba(239,68,68,0.06)', color: '#ef4444', fontSize: 'calc(11px * var(--fs-scale-caption, 1))', fontWeight: 500,
              cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit',
            }}>
              <Trash2 size={11} /> {t('trip.invite.disable')}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={create} disabled={busy} className="border border-dashed border-edge text-content-muted" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          width: '100%', padding: '8px 0', borderRadius: 8,
          background: 'none', fontSize: 'calc(12px * var(--fs-scale-body, 1))', fontWeight: 500,
          cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit',
        }}>
          <UserPlus size={12} /> {t('trip.invite.create')}
        </button>
      )}
    </div>
  )
}

// ── Crew admin building blocks ─────────────────────────────────────────────

/** 34×34 round icon action button used on crew/guest rows. */
function IconBtn({ title, onClick, disabled = false, color = 'var(--text-faint)', hoverColor = 'var(--text-secondary)', children }: {
  title: string
  onClick: () => void
  disabled?: boolean
  color?: string
  hoverColor?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 34, height: 34, flexShrink: 0, padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'none', border: 'none', borderRadius: '50%',
        cursor: disabled ? 'default' : 'pointer', color,
        opacity: disabled ? 0.4 : 1, transition: 'background 0.12s, color 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = hoverColor; e.currentTarget.style.background = 'var(--bg-tertiary)' }}
      onMouseLeave={e => { e.currentTarget.style.color = color; e.currentTarget.style.background = 'transparent' }}
    >
      {children}
    </button>
  )
}

interface MemberEntry {
  id: number
  username: string
  avatar_url?: string | null
  role?: string
  is_guest?: boolean
  added_at?: string | null
  invited_by_username?: string | null
  /** Guests only: where integrity updates reach off-platform guests. */
  contact_email?: string | null
}

interface MembersData {
  owner: MemberEntry
  members: MemberEntry[]
}

interface DirectoryUser {
  id: number
  username: string
  is_guest?: boolean
}

/** Pending confirm-dialog action (replaces the old window.confirm calls). */
type ConfirmAction =
  | { kind: 'removeMember'; member: MemberEntry }
  | { kind: 'leave'; member: MemberEntry }
  | { kind: 'transfer'; member: MemberEntry }
  | { kind: 'deleteGuest'; guest: MemberEntry }

const footerBtnBase: CSSProperties = {
  padding: '9px 18px', borderRadius: 10,
  fontSize: 'calc(13.5px * var(--fs-scale-body, 1))', fontWeight: 600,
  fontFamily: 'inherit', cursor: 'pointer',
}

/** SQLite timestamps come as "YYYY-MM-DD HH:MM:SS" — normalise before parsing. */
function formatAddedDate(raw?: string | null): string | null {
  if (!raw) return null
  const d = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'))
  return isNaN(d.getTime()) ? null : d.toLocaleDateString()
}

interface TripMembersModalProps {
  isOpen: boolean
  onClose: () => void
  tripId: number
  tripTitle: string
  /** Called after the roster changes (guest/member added, renamed or removed) so the
   *  planner can refresh its members for Costs participants, Collab, etc. */
  onMembersChanged?: () => void
}

export default function TripMembersModal({ isOpen, onClose, tripId, tripTitle, onMembersChanged }: TripMembersModalProps) {
  const [data, setData] = useState<MembersData | null>(null)
  const [allUsers, setAllUsers] = useState<DirectoryUser[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [transferringId, setTransferringId] = useState<number | null>(null)
  const [newGuestName, setNewGuestName] = useState('')
  const [addingGuest, setAddingGuest] = useState(false)
  const [renamingGuestId, setRenamingGuestId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  // Guest contact email inline edit (mirrors the rename pattern)
  const [emailEditingGuestId, setEmailEditingGuestId] = useState<number | null>(null)
  const [emailValue, setEmailValue] = useState('')
  // Confirm dialogs (remove/leave/transfer/delete-guest) + guest promotion
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [promoteTarget, setPromoteTarget] = useState<MemberEntry | null>(null)
  const [promoteUserId, setPromoteUserId] = useState('')
  const [promoting, setPromoting] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { t } = useTranslation()
  const can = useCanDo()
  const trip = useTripStore((s) => s.trip)
  // Prefer the modal's own loaded data for the owner context — the store trip
  // may be unset when the modal is opened outside the planner.
  const permTrip = data?.owner ? { owner_id: data.owner.id } : trip
  const canManageMembers = can('member_manage', permTrip)
  const canManageShare = can('share_manage', trip)
  // Guest invite funnel (one fetch per open, manage-capable users only)
  const { funnel: inviteFunnel, converted: convertedInvites, refresh: refreshInvites } = useGuestInviteFunnel(tripId, isOpen && canManageMembers)

  useEffect(() => {
    if (isOpen && tripId) {
      loadMembers()
      loadAllUsers()
    }
  }, [isOpen, tripId])

  const loadMembers = async (notify = false) => {
    setLoading(true)
    try {
      const d = await tripsApi.getMembers(tripId)
      setData(d)
      // Notify the planner to re-sync (Costs participants etc.) only after an actual
      // roster mutation — not on the initial open load, which would be a redundant fetch.
      if (notify) onMembersChanged?.()
    } catch {
      toast.error(t('members.loadError'))
    } finally {
      setLoading(false)
    }
  }

  const loadAllUsers = async () => {
    try {
      const d = await authApi.listUsers()
      setAllUsers(d.users)
    } catch {}
  }

  const handleAdd = async () => {
    if (!selectedUserId) return
    const target = allUsers.find(u => String(u.id) === String(selectedUserId))
    if (!target) return
    setAdding(true)
    try {
      await tripsApi.addMember(tripId, target.username)
      setSelectedUserId('')
      await loadMembers(true)
      toast.success(`${target.username} ${t('members.added')}`)
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('members.addError')))
    } finally {
      setAdding(false)
    }
  }

  const doTransfer = async (newOwnerId: number) => {
    setTransferringId(newOwnerId)
    try {
      await tripsApi.transferOwnership(tripId, newOwnerId)
      // The current user just dropped from owner to member — reload so the trip
      // state and permissions everywhere reflect the new ownership.
      onClose()
      window.location.reload()
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('members.transferError')))
      setTransferringId(null)
    }
  }

  const handleAddGuest = async () => {
    const name = newGuestName.trim()
    if (!name) return
    setAddingGuest(true)
    try {
      await tripsApi.createGuest(tripId, name)
      setNewGuestName('')
      await loadMembers(true)
      toast.success(t('members.guestAdded'))
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('members.guestAddError')))
    } finally {
      setAddingGuest(false)
    }
  }

  const handleRenameGuest = async (userId: number) => {
    const name = renameValue.trim()
    if (!name) { setRenamingGuestId(null); return }
    try {
      await tripsApi.renameGuest(tripId, userId, name)
      setRenamingGuestId(null)
      await loadMembers(true)
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('members.guestRenameError')))
    }
  }

  const handleSaveGuestEmail = async (guest: MemberEntry) => {
    const email = emailValue.trim()
    // No change (including still-empty) → just close the editor, no request.
    if (email === (guest.contact_email ?? '')) { setEmailEditingGuestId(null); return }
    try {
      // The rename PUT carries the address; '' clears it. Name is re-sent unchanged.
      await tripsApi.renameGuest(tripId, guest.id, guest.username, email)
      setEmailEditingGuestId(null)
      await loadMembers(true)
      toast.success(t('members.guestEmailSaved'))
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('members.guestEmailInvalid')))
    }
  }

  const doDeleteGuest = async (userId: number) => {
    setRemovingId(userId)
    try {
      await tripsApi.deleteGuest(tripId, userId)
      await loadMembers(true)
      toast.success(t('members.guestRemoved'))
    } catch {
      toast.error(t('members.removeError'))
    } finally {
      setRemovingId(null)
    }
  }

  const doRemoveMember = async (userId: number, isSelf: boolean) => {
    setRemovingId(userId)
    try {
      await tripsApi.removeMember(tripId, userId)
      if (isSelf) {
        // Leaving strips this user's access — head home instead of reloading in place.
        onClose()
        navigate('/')
      } else {
        await loadMembers(true)
        toast.success(t('members.removed'))
      }
    } catch {
      toast.error(t('members.removeError'))
    } finally {
      setRemovingId(null)
    }
  }

  const runConfirmAction = async () => {
    if (!confirmAction) return
    const action = confirmAction
    setConfirmAction(null)
    if (action.kind === 'removeMember') await doRemoveMember(action.member.id, false)
    else if (action.kind === 'leave') await doRemoveMember(action.member.id, true)
    else if (action.kind === 'transfer') await doTransfer(action.member.id)
    else await doDeleteGuest(action.guest.id)
  }

  const closePromote = () => { setPromoteTarget(null); setPromoteUserId('') }

  const handlePromote = async () => {
    if (!promoteTarget || !promoteUserId) return
    setPromoting(true)
    try {
      await tripsApi.promoteGuest(tripId, promoteTarget.id, Number(promoteUserId))
      toast.success(t('members.promoteDone'))
      closePromote()
      await loadMembers(true)
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('members.promoteError')))
    } finally {
      setPromoting(false)
    }
  }

  // Users not yet in the trip (guests are accountless and never live in the directory)
  const existingIds = new Set([
    data?.owner?.id,
    ...(data?.members?.map(m => m.id) || []),
  ])
  const availableUsers = allUsers.filter(u => !existingIds.has(u.id) && !u.is_guest)
  // Promotion targets: any full account — promoting onto an existing crew member
  // is valid (their guest history merges into that member).
  const promoteCandidates = allUsers.filter(u => !u.is_guest)

  const isCurrentOwner = data?.owner?.id === user?.id
  // Real members (owner + accounts) and guests (#1362) are listed separately.
  const realMembers: MemberEntry[] = data ? [
    { ...data.owner, role: 'owner' },
    ...data.members.filter(m => !m.is_guest),
  ] : []
  const guests = data ? data.members.filter(m => m.is_guest) : []

  const confirmCopy = confirmAction && ({
    removeMember: {
      title: t('members.removeMemberTitle'),
      body: t('members.removeMemberBody', { name: (confirmAction as { member?: MemberEntry }).member?.username ?? '' }),
      confirm: t('members.removeConfirm'),
      destructive: true,
    },
    leave: {
      title: t('members.leaveTitle'),
      body: t('members.leaveBody'),
      confirm: t('members.leaveConfirm'),
      destructive: true,
    },
    transfer: {
      title: t('members.transferTitle'),
      body: t('members.confirmTransfer', { name: (confirmAction as { member?: MemberEntry }).member?.username ?? '' }),
      confirm: t('members.transferConfirm'),
      destructive: false,
    },
    deleteGuest: {
      title: t('members.deleteGuestTitle'),
      body: t('members.deleteGuestBody', { name: (confirmAction as { guest?: MemberEntry }).guest?.username ?? '' }),
      confirm: t('members.deleteGuestConfirm'),
      destructive: true,
    },
  })[confirmAction.kind]

  const sectionCardStyle: CSSProperties = { borderRadius: 12, padding: '14px 14px 16px' }
  const sectionTitleStyle: CSSProperties = { fontSize: 'calc(13.5px * var(--fs-scale-body, 1))', fontWeight: 700 }
  const sectionCountStyle: CSSProperties = { fontSize: 'calc(12px * var(--fs-scale-caption, 1))', fontWeight: 600 }
  const rowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10 }

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title={t('members.shareTrip')} size="3xl">
      <div style={{ display: 'grid', gridTemplateColumns: canManageShare ? '1fr 1fr' : '1fr', gap: 24, fontFamily: "var(--font-system)" }} className="share-modal-grid">
        <style>{`@media (max-width: 640px) { .share-modal-grid { grid-template-columns: 1fr !important; } }`}</style>

        {/* Left column: crew + guests admin */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Trip name */}
        <div className="bg-surface-secondary border border-edge-secondary" style={{ padding: '10px 14px', borderRadius: 10 }}>
          <div className="text-content-faint" style={{ fontSize: 'calc(11px * var(--fs-scale-caption, 1))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{t('nav.trip')}</div>
          <div className="text-content" style={{ fontSize: 'calc(14px * var(--fs-scale-body, 1))', fontWeight: 600 }}>{tripTitle}</div>
        </div>

        {/* Crew section */}
        <section className="border border-edge-secondary" style={sectionCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
            <Users size={15} className="text-content-muted" />
            <span className="text-content" style={sectionTitleStyle}>{t('members.crewSection')}</span>
            <span className="text-content-faint" style={sectionCountStyle}>
              {realMembers.length} {realMembers.length === 1 ? t('members.person') : t('members.persons')}
            </span>
            <InfoDot title={t('members.crewInfoTitle')} size={14}><p style={{ margin: 0 }}>{t('members.crewInfoBody')}</p></InfoDot>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2].map(i => (
                <div key={i} className="bg-surface-tertiary" style={{ height: 52, borderRadius: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {realMembers.map(member => {
                const isSelf = member.id === user?.id
                const canRemove = isSelf || (canManageMembers && member.role !== 'owner')
                const addedDate = formatAddedDate(member.added_at)
                const addedMeta = addedDate
                  ? (member.invited_by_username
                      ? t('members.addedMetaBy', { date: addedDate, name: member.invited_by_username })
                      : t('members.addedMeta', { date: addedDate }))
                  : null
                return (
                  <div key={member.id} className="bg-surface-secondary" style={rowStyle}>
                    <Avatar username={member.username} avatarUrl={member.avatar_url ?? null} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span className="text-content" style={{ fontSize: 'calc(13.5px * var(--fs-scale-body, 1))', fontWeight: 600 }}>{member.username}</span>
                        {isSelf && <span className="text-content-faint" style={{ fontSize: 'calc(10px * var(--fs-scale-caption, 1))' }}>({t('members.you')})</span>}
                        {member.role === 'owner' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 'calc(10px * var(--fs-scale-caption, 1))', fontWeight: 700, color: '#d97706', background: '#fef9c3', padding: '1px 6px', borderRadius: 99 }}>
                            <Crown size={9} /> {t('members.owner')}
                          </span>
                        )}
                      </div>
                      {addedMeta && (
                        <div className="text-content-faint" style={{ fontSize: 'calc(11px * var(--fs-scale-caption, 1))', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {addedMeta}
                        </div>
                      )}
                    </div>
                    {isCurrentOwner && member.role !== 'owner' && (
                      <IconBtn
                        title={t('members.makeOwner')}
                        onClick={() => setConfirmAction({ kind: 'transfer', member })}
                        disabled={transferringId === member.id}
                        hoverColor="#d97706"
                      >
                        <Crown size={16} />
                      </IconBtn>
                    )}
                    {canRemove && (
                      <IconBtn
                        title={isSelf ? t('members.leaveTrip') : t('members.removeAccess')}
                        onClick={() => setConfirmAction(isSelf ? { kind: 'leave', member } : { kind: 'removeMember', member })}
                        disabled={removingId === member.id}
                        hoverColor="#ef4444"
                      >
                        {isSelf ? <LogOut size={16} /> : <UserMinus size={16} />}
                      </IconBtn>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Add member dropdown */}
          {canManageMembers && <div style={{ marginTop: 12 }}>
            <label className="text-content-secondary" style={{ display: 'block', fontSize: 'calc(12px * var(--fs-scale-body, 1))', fontWeight: 600, marginBottom: 8 }}>
              {t('members.inviteUser')}
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <CustomSelect
                value={selectedUserId}
                onChange={value => setSelectedUserId(String(value))}
                placeholder={t('members.selectUser')}
                options={[
                  { value: '', label: t('members.selectUser') },
                  ...availableUsers.map(u => ({
                    value: u.id,
                    label: u.username,
                  })),
                ]}
                searchable
                style={{ flex: 1 }}
                size="sm"
              />
              <button
                onClick={handleAdd}
                disabled={adding || !selectedUserId}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px',
                  background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: 10,
                  fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 600, cursor: adding || !selectedUserId ? 'default' : 'pointer',
                  fontFamily: 'inherit', opacity: adding || !selectedUserId ? 0.4 : 1, flexShrink: 0,
                }}
              >
                <UserPlus size={13} /> {adding ? '…' : t('members.invite')}
              </button>
            </div>
            {availableUsers.length === 0 && allUsers.length > 0 && (
              <p className="text-content-faint" style={{ fontSize: 'calc(11.5px * var(--fs-scale-caption, 1))', margin: '6px 0 0' }}>{t('members.allHaveAccess')}</p>
            )}
          </div>}
        </section>

        {/* Guests (#1362) — accountless participants, managed via member_manage */}
        {(canManageMembers || guests.length > 0) && (
        <section className="border border-edge-secondary" style={sectionCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
            <UserRound size={15} className="text-content-muted" />
            <span className="text-content" style={sectionTitleStyle}>{t('members.guests')}</span>
            <span className="text-content-faint" style={sectionCountStyle}>{guests.length}</span>
            <InfoDot title={t('members.guestInfoTitle')} size={14}><p style={{ margin: 0 }}>{t('members.guestInfoBody')}</p></InfoDot>
            {canManageMembers && guests.some(g => g.contact_email) && (
              <BulkInviteButton tripId={tripId} onDone={refreshInvites} />
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {guests.map(g => (
              <div key={g.id}>
              <div className="bg-surface-secondary" style={rowStyle}>
                <Avatar username={g.username} avatarUrl={null} size={34} />
                {renamingGuestId === g.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRenameGuest(g.id); if (e.key === 'Escape') setRenamingGuestId(null) }}
                    onBlur={() => handleRenameGuest(g.id)}
                    maxLength={50}
                    className="bg-surface border border-edge text-content"
                    style={{ flex: 1, minWidth: 0, fontSize: 'calc(13.5px * var(--fs-scale-body, 1))', padding: '4px 8px', borderRadius: 8, outline: 'none', fontFamily: 'inherit' }}
                  />
                ) : emailEditingGuestId === g.id ? (
                  /* Inline contact-email edit — Enter/blur saves, Escape cancels (like rename). '' clears. */
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input
                      autoFocus
                      type="email"
                      value={emailValue}
                      onChange={e => setEmailValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveGuestEmail(g); if (e.key === 'Escape') setEmailEditingGuestId(null) }}
                      onBlur={() => handleSaveGuestEmail(g)}
                      maxLength={254}
                      placeholder={t('members.guestEmailPlaceholder')}
                      className="bg-surface border border-edge text-content"
                      style={{ width: '100%', fontSize: 'calc(13.5px * var(--fs-scale-body, 1))', padding: '4px 8px', borderRadius: 8, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                    <div className="text-content-faint" style={{ fontSize: 'calc(10.5px * var(--fs-scale-caption, 1))', marginTop: 3 }}>
                      {t('members.guestEmailHint')}
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span className="text-content" style={{ fontSize: 'calc(13.5px * var(--fs-scale-body, 1))', fontWeight: 600 }}>{g.username}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 'calc(10px * var(--fs-scale-caption, 1))', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '1px 6px', borderRadius: 99 }}>
                        <UserRound size={9} /> {t('members.guest')}
                      </span>
                    </div>
                    {g.contact_email && (
                      <div className="text-content-faint" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'calc(11px * var(--fs-scale-caption, 1))', marginTop: 1, minWidth: 0 }}>
                        <Mail size={10} style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.contact_email}</span>
                      </div>
                    )}
                  </div>
                )}
                {canManageMembers && renamingGuestId !== g.id && emailEditingGuestId !== g.id && (
                  <>
                    <IconBtn
                      title={t('common.rename')}
                      onClick={() => { setRenamingGuestId(g.id); setRenameValue(g.username) }}
                    >
                      <Pencil size={15} />
                    </IconBtn>
                    <IconBtn
                      title={t('members.guestEmail')}
                      onClick={() => { setEmailEditingGuestId(g.id); setEmailValue(g.contact_email ?? '') }}
                    >
                      <Mail size={15} />
                    </IconBtn>
                    <IconBtn
                      title={t('members.promote')}
                      onClick={() => { setPromoteTarget(g); setPromoteUserId('') }}
                      hoverColor="#16a34a"
                    >
                      <UserCheck size={16} />
                    </IconBtn>
                    <IconBtn
                      title={t('members.removeAccess')}
                      onClick={() => setConfirmAction({ kind: 'deleteGuest', guest: g })}
                      disabled={removingId === g.id}
                      color="#dc2626"
                      hoverColor="#b91c1c"
                    >
                      <Trash2 size={16} />
                    </IconBtn>
                  </>
                )}
              </div>
              {canManageMembers && (
                <GuestInviteControls
                  tripId={tripId}
                  guestUserId={g.id}
                  hasEmail={!!g.contact_email}
                  entry={inviteFunnel.get(g.id)}
                  onChanged={refreshInvites}
                />
              )}
              </div>
            ))}
          </div>
          {canManageMembers && <ConvertedInviteRows entries={convertedInvites} />}

          {canManageMembers && (
            <div style={{ display: 'flex', gap: 8, marginTop: guests.length > 0 ? 10 : 0 }}>
              <input
                value={newGuestName}
                onChange={e => setNewGuestName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddGuest() }}
                placeholder={t('members.guestNamePlaceholder')}
                maxLength={50}
                className="bg-surface border border-edge text-content"
                style={{ flex: 1, minWidth: 0, fontSize: 'calc(13.5px * var(--fs-scale-body, 1))', padding: '8px 10px', borderRadius: 10, outline: 'none', fontFamily: 'inherit' }}
              />
              <button
                onClick={handleAddGuest}
                disabled={addingGuest || !newGuestName.trim()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px',
                  background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: 10,
                  fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 600, cursor: addingGuest || !newGuestName.trim() ? 'default' : 'pointer',
                  fontFamily: 'inherit', opacity: addingGuest || !newGuestName.trim() ? 0.4 : 1, flexShrink: 0,
                }}
              >
                <Plus size={13} /> {addingGuest ? '…' : t('members.addGuest')}
              </button>
            </div>
          )}
        </section>
        )}

        </div>

        {/* Right column: Share Link */}
        {canManageShare && <div className="border-l border-edge-faint" style={{ paddingLeft: 24 }}>
        <ShareLinkSection tripId={tripId} t={t} />
        <TripInviteLinkSection tripId={tripId} t={t} />
        </div>}

        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
      </div>
    </Modal>

    {/* Confirm dialog — replaces the old window.confirm calls */}
    {isOpen && confirmAction && confirmCopy && (
      <Modal
        isOpen
        onClose={() => setConfirmAction(null)}
        title={confirmCopy.title}
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              onClick={() => setConfirmAction(null)}
              className="text-content-secondary border border-edge-secondary"
              style={{ ...footerBtnBase, background: 'none' }}
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={runConfirmAction}
              style={{
                ...footerBtnBase, border: 'none',
                background: confirmCopy.destructive ? '#dc2626' : 'var(--accent)',
                color: confirmCopy.destructive ? 'white' : 'var(--accent-text)',
              }}
            >
              {confirmCopy.confirm}
            </button>
          </div>
        }
      >
        <p className="text-content-secondary" style={{ margin: 0, fontSize: 'calc(13.5px * var(--fs-scale-body, 1))', lineHeight: 1.6 }}>
          {confirmCopy.body}
        </p>
      </Modal>
    )}

    {/* Promote guest → full account */}
    {isOpen && promoteTarget && (
      <Modal
        isOpen
        onClose={closePromote}
        title={t('members.promoteTitle')}
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              onClick={closePromote}
              className="text-content-secondary border border-edge-secondary"
              style={{ ...footerBtnBase, background: 'none' }}
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handlePromote}
              disabled={promoting || !promoteUserId}
              style={{
                ...footerBtnBase, border: 'none',
                background: 'var(--accent)', color: 'var(--accent-text)',
                cursor: promoting || !promoteUserId ? 'default' : 'pointer',
                opacity: promoting || !promoteUserId ? 0.4 : 1,
              }}
            >
              {promoting ? '…' : t('members.promoteConfirm')}
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p className="text-content-secondary" style={{ margin: 0, fontSize: 'calc(13.5px * var(--fs-scale-body, 1))', lineHeight: 1.6 }}>
            {t('members.promoteBody', { name: promoteTarget.username })}
          </p>
          <div>
            <label className="text-content-secondary" style={{ display: 'block', fontSize: 'calc(12px * var(--fs-scale-body, 1))', fontWeight: 600, marginBottom: 8 }}>
              {t('members.promoteSelect')}
            </label>
            <CustomSelect
              value={promoteUserId}
              onChange={value => setPromoteUserId(String(value))}
              placeholder={t('members.promoteSelect')}
              searchPlaceholder={t('members.promoteSearch')}
              options={promoteCandidates.map(u => ({ value: u.id, label: u.username }))}
              searchable
              size="sm"
            />
          </div>
        </div>
      </Modal>
    )}
    </>
  )
}
