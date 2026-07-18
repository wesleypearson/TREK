import { useEffect, useState } from 'react'
import { Plus, Copy, Check, ExternalLink, Trash2, Download, Pause, Play, ChevronDown, ChevronUp, Link2, Receipt, UserPlus, AlertTriangle } from 'lucide-react'
import { useTranslation } from '../../i18n'
import { useToast } from '../shared/Toast'
import { expenseTabsApi, settingsApi, type ExpenseTab } from '../../api/client'
import { formatMoney } from '../../utils/formatters'
import { downloadFile } from '../../utils/fileDownload'
import Modal from '../shared/Modal'
import InfoDot from '../shared/InfoDot'
import CustomSelect from '../shared/CustomSelect'
import GuestBadge from '../shared/GuestBadge'
import PaymentDetailsForm, { hasPaymentDetails } from '../Settings/PaymentDetailsForm'
import type { BudgetItem } from '../../types'
import type { TripMember } from './BudgetPanelMemberChips'

/**
 * Public expense tabs (custom): per-person running balances shared as a
 * no-account link. One modal covers both flows — browsing/managing your tabs,
 * and (when `addItemFor` is set) charging a specific ledger expense to a tab.
 * Charges freeze the label/amount at share time, so later ledger edits never
 * rewrite what the other person already saw.
 */
export default function ExpenseTabsModal({ tripId, base, locale, people = [], me, addItemFor, onClose }: {
  tripId: number
  base: string
  locale: string
  people?: TripMember[]
  me?: number
  addItemFor?: BudgetItem | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const [tabs, setTabs] = useState<ExpenseTab[] | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  // create form. Link mode: 'guest' creates a temp guest member (single per
  // trip, joins every split), 'member:<id>' links an existing member, 'none'
  // keeps the legacy standalone name-only tab.
  const [showCreate, setShowCreate] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [linkMode, setLinkMode] = useState('guest')

  // charge-to-tab form (addItemFor mode)
  const [chargeAmount, setChargeAmount] = useState(addItemFor?.total_price ? String(addItemFor.total_price) : '')
  const [shareReceipt, setShareReceipt] = useState(false)
  const [targetTabId, setTargetTabId] = useState<number | null>(null)

  // payment form (inside an expanded tab)
  const [payAmount, setPayAmount] = useState('')
  const [payNote, setPayNote] = useState('')

  // "How do people pay you?" — if the sharer has no payment details on their
  // profile, prompt right here (and pop the form after the first tab is
  // created) instead of letting them share a link payers can't act on.
  const [payDetailsConfigured, setPayDetailsConfigured] = useState<boolean | null>(null)
  const [payDetailsOpen, setPayDetailsOpen] = useState(false)
  useEffect(() => {
    settingsApi.get()
      .then((d: { settings?: Record<string, unknown> }) => setPayDetailsConfigured(hasPaymentDetails(d?.settings)))
      .catch(() => setPayDetailsConfigured(null))
  }, [])

  const load = () => expenseTabsApi.list(tripId).then(r => {
    setTabs(r.tabs)
    // Charge mode targets standalone tabs only — linked ones follow the ledger.
    const chargeable = r.tabs.filter(tab => !tab.revoked_at && tab.member_user_id == null)
    if (addItemFor && chargeable.length > 0 && targetTabId == null) setTargetTabId(chargeable[0].id)
  }).catch(() => toast.error(t('common.unknownError')))

  useEffect(() => { load() }, [tripId])

  // Linked tabs mirror the live ledger, which OTHER members change too —
  // refresh periodically and when the window regains focus so the balances
  // in an open modal don't go stale in a group session.
  useEffect(() => {
    const interval = setInterval(load, 20000)
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId])

  const fmt = (v: number, c?: string | null) => formatMoney(v, (c || base).toUpperCase(), locale)
  const fmtDate = (d?: string | null) => {
    if (!d) return ''
    try { return new Date(d.length === 10 ? d + 'T00:00:00Z' : d).toLocaleDateString(locale, { day: 'numeric', month: 'short', timeZone: d.length === 10 ? 'UTC' : undefined }) } catch { return d }
  }
  const tabName = (tab: ExpenseTab) => `${tab.claimed_first_name || tab.first_name} ${tab.claimed_last_name ?? tab.last_name}`.trim()
  const linkFor = (tab: ExpenseTab) => `${window.location.origin}/public/tab/${tab.token}`

  const copyLink = async (tab: ExpenseTab) => {
    try {
      await navigator.clipboard.writeText(linkFor(tab))
      setCopiedId(tab.id)
      setTimeout(() => setCopiedId(c => (c === tab.id ? null : c)), 1600)
    } catch { toast.error(t('common.unknownError')) }
  }

  const linkedMemberId = linkMode.startsWith('member:') ? Number(linkMode.slice(7)) : null
  const createValid = linkedMemberId != null || firstName.trim().length > 0

  const createTab = async () => {
    if (!createValid || busy) return
    setBusy(true)
    try {
      const { tab } = await expenseTabsApi.create(tripId, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        currency: base,
        member_user_id: linkedMemberId,
        create_guest: linkMode === 'guest',
      })
      setFirstName(''); setLastName(''); setLinkMode('guest'); setShowCreate(false)
      await load()
      if (addItemFor) setTargetTabId(tab.id)
      // First share without payment details on file → pop the form now.
      if (payDetailsConfigured === false) setPayDetailsOpen(true)
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg || t('common.unknownError'))
    } finally { setBusy(false) }
  }

  const chargeToTab = async () => {
    const amount = parseFloat(chargeAmount.replace(',', '.'))
    if (!addItemFor || targetTabId == null || !(amount > 0) || busy) return
    setBusy(true)
    try {
      await expenseTabsApi.addItem(tripId, targetTabId, { budget_item_id: addItemFor.id, amount, share_receipt: shareReceipt })
      toast.success(t('costs.addedToTab'))
      onClose()
    } catch { toast.error(t('common.unknownError')) } finally { setBusy(false) }
  }

  const recordPayment = async (tab: ExpenseTab) => {
    const amount = parseFloat(payAmount.replace(',', '.'))
    if (!(amount > 0) || busy) return
    setBusy(true)
    try {
      await expenseTabsApi.addPayment(tripId, tab.id, { amount, note: payNote.trim() || null })
      setPayAmount(''); setPayNote('')
      await load()
    } catch { toast.error(t('common.unknownError')) } finally { setBusy(false) }
  }

  const inputCls = 'bg-surface-input border border-edge text-content'
  const inputStyle = { borderRadius: 10, padding: '9px 12px', fontSize: 'calc(13.5px * var(--fs-scale-body, 1))', outline: 'none', fontFamily: 'inherit', minWidth: 0 } as const
  const labelCls = 'block text-[11px] font-semibold uppercase tracking-[0.08em] text-content-faint mb-[6px]'
  const iconBtn = 'bg-surface-secondary border border-edge text-content-muted'
  const iconBtnStyle = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 9, fontSize: 'calc(11.5px * var(--fs-scale-caption, 1))', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' } as const

  const alreadyLinked = new Set((tabs || []).map(tab => tab.member_user_id).filter(Boolean))
  const createForm = (
    <div className="bg-surface-secondary border border-edge" style={{ borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <CustomSelect value={linkMode} onChange={v => setLinkMode(String(v))} style={{ width: '100%' }}
        options={[
          { value: 'guest', label: t('costs.tabLinkNewGuest') },
          // A tab tracks money owed TO you — exclude yourself and anyone already linked.
          ...people.filter(p => !alreadyLinked.has(p.id) && p.id !== me).map(p => ({ value: `member:${p.id}`, label: t('costs.tabLinkMember', { name: p.username }) })),
          { value: 'none', label: t('costs.tabLinkNone') },
        ]} />
      {linkedMemberId == null && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder={t('costs.tabFirstName')} className={inputCls} style={{ ...inputStyle, flex: '1 1 120px' }} />
          <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder={t('costs.tabLastName')} className={inputCls} style={{ ...inputStyle, flex: '1 1 120px' }} />
        </div>
      )}
      {linkMode !== 'none' && (
        <div className="text-content-faint" style={{ fontSize: 'calc(11px * var(--fs-scale-caption, 1))', display: 'flex', alignItems: 'center', gap: 6 }}>
          <UserPlus size={12} /> {t('costs.tabLinkHint')}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={() => setShowCreate(false)} className="text-content-muted border border-edge" style={{ padding: '7px 14px', borderRadius: 9, background: 'none', fontSize: 'calc(12.5px * var(--fs-scale-body, 1))', cursor: 'pointer', fontFamily: 'inherit' }}>{t('common.cancel')}</button>
        <button onClick={createTab} disabled={!createValid || busy} className="bg-[var(--text-primary)] text-[var(--bg-primary)]" style={{ padding: '7px 16px', borderRadius: 9, border: 0, fontSize: 'calc(12.5px * var(--fs-scale-body, 1))', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: !createValid || busy ? 0.5 : 1 }}>{t('costs.createTab')}</button>
      </div>
    </div>
  )

  return (
    <Modal isOpen onClose={onClose} title={addItemFor ? t('costs.addToTabTitle', { name: addItemFor.name }) : t('costs.tabsTitle')} size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p className="text-content-muted" style={{ margin: 0, fontSize: 'calc(12.5px * var(--fs-scale-body, 1))', lineHeight: 1.5 }}>
          {t('costs.tabsHint')}
          <InfoDot title={t('costs.info.tabsTitle')} size={13} style={{ marginLeft: 2, verticalAlign: 'middle' }}><p style={{ margin: 0 }}>{t('costs.info.tabsBody')}</p></InfoDot>
        </p>

        {/* No payment details on file → payers can't act on the link. */}
        {payDetailsConfigured === false && (
          <div className="bg-[rgba(217,119,6,0.1)] border border-[rgba(217,119,6,0.35)]" style={{ borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <AlertTriangle size={15} className="text-[#d97706]" style={{ flexShrink: 0 }} />
            <span className="text-content" style={{ flex: 1, minWidth: 160, fontSize: 'calc(12.5px * var(--fs-scale-body, 1))' }}>{t('costs.payDetailsMissing')}</span>
            <button onClick={() => setPayDetailsOpen(true)}
              className="bg-[#d97706] text-white" style={{ padding: '6px 12px', borderRadius: 9, border: 0, fontSize: 'calc(12px * var(--fs-scale-body, 1))', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {t('costs.payDetailsAdd')}
            </button>
          </div>
        )}

        {/* charge-to-tab mode */}
        {addItemFor && (
          <div className="bg-surface-secondary border border-edge" style={{ borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className={labelCls}>{t('costs.addToTabAmount')}</label>
              <input type="text" inputMode="decimal" placeholder="0.00" value={chargeAmount} onChange={e => setChargeAmount(e.target.value.replace(',', '.'))}
                className={inputCls} style={{ ...inputStyle, width: 140, fontWeight: 600 }} />
              {/* The charge freezes in the expense's currency, else the tab's. */}
              <span className="text-content-faint" style={{ marginLeft: 8, fontSize: 'calc(12px * var(--fs-scale-body, 1))' }}>{(addItemFor.currency || tabs?.find(tab => tab.id === targetTabId)?.currency || base).toUpperCase()}</span>
            </div>
            {addItemFor.receipt_file_id != null && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 'calc(13px * var(--fs-scale-body, 1))' }} className="text-content">
                <input type="checkbox" checked={shareReceipt} onChange={e => setShareReceipt(e.target.checked)} style={{ width: 16, height: 16 }} />
                <Receipt size={14} className="text-content-muted" /> {t('costs.shareReceiptToo')}
              </label>
            )}
            {/* Only standalone tabs take frozen manual charges; linked tabs follow
                the ledger — you share a bill by assigning the member in the split. */}
            {tabs && tabs.filter(tab => !tab.revoked_at && tab.member_user_id == null).length > 0 && (
              <div>
                <label className={labelCls}>{t('costs.tabs')}</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {tabs.filter(tab => !tab.revoked_at && tab.member_user_id == null).map(tab => (
                    <button key={tab.id} onClick={() => setTargetTabId(tab.id)}
                      className={targetTabId === tab.id ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]' : 'bg-surface-card border border-edge text-content'}
                      style={{ padding: '8px 14px', borderRadius: 999, fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 600, border: targetTabId === tab.id ? 0 : undefined, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {tabName(tab)} · {fmt(tab.balance, tab.currency)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {tabs && tabs.some(tab => tab.member_user_id != null) && (
              <div className="text-content-faint" style={{ fontSize: 'calc(11.5px * var(--fs-scale-caption, 1))' }}>{t('costs.tabNoLinkedCharge')}</div>
            )}
            {tabs && tabs.filter(tab => !tab.revoked_at && tab.member_user_id == null).length === 0 && !showCreate && (
              <div className="text-content-muted" style={{ fontSize: 'calc(12.5px * var(--fs-scale-body, 1))' }}>{t('costs.tabsEmpty')}</div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => setShowCreate(v => !v)} className={iconBtn} style={iconBtnStyle}><Plus size={13} /> {t('costs.newTab')}</button>
              <button onClick={chargeToTab} disabled={targetTabId == null || !(parseFloat(chargeAmount) > 0) || busy}
                className="bg-[var(--text-primary)] text-[var(--bg-primary)]"
                style={{ padding: '9px 18px', borderRadius: 10, border: 0, fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: targetTabId == null || !(parseFloat(chargeAmount) > 0) || busy ? 0.5 : 1 }}>
                {t('costs.addToTab')}
              </button>
            </div>
            {showCreate && createForm}
          </div>
        )}

        {/* browse mode header */}
        {!addItemFor && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-content-faint" style={{ fontSize: 'calc(11.5px * var(--fs-scale-caption, 1))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('costs.tabs')} · {tabs?.length ?? 0}</span>
            {!showCreate && <button onClick={() => setShowCreate(true)} className={iconBtn} style={iconBtnStyle}><Plus size={13} /> {t('costs.newTab')}</button>}
          </div>
        )}
        {!addItemFor && showCreate && createForm}
        {!addItemFor && tabs && tabs.length === 0 && !showCreate && (
          <div className="text-content-faint" style={{ textAlign: 'center', padding: '28px 12px', fontSize: 'calc(13px * var(--fs-scale-body, 1))' }}>{t('costs.tabsEmpty')}</div>
        )}

        {/* tab cards (browse mode) */}
        {!addItemFor && (tabs || []).map(tab => {
          const open = expanded === tab.id
          // Linked tabs read from the live group ledger; standalone ones from
          // their frozen charge list.
          const balance = tab.live ? tab.live.balance : tab.balance
          const balCur = tab.live ? tab.live.currency : tab.currency
          return (
            <div key={tab.id} className="bg-surface-card border border-edge" style={{ borderRadius: 14, overflow: 'hidden' }}>
              <button type="button" aria-expanded={open} style={{ width: '100%', textAlign: 'left', background: 'none', border: 0, color: 'inherit', font: 'inherit', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => { setExpanded(open ? null : tab.id); setPayAmount(''); setPayNote(''); setConfirmDeleteId(null) }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span className="text-content" style={{ fontSize: 'calc(14.5px * var(--fs-scale-body, 1))', fontWeight: 700 }}>{tabName(tab)}</span>
                    {tab.member?.is_guest && <GuestBadge size="xs" />}
                    {tab.member && !tab.member.is_guest && (
                      <span className="bg-surface-secondary border border-edge text-content-muted" style={{ padding: '2px 8px', borderRadius: 999, fontSize: 'calc(10.5px * var(--fs-scale-caption, 1))', fontWeight: 700 }}>{t('costs.tabLinked')}</span>
                    )}
                    {tab.claimed_at && (
                      <span className="bg-[rgba(22,163,74,0.12)] text-[var(--success)]" style={{ padding: '2px 8px', borderRadius: 999, fontSize: 'calc(10.5px * var(--fs-scale-caption, 1))', fontWeight: 700 }}>{t('costs.tabClaimed')}</span>
                    )}
                    {tab.revoked_at && (
                      <span className="bg-[rgba(217,119,6,0.14)] text-[#d97706]" style={{ padding: '2px 8px', borderRadius: 999, fontSize: 'calc(10.5px * var(--fs-scale-caption, 1))', fontWeight: 700 }}>{t('costs.tabRevoked')}</span>
                    )}
                  </div>
                  <div className="text-content-faint" style={{ fontSize: 'calc(11.5px * var(--fs-scale-caption, 1))', marginTop: 2 }}>
                    {t('costs.tabCharged')} {fmt(tab.live ? tab.live.charged : tab.charged, balCur)} · {t('costs.tabPaid')} {fmt(tab.live ? tab.live.paid : tab.paid, balCur)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: 'calc(17px * var(--fs-scale-subtitle, 1))', fontWeight: 700, color: balance > 0.004 ? 'var(--danger)' : 'var(--success)' }}>{fmt(balance, balCur)}</div>
                </div>
                {open ? <ChevronUp size={16} className="text-content-faint" /> : <ChevronDown size={16} className="text-content-faint" />}
              </button>

              {open && (
                <div className="border-edge" style={{ borderTop: '1px solid var(--border-faint, #e5e7eb)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* actions */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => copyLink(tab)} className={iconBtn} style={iconBtnStyle}>
                      {copiedId === tab.id ? <Check size={13} className="text-[var(--success)]" /> : <Copy size={13} />} {copiedId === tab.id ? t('costs.tabLinkCopied') : t('costs.tabCopyLink')}
                    </button>
                    <a href={linkFor(tab)} target="_blank" rel="noopener noreferrer" className={iconBtn} style={{ ...iconBtnStyle, textDecoration: 'none' }}>
                      <ExternalLink size={13} /> {t('costs.tabOpen')}
                    </a>
                    <button onClick={() => downloadFile(expenseTabsApi.csvUrl(tripId, tab.id), `expense-tab-${tabName(tab).replace(/[^a-z0-9-]+/gi, '-').toLowerCase() || 'tab'}.csv`).catch(() => toast.error(t('common.unknownError')))} className={iconBtn} style={iconBtnStyle}>
                      <Download size={13} /> {t('costs.tabExportCsv')}
                    </button>
                    <button onClick={async () => { try { await expenseTabsApi.setRevoked(tripId, tab.id, !tab.revoked_at); await load() } catch { toast.error(t('common.unknownError')) } }} className={iconBtn} style={iconBtnStyle}>
                      {tab.revoked_at ? <><Play size={13} /> {t('costs.tabResume')}</> : <><Pause size={13} /> {t('costs.tabRevoke')}</>}
                    </button>
                    <button
                      onClick={async () => {
                        if (confirmDeleteId !== tab.id) { setConfirmDeleteId(tab.id); return }
                        try { await expenseTabsApi.delete(tripId, tab.id); setConfirmDeleteId(null); await load() } catch { toast.error(t('common.unknownError')) }
                      }}
                      className={confirmDeleteId === tab.id ? 'bg-[var(--danger)] text-white border border-[#dc2626]' : iconBtn}
                      style={{ ...iconBtnStyle, color: confirmDeleteId === tab.id ? '#fff' : 'var(--danger)' }}>
                      <Trash2 size={13} /> {confirmDeleteId === tab.id ? t('costs.tabDeleteConfirm') : t('costs.tabDelete')}
                    </button>
                  </div>

                  {tab.live && (
                    <div className="text-content-faint" style={{ fontSize: 'calc(11.5px * var(--fs-scale-caption, 1))', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Link2 size={12} /> {t('costs.tabLiveHint', { name: tabName(tab) })}
                    </div>
                  )}

                  {/* who they owe right now (linked tabs) */}
                  {tab.live && tab.live.owed.length > 0 && (
                    <div>
                      <div className={labelCls}>{t('costs.tabOwedTo')}</div>
                      {tab.live.owed.map(o => (
                        <div key={o.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
                          <span className="text-content" style={{ flex: 1, fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 500 }}>{o.name}</span>
                          <span className="text-[var(--danger)]" style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 700 }}>{fmt(o.amount, tab.live!.currency)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* charges */}
                  <div>
                    <div className={labelCls}>{t('costs.tabItems')} · {tab.live ? tab.live.charges.length : tab.items.length}</div>
                    {(tab.live ? tab.live.charges.length : tab.items.length) === 0 && <div className="text-content-faint" style={{ fontSize: 'calc(12px * var(--fs-scale-body, 1))' }}>—</div>}
                    {tab.live
                      ? tab.live.charges.map(c => (
                          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span className="text-content" style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 500 }}>{c.label}</span>
                              <span className="text-content-faint" style={{ marginLeft: 8, fontSize: 'calc(11px * var(--fs-scale-caption, 1))' }}>{fmtDate(c.expense_date || c.created_at)}</span>
                            </div>
                            <span className="text-content" style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmt(c.share, c.currency)}</span>
                          </div>
                        ))
                      : tab.items.map(item => (
                          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span className="text-content" style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 500 }}>{item.label}</span>
                              {!!item.share_receipt && <Receipt size={11} className="text-content-faint" style={{ marginLeft: 6, display: 'inline' }} />}
                              <span className="text-content-faint" style={{ marginLeft: 8, fontSize: 'calc(11px * var(--fs-scale-caption, 1))' }}>{fmtDate(item.expense_date || item.created_at)}</span>
                            </div>
                            <span className="text-content" style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmt(item.amount, item.currency)}</span>
                            <button onClick={async () => { try { await expenseTabsApi.removeItem(tripId, tab.id, item.id); await load() } catch { toast.error(t('common.unknownError')) } }}
                              aria-label={t('common.delete')}
                              className="text-content-faint" style={{ background: 'none', border: 0, cursor: 'pointer', minWidth: 34, minHeight: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '-8px -6px' }}>
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                  </div>

                  {/* payments */}
                  <div>
                    <div className={labelCls}>{t('costs.tabPayments')} · {tab.live ? tab.live.payments.length : tab.payments.length}</div>
                    {tab.live
                      ? tab.live.payments.map(p => (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span className="text-content" style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))' }}>{t('costs.tabPaidTo', { name: p.to_name })}</span>
                              <span className="text-content-faint" style={{ marginLeft: 8, fontSize: 'calc(11px * var(--fs-scale-caption, 1))' }}>{fmtDate(p.created_at)}</span>
                            </div>
                            <span className="text-[var(--success)]" style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 700, whiteSpace: 'nowrap' }}>−{fmt(p.amount, p.currency || tab.live!.currency)}</span>
                          </div>
                        ))
                      : tab.payments.map(p => (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span className="text-content" style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))' }}>{p.note || t('costs.tabPayments')}</span>
                              <span className="text-content-faint" style={{ marginLeft: 8, fontSize: 'calc(11px * var(--fs-scale-caption, 1))' }}>{fmtDate(p.created_at)}</span>
                            </div>
                            <span className="text-[var(--success)]" style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 700, whiteSpace: 'nowrap' }}>−{fmt(p.amount, tab.currency)}</span>
                            <button onClick={async () => { try { await expenseTabsApi.removePayment(tripId, tab.id, p.id); await load() } catch { toast.error(t('common.unknownError')) } }}
                              aria-label={t('common.delete')}
                              className="text-content-faint" style={{ background: 'none', border: 0, cursor: 'pointer', minWidth: 34, minHeight: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '-8px -6px' }}>
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      <input type="text" inputMode="decimal" placeholder="0.00" value={payAmount} onChange={e => setPayAmount(e.target.value.replace(',', '.'))}
                        className={inputCls} style={{ ...inputStyle, flex: '0 0 90px', fontWeight: 600 }} />
                      {/* Linked tabs record a real settle-up (no free-text note). */}
                      {!tab.live && <input value={payNote} onChange={e => setPayNote(e.target.value)} placeholder={t('costs.tabPaymentNote')} className={inputCls} style={{ ...inputStyle, flex: '1 1 140px' }} />}
                      <button onClick={() => recordPayment(tab)} disabled={!(parseFloat(payAmount) > 0) || busy}
                        className="bg-[var(--text-primary)] text-[var(--bg-primary)]"
                        style={{ padding: '8px 14px', borderRadius: 10, border: 0, fontSize: 'calc(12.5px * var(--fs-scale-body, 1))', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: !(parseFloat(payAmount) > 0) || busy ? 0.5 : 1 }}>
                        {t('costs.tabAddPayment')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* footnote */}
        {!addItemFor && (
          <div className="text-content-faint" style={{ fontSize: 'calc(11px * var(--fs-scale-caption, 1))', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Link2 size={12} /> {t('costs.tabsFootnote')}
          </div>
        )}
      </div>

      {/* Nested prompt: set your payment details without leaving the flow. */}
      {payDetailsOpen && (
        <Modal isOpen onClose={() => setPayDetailsOpen(false)} title={t('settings.paymentDetails')} size="md">
          <p className="text-content-muted" style={{ marginTop: 0, fontSize: 'calc(12.5px * var(--fs-scale-body, 1))', lineHeight: 1.5 }}>{t('settings.paymentDetailsHint')}</p>
          <PaymentDetailsForm onSaved={configured => { setPayDetailsConfigured(configured); setPayDetailsOpen(false) }} />
        </Modal>
      )}
    </Modal>
  )
}
