import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, BarChart3, Plus, Search, ArrowRight, ArrowLeftRight, Camera, Check, RotateCcw, Pencil, Trash2, AlertCircle, Download, Loader2, Lock, Receipt, Link2, MapPin, HelpCircle, Store } from 'lucide-react'
import { useTripStore } from '../../store/tripStore'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useCanDo } from '../../store/permissionsStore'
import { useToast } from '../shared/Toast'
import { useTranslation } from '../../i18n'
import { budgetApi, tripsApi, placesApi, suppliersApi } from '../../api/client'
import { useExchangeRates } from '../../hooks/useExchangeRates'
import { useIsMobile } from '../../hooks/useIsMobile'
import { formatMoney, currencyDecimals, currencyLocale } from '../../utils/formatters'
import { openFile } from '../../utils/fileDownload'
import Modal from '../shared/Modal'
import InfoDot from '../shared/InfoDot'
import ExpensesGuideModal from './ExpensesGuideModal'
import ExpenseTabsModal from './ExpenseTabsModal'
import CustomSelect from '../shared/CustomSelect'
import { CustomDatePicker } from '../shared/CustomDateTimePicker'
import { SYMBOLS, currenciesWith, SPLIT_COLORS } from './BudgetPanel.constants'
import { COST_CATEGORY_LIST, catMeta } from './costsCategories'
import type { BudgetItem } from '../../types'
import type { TripMember } from './BudgetPanelMemberChips'
import GuestBadge from '../shared/GuestBadge'
import { NumericInput } from '../shared/NumericInput'

export function splitEqualShares(total: number, members: { user_id: number }[], itemId: number): Record<number, number> {
  const n = members.length
  if (n === 0) return {}

  const totalCents = Math.round(total * 100)
  const baseCents = Math.floor(totalCents / n)
  const remainder = totalCents % n

  const shares: Record<number, number> = {}
  const sortedMembers = [...members].sort((a, b) => a.user_id - b.user_id)
  const startIndex = itemId % n

  for (let i = 0; i < n; i++) {
    const member = sortedMembers[i]
    const hasExtraCent = ((i - startIndex + n) % n) < remainder
    shares[member.user_id] = (baseCents + (hasExtraCent ? 1 : 0)) / 100
  }

  return shares
}

export interface TicketItem {
  id: string
  name: string
  /** UNIT price. The line amount is qty × price (qty defaults to '1'). */
  price: string
  qty: string
  participants: Set<number>
}

/** The line amount in cents: quantity × unit price, rounded to the cent. */
export function ticketLineCents(item: Pick<TicketItem, 'price' | 'qty'>): number {
  const qty = Math.max(1, Math.round(parseFloat(item.qty) || 1))
  const unit = parseFloat(item.price) || 0
  return Math.round(qty * unit * 100)
}

export function calculateTicketShares(items: TicketItem[]): { shares: Record<number, number>; total: number } {
  const shares: Record<number, number> = {}
  let totalCents = 0

  for (const item of items) {
    const priceCents = ticketLineCents(item)
    totalCents += priceCents

    const partIds = [...item.participants]
    const n = partIds.length
    if (n === 0) continue

    const baseCents = Math.floor(priceCents / n)
    const remainder = priceCents % n

    const sortedPartIds = [...partIds].sort((a, b) => a - b)

    for (let i = 0; i < n; i++) {
      const id = sortedPartIds[i]
      const hasExtraCent = i < remainder
      const shareCents = baseCents + (hasExtraCent ? 1 : 0)
      shares[id] = (shares[id] || 0) + shareCents
    }
  }

  const finalShares: Record<number, number> = {}
  for (const id of Object.keys(shares)) {
    finalShares[Number(id)] = shares[Number(id)] / 100
  }

  return { shares: finalShares, total: totalCents / 100 }
}

// Receipt photos the scan endpoint shouldn't take as-is: exotic image types the
// vision model can't ingest (e.g. HEIC from an iPhone camera roll) and oversized
// photos are re-encoded client-side to a ≤2000px JPEG before upload. Safari
// decodes HEIC natively (via createImageBitmap or <img>), so the conversion is
// free there; anywhere decoding fails we fall back to the original file — the
// server accepts HEIC/PDF too, it just costs more upload bytes.
const RECEIPT_PASSTHROUGH_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const RECEIPT_MAX_BYTES = 4 * 1024 * 1024
const RECEIPT_MAX_EDGE = 2500
const RECEIPT_TARGET_EDGE = 2000

async function decodeReceiptImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file) } catch { /* fall through to <img> (Safari decodes HEIC there) */ }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    // Revoking on load is safe: the image is fully decoded once onload fires.
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image decode failed')) }
    img.src = url
  })
}

export async function prepareReceiptImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  const passthroughType = RECEIPT_PASSTHROUGH_TYPES.includes(file.type)
  const smallEnough = file.size <= RECEIPT_MAX_BYTES
  // A well-typed small image only needs the dimension check, which requires a
  // real decoder — keep it as-is where createImageBitmap is missing (jsdom, old
  // Safari) instead of risking a hang on the <img> path.
  if (passthroughType && smallEnough && typeof createImageBitmap !== 'function') return file
  try {
    const source = await decodeReceiptImage(file)
    const w = source instanceof HTMLImageElement ? source.naturalWidth : source.width
    const h = source instanceof HTMLImageElement ? source.naturalHeight : source.height
    const longEdge = Math.max(w, h)
    if (!longEdge) return file
    if (passthroughType && smallEnough && longEdge <= RECEIPT_MAX_EDGE) {
      if (!(source instanceof HTMLImageElement)) source.close()
      return file
    }
    const scale = Math.min(1, RECEIPT_TARGET_EDGE / longEdge)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(w * scale))
    canvas.height = Math.max(1, Math.round(h * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
    if (!(source instanceof HTMLImageElement)) source.close()
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82))
    if (!blob) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

// Shape of a successful POST /budget/receipt-scan response (the 409/502 error
// bodies carry `error` plus the stored `file` so the receipt stays attachable).
interface ReceiptScanResponse {
  file?: { id?: number }
  receipt?: {
    merchant?: string | null
    merchant_address?: string | null
    merchant_phone?: string | null
    merchant_website?: string | null
    date?: string | null
    currency?: string | null
    total?: number | null
    items?: { name: string; price: number; quantity?: number | null; unit_price?: number | null }[]
  }
  warnings?: string[]
  // Auto-created (or matched) by the scan: the vendor-book entry and the venue.
  supplier?: { id: number; name: string; created: boolean } | null
  place?: { id: number; name: string; created: boolean } | null
}

interface CostsPanelProps {
  tripId: number
  tripMembers?: TripMember[]
}

interface Settlement {
  id: number
  from_user_id: number
  to_user_id: number
  amount: number
  created_at?: string
  from_username?: string
  to_username?: string
}
interface SettlementData {
  balances: { user_id: number; username: string; avatar_url: string | null; balance: number }[]
  flows: { from: { user_id: number; username: string }; to: { user_id: number; username: string }; amount: number }[]
  settlements: Settlement[]
}

// One row in the unified Costs ledger — either an expense or a settle-up payment,
// carrying the date used to group it by day.
type LedgerEntry =
  | { kind: 'expense'; date: string; e: BudgetItem }
  | { kind: 'payment'; date: string; s: Settlement }

const round2 = (n: number) => Math.round(n * 100) / 100
const FIELD_H = 40 // shared height for the amount / currency / day row in the modal

export default function CostsPanel({ tripId, tripMembers = [] }: CostsPanelProps) {
  const { trip, budgetItems, deleteBudgetItem, loadBudgetItems } = useTripStore()
  const me = useAuthStore(s => s.user?.id ?? -1)
  const can = useCanDo()
  const canEdit = can('budget_edit', trip)
  const toast = useToast()
  const { t, locale } = useTranslation()
  const isMobile = useIsMobile()

  // Display/base currency = the user's preferred currency (Settings), falling back
  // to the trip's own currency. Everything in Costs is converted to and shown in it.
  const displayCurrency = useSettingsStore(s => s.settings.default_currency)
  const base = (displayCurrency || trip?.currency || 'EUR').toUpperCase()
  // Pre-rework rows stored currency = NULL, meaning "the trip's own currency".
  const tripCurrency = (trip?.currency || base).toUpperCase()
  const { convert } = useExchangeRates(base)
  const curOf = useCallback((e: BudgetItem) => (e.currency || tripCurrency), [tripCurrency])
  const [settlement, setSettlement] = useState<SettlementData | null>(null)
  const [filter, setFilter] = useState<'all' | 'mine' | 'owed'>('all')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')   // '' = all categories
  const [dayFilter, setDayFilter] = useState('')   // '' = all days, else YYYY-MM-DD
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<BudgetItem | null>(null)
  const [editingSettlement, setEditingSettlement] = useState<Settlement | null>(null)
  const [addingPayment, setAddingPayment] = useState(false)
  // Public expense tabs (custom): false = closed, {} = browse, { item } = charge
  // that ledger expense to a tab.
  const [tabsModal, setTabsModal] = useState<false | { item?: BudgetItem }>(false)
  // Owner-only fresh-start tool while the group is testing.
  const isTripOwner = trip?.user_id === me
  const [resetOpen, setResetOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const handleReset = async () => {
    setResetting(true)
    try {
      await budgetApi.resetExpenses(tripId)
      setResetOpen(false)
      toast.success(t('costs.resetDone'))
      loadBudgetItems(tripId)
      loadSettlement()
    } catch { toast.error(t('common.unknownError')) } finally { setResetting(false) }
  }
  // Add an off-platform person as a trip guest straight from the split editor —
  // the start of their onboarding (they get counted in bills immediately, and a
  // linked tab/join link can follow). Guests created here show up in the split
  // lists at once; the server list catches up on the next trip load.
  const [extraGuests, setExtraGuests] = useState<TripMember[]>([])
  const handleCreateGuest = useCallback(async (name: string): Promise<TripMember | null> => {
    try {
      const res = await tripsApi.createGuest(tripId, name)
      const guest = (res.member || res) as TripMember
      setExtraGuests(prev => prev.some(g => g.id === guest.id) ? prev : [...prev, guest])
      return guest
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg || t('common.unknownError'))
      return null
    }
  }, [tripId, toast, t])

  // Trip members plus any guests created inline this session (the members
  // prop refreshes on the next trip load; this keeps them usable right away).
  const people = useMemo(() => {
    const known = new Set(tripMembers.map(p => p.id))
    return [...tripMembers, ...extraGuests.filter(g => !known.has(g.id))]
  }, [tripMembers, extraGuests])
  const personById = useCallback((id: number) => people.find(p => p.id === id), [people])
  const personName = useCallback((id: number) => id === me ? t('costs.you') : (personById(id)?.username || '?'), [me, personById, t])
  const colorFor = useCallback((id: number) => {
    const idx = people.findIndex(p => p.id === id)
    return SPLIT_COLORS[(idx >= 0 ? idx : 0) % SPLIT_COLORS.length].gradient
  }, [people])
  const initial = useCallback((id: number) => id === me ? t('costs.youShort') : (personById(id)?.username || '?').charAt(0).toUpperCase(), [me, personById, t])

  const fmt = useCallback((v: number, c = base) => formatMoney(v, c, locale), [base, locale])
  const fmt0 = useCallback((v: number, c = base) => formatMoney(v, c, locale, { decimals: 0 }), [base, locale])

  const loadSettlement = useCallback(() => {
    budgetApi.settlement(tripId, base).then(setSettlement).catch(() => {})
  }, [tripId, base])

  useEffect(() => { loadBudgetItems(tripId); loadSettlement() }, [tripId])
  // settlementsVersion bumps on every settlement websocket event (any member,
  // any device, incl. linked-tab payments) so flows/payment rows never go stale.
  const settlementsVersion = useTripStore(s => s.settlementsVersion)
  useEffect(() => { loadSettlement() }, [budgetItems.length, base, settlementsVersion])

  // The bottom-nav "+" on the Costs tab opens the add-expense modal via ?create=expense.
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    if (searchParams.get('create') === 'expense') {
      setEditing(null); setModalOpen(true)
      setSearchParams(p => { p.delete('create'); return p }, { replace: true })
    }
  }, [searchParams])

  // ── derived expense maths (everything converted to the base currency) ────
  const baseTotal = (e: BudgetItem) => convert(e.total_price || 0, curOf(e))
  const myPaidOf = (e: BudgetItem) => (e.payers || []).filter(p => p.user_id === me).reduce((a, p) => a + convert(p.amount, curOf(e)), 0)
  const myShareOf = (e: BudgetItem) => {
    const myMember = (e.members || []).find(m => m.user_id === me)
    if (!myMember) return 0
    if (myMember.amount !== null && myMember.amount !== undefined) {
      return convert(myMember.amount, curOf(e))
    }
    const shares = splitEqualShares(e.total_price || 0, e.members || [], e.id)
    const myShare = shares[me] || 0
    return convert(myShare, curOf(e))
  }
  // "Unfinished": a recorded total nobody has paid yet — counts toward the trip
  // total but stays out of settlements until who-paid is filled in.
  const isUnfinished = (e: BudgetItem) => baseTotal(e) > 0 && (e.payers || []).filter(p => p.amount > 0).length === 0

  const totals = useMemo(() => {
    const totalSpend = budgetItems.reduce((a, e) => a + baseTotal(e), 0)
    const myPaid = budgetItems.reduce((a, e) => a + myPaidOf(e), 0)
    const myShare = budgetItems.reduce((a, e) => a + myShareOf(e), 0)
    const owe = (settlement?.flows || []).filter(f => f.from.user_id === me).reduce((a, f) => a + f.amount, 0)
    const owed = (settlement?.flows || []).filter(f => f.to.user_id === me).reduce((a, f) => a + f.amount, 0)
    const outstanding = budgetItems.reduce((a, e) => (isUnfinished(e) ? a + baseTotal(e) : a), 0)
    const outstandingCount = budgetItems.filter(isUnfinished).length
    return { totalSpend, myPaid, myShare, owe, owed, outstanding, outstandingCount }
  }, [budgetItems, settlement, me])

  // ── filtering + day grouping ────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = budgetItems.slice()
    if (filter === 'mine') list = list.filter(e => myPaidOf(e) > 0)
    if (filter === 'owed') list = list.filter(e => round2(myPaidOf(e) - myShareOf(e)) > 0)
    // catMeta normalises legacy/free-text categories to the fixed keys, so the
    // filter matches rows saved before the category rework too.
    if (catFilter) list = list.filter(e => catMeta(e.category).key === catFilter)
    if (dayFilter) list = list.filter(e => (e.expense_date || '') === dayFilter)
    const q = search.trim().toLowerCase()
    if (q) list = list.filter(e => e.name.toLowerCase().includes(q))
    return list
  }, [budgetItems, filter, search, catFilter, dayFilter, me])

  // Settlements ("payments") shown inline in the ledger. They have no name, so a
  // text search hides them; they're excluded from the "owed" expense filter and,
  // under "mine", only show transfers I'm part of.
  const filteredSettlements = useMemo(() => {
    // Payments carry no name or category, so a text/category filter hides them.
    if (search.trim() || catFilter) return []
    if (filter === 'owed') return []
    let list = settlement?.settlements || []
    if (filter === 'mine') list = list.filter(s => s.from_user_id === me || s.to_user_id === me)
    if (dayFilter) list = list.filter(s => (s.created_at || '').slice(0, 10) === dayFilter)
    return list
  }, [settlement, filter, search, catFilter, dayFilter, me])

  const dayGroups = useMemo(() => {
    const entries: LedgerEntry[] = [
      ...filtered.map(e => ({ kind: 'expense' as const, date: e.expense_date || '', e })),
      ...filteredSettlements.map(s => ({ kind: 'payment' as const, date: (s.created_at || '').slice(0, 10), s })),
    ]
    const labelOf = (date: string) => {
      if (!date) return t('costs.noDate')
      try { return new Date(date + 'T00:00:00Z').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }) } catch { return date }
    }
    // Newest day first; within a day, expenses before payments (insertion order).
    const sorted = entries.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    const groups: { day: string; entries: LedgerEntry[] }[] = []
    for (const en of sorted) {
      const day = labelOf(en.date)
      let g = groups.find(x => x.day === day)
      if (!g) { g = { day, entries: [] }; groups.push(g) }
      g.entries.push(en)
    }
    return groups
  }, [filtered, filteredSettlements, locale, t])

  // ── filter dropdown options (category + single day) ──────────────────────
  const categoryOptions = useMemo(() => [
    { value: '', label: t('costs.filter.allCategories') },
    ...COST_CATEGORY_LIST.map(c => ({ value: c.key, label: t(c.labelKey), icon: <c.Icon size={14} style={{ color: c.color }} /> })),
  ], [t])

  const dayOptions = useMemo(() => {
    const days = Array.from(new Set(budgetItems.map(e => e.expense_date).filter(Boolean) as string[])).sort((a, b) => b.localeCompare(a))
    const fmtDay = (d: string) => {
      try { return new Date(d + 'T00:00:00Z').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }) } catch { return d }
    }
    return [{ value: '', label: t('costs.filter.allDays') }, ...days.map(d => ({ value: d, label: fmtDay(d) }))]
  }, [budgetItems, locale, t])

  // ── settle actions ──────────────────────────────────────────────────────
  const settleFlow = async (fromId: number, toId: number, amount: number) => {
    try {
      await budgetApi.createSettlement(tripId, { from_user_id: fromId, to_user_id: toId, amount, currency: base })
      loadSettlement()
    } catch { toast.error(t('common.unknownError')) }
  }
  const undoSettlement = async (id: number) => {
    try {
      await budgetApi.deleteSettlement(tripId, id)
      loadSettlement()
    } catch (err) {
      // Already undone elsewhere (double tap / another member) — just resync,
      // there's nothing to alarm the user about.
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 404) loadSettlement()
      else toast.error(t('common.unknownError'))
    }
  }
  const settleAll = async () => {
    const flows = settlement?.flows || []
    if (!flows.length) return
    try {
      for (const f of flows) await budgetApi.createSettlement(tripId, { from_user_id: f.from.user_id, to_user_id: f.to.user_id, amount: f.amount, currency: base })
      loadSettlement()
    } catch { toast.error(t('common.unknownError')) }
  }

  const dateMeta = useMemo(() => {
    if (!trip?.start_date || !trip?.end_date) return null
    try {
      const s = new Date(trip.start_date + 'T00:00:00Z'), e = new Date(trip.end_date + 'T00:00:00Z')
      const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1
      const opt = { day: 'numeric', month: 'short', timeZone: 'UTC' } as const
      return { range: `${s.toLocaleDateString(locale, opt)} – ${e.toLocaleDateString(locale, opt)}`, days }
    } catch { return null }
  }, [trip?.start_date, trip?.end_date, locale])

  const handleDelete = async (id: number) => {
    try { await deleteBudgetItem(tripId, id); loadSettlement() } catch { toast.error(t('common.unknownError')) }
  }

  // CSV export of all expenses — the wiki-documented export that got lost in the
  // Costs rework (#1500). One row per expense, oldest first.
  const handleExportCsv = () => {
    const sep = ';'
    const esc = (v: unknown) => { const s = String(v ?? ''); return s.includes(sep) || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s }
    const fmtDate = (iso: string) => { if (!iso) return ''; try { return new Date(iso + 'T00:00:00Z').toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }) } catch { return iso } }

    const header = ['Date', 'Name', 'Category', 'Amount', 'Currency', 'Amount (' + base + ')', 'Note']
    const rows = [header.join(sep)]
    const items = budgetItems.slice().sort((a, b) => (a.expense_date || '').localeCompare(b.expense_date || ''))
    for (const e of items) {
      const cur = curOf(e)
      // Ticket notes carry the itemized-receipt JSON, not a human note.
      const note = e.note && !e.note.startsWith('TICKETJSON:') ? e.note : ''
      rows.push([
        esc(fmtDate(e.expense_date || '')), esc(e.name), esc(t(catMeta(e.category).labelKey)),
        (e.total_price || 0).toFixed(currencyDecimals(cur)), cur,
        baseTotal(e).toFixed(currencyDecimals(base)),
        esc(note),
      ].join(sep))
    }

    const bom = '﻿'
    const blob = new Blob([bom + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const safeName = (trip?.title || 'event').replace(/[^a-zA-Z0-9À-ɏ _-]/g, '').trim()
    a.download = `costs-${safeName}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── small presentational helpers ────────────────────────────────────────
  const Avatar = ({ id, size = 24 }: { id: number; size?: number }) => {
    const url = personById(id)?.avatar_url
    if (url) return <img src={url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }} />
    return <span style={{ width: size, height: size, borderRadius: '50%', background: colorFor(id), color: '#fff', display: 'grid', placeItems: 'center', fontSize: size * 0.4, fontWeight: 700, flexShrink: 0 }}>{initial(id)}</span>
  }

  const cardCls = 'bg-surface-card border border-edge'
  const labelCls = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-content-faint'

  // Big money number with the design's muted symbol/decimals, locale-correct via Intl.
  const bigMoney = (amount: number, smallSize: number, mutedColor: string) => {
    let parts: Intl.NumberFormatPart[] | null = null
    try {
      const d = currencyDecimals(base)
      parts = new Intl.NumberFormat(currencyLocale(base), { style: 'currency', currency: base, minimumFractionDigits: d, maximumFractionDigits: d }).formatToParts(amount || 0)
    } catch { return <>{formatMoney(amount, base, locale)}</> }
    const isBig = (p: Intl.NumberFormatPart) => p.type === 'integer' || p.type === 'group' || p.type === 'minusSign'
    return <>{parts.map((p, i) => <span key={i} style={isBig(p) ? undefined : { fontSize: smallSize, fontWeight: 500, color: mutedColor }}>{p.value}</span>)}</>
  }

  // ── category + day filter controls (shared by both layouts) ──────────────
  const filterControls = (
    <>
      <CustomSelect value={catFilter} onChange={v => setCatFilter(String(v))} options={categoryOptions} size="sm" style={{ minWidth: 148 }} />
      <CustomSelect value={dayFilter} onChange={v => setDayFilter(String(v))} options={dayOptions} size="sm" searchable style={{ minWidth: 140 }} />
    </>
  )

  // A prominent summary shown when a single day is selected: the day + its total.
  const dayFilterTotal = dayFilter ? filtered.reduce((a, e) => a + baseTotal(e), 0) : 0
  const dayFilterLabel = dayFilter
    ? (() => { try { return new Date(dayFilter + 'T00:00:00Z').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }) } catch { return dayFilter } })()
    : ''
  const dayBanner = dayFilter ? (
    <div className={cardCls} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderRadius: 16, padding: '16px 20px', marginBottom: 16 }}>
      <div style={{ minWidth: 0 }}>
        <div className="text-content" style={{ fontSize: 'calc(15px * var(--fs-scale-subtitle, 1))', fontWeight: 700, letterSpacing: '-0.01em' }}>{dayFilterLabel}</div>
        <div className="text-content-muted" style={{ marginTop: 3, fontSize: 'calc(12px * var(--fs-scale-body, 1))' }}>{t('costs.expensesCount', { count: filtered.length })}</div>
      </div>
      <div className="text-content" style={{ fontSize: 'calc(26px * var(--fs-scale-title, 1))', fontWeight: 700, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>{bigMoney(dayFilterTotal, 15, 'var(--text-muted)')}</div>
    </div>
  ) : null

  return (
    <div className="costs-root" style={{ minHeight: '100%', background: 'var(--c-bg)', padding: isMobile ? '6px 14px 28px' : '40px 24px 48px' }}>
     {isMobile ? <MobileBody /> : (
     <div style={{ maxWidth: '100%', margin: '0 auto' }}>
      {/* ── Header bar ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 28, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {dateMeta && (
            <span className="bg-surface-card border border-edge text-content-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 500, whiteSpace: 'nowrap' }}>
              {dateMeta.range} · <b className="text-content">{t('costs.daysCount', { count: dateMeta.days })}</b>
            </span>
          )}
          <span className="bg-surface-card border border-edge text-content-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px 8px 10px', borderRadius: 999, fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 500 }}>
            <span style={{ display: 'inline-flex' }}>
              {people.slice(0, 4).map((p, i) => {
                const common = { width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--bg-card)', marginLeft: i ? -8 : 0, flexShrink: 0 } as const
                return p.avatar_url
                  ? <img key={p.id} src={p.avatar_url} alt="" style={{ ...common, objectFit: 'cover', display: 'block' }} />
                  : <span key={p.id} style={{ ...common, background: colorFor(p.id), color: '#fff', display: 'grid', placeItems: 'center', fontSize: 'calc(9px * var(--fs-scale-caption, 1))', fontWeight: 700 }}>{(p.id === me ? t('costs.youShort') : p.username.charAt(0)).toUpperCase()}</span>
              })}
            </span>
            <b className="text-content">{t('costs.travelers', { count: people.length })}</b>
          </span>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setGuideOpen(true)} title={t('costs.guide.title')}
              className="bg-surface-card border border-edge text-content-muted"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 14px', borderRadius: 12, fontSize: 'calc(14px * var(--fs-scale-body, 1))', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              <HelpCircle size={16} /> {t('costs.guide.open')}
            </button>
            {isTripOwner && (
              <button onClick={() => setResetOpen(true)} title={t('costs.resetTitle')}
                className="bg-surface-card border border-edge text-content-muted"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 14px', borderRadius: 12, fontSize: 'calc(14px * var(--fs-scale-body, 1))', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                <RotateCcw size={15} /> {t('costs.reset')}
              </button>
            )}
            <button onClick={() => setTabsModal({})}
              className="bg-surface-card border border-edge text-content"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 12, fontSize: 'calc(14px * var(--fs-scale-body, 1))', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Link2 size={16} /> {t('costs.tabs')}
            </button>
            <button onClick={settleAll} disabled={!(settlement?.flows || []).length}
              className="bg-surface-card border border-edge text-content disabled:opacity-40"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 12, fontSize: 'calc(14px * var(--fs-scale-body, 1))', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Check size={16} /> {t('costs.settleUp')}
            </button>
            <button onClick={() => { setEditing(null); setModalOpen(true) }}
              className="bg-[var(--text-primary)] text-[var(--bg-primary)]"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 12, fontSize: 'calc(14px * var(--fs-scale-body, 1))', fontWeight: 600, border: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Plus size={16} /> {t('costs.addExpense')}
            </button>
          </div>
        )}
      </div>

      {/* ── Summary cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 36 }} className="costs-summary">
        <SummaryCard label={t('costs.youOwe')} sub={t('costs.youOweSub')} amount={totals.owe} currency={base} locale={locale}
          icon={<ArrowDown size={18} />} tone="owe"
          foot={totals.owe > 0.01
            ? <FlowPills ids={(settlement?.flows || []).filter(f => f.from.user_id === me).map(f => f.to.user_id)} lead={t('costs.to')} Avatar={Avatar} name={personName} />
            : <span className="text-content-faint">{t('costs.allSettled')}</span>} />
        <SummaryCard label={t('costs.youreOwed')} sub={t('costs.youreOwedSub')} amount={totals.owed} currency={base} locale={locale}
          icon={<ArrowUp size={18} />} tone="owed"
          foot={totals.owed > 0.01
            ? <FlowPills ids={(settlement?.flows || []).filter(f => f.to.user_id === me).map(f => f.from.user_id)} lead={t('costs.from')} Avatar={Avatar} name={personName} />
            : <span className="text-content-faint">{t('costs.nothingOwed')}</span>} />
        <SummaryCard label={t('costs.outstanding')} sub={t('costs.outstandingSub')} amount={totals.outstanding} currency={base} locale={locale}
          icon={<AlertCircle size={18} />} tone="unfinished"
          foot={totals.outstandingCount > 0
            ? <span><b>{totals.outstandingCount}</b> {t('costs.outstandingItems')}</span>
            : <span className="text-content-faint">{t('costs.allSettled')}</span>} />
        <SummaryCard label={t('costs.totalSpend')} sub={t('costs.totalSpendSub')} amount={totals.totalSpend} currency={base} locale={locale}
          icon={<BarChart3 size={18} />} tone="total"
          foot={<span style={{ display: 'flex', gap: 16 }}><span>{t('costs.yourShare')} · <b>{fmt0(totals.myShare)}</b></span><span>{t('costs.youPaid')} · <b>{fmt0(totals.myPaid)}</b></span></span>} />
      </div>

      {/* ── Main grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32, alignItems: 'start' }} className="costs-grid">
        {/* expenses */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
            <h3 className="text-content tour-title" style={{ fontSize: 'calc(20px * var(--fs-scale-title, 1))', margin: 0 }}>
              {t('costs.expenses')}
            </h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="bg-surface-input border border-edge" style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 10, padding: '0 10px', height: 34 }}>
                <Search size={15} className="text-content-faint" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('costs.searchPlaceholder')}
                  className="text-content" style={{ border: 0, background: 'none', outline: 'none', fontSize: 'calc(13px * var(--fs-scale-body, 1))', width: 150, fontFamily: 'inherit' }} />
              </div>
              {filterControls}
              <div className="bg-surface-secondary" style={{ display: 'flex', borderRadius: 9, padding: 3 }}>
                {(['all', 'mine', 'owed'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={filter === f ? 'bg-surface-card text-content' : 'text-content-muted'}
                    style={{ padding: '6px 11px', fontSize: 'calc(12px * var(--fs-scale-body, 1))', borderRadius: 7, fontWeight: 500, border: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {t('costs.filter.' + f)}
                  </button>
                ))}
              </div>
              <button onClick={handleExportCsv} title={t('budget.exportCsv')} disabled={!budgetItems.length}
                className="bg-surface-input border border-edge text-content-muted disabled:opacity-40"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                <Download size={15} />
              </button>
            </div>
          </div>

          {dayBanner}
          {dayGroups.length === 0 ? (
            <div className="text-content-faint" style={{ textAlign: 'center', padding: '60px 20px' }}>
              {search ? t('costs.noMatch') : t('costs.emptyText')}
            </div>
          ) : dayGroups.map(g => {
            const dtot = g.entries.reduce((a, en) => en.kind === 'expense' ? a + baseTotal(en.e) : a, 0)
            return (
              <div key={g.day} style={{ marginBottom: 22 }}>
                {!dayFilter && (
                <div className={labelCls} style={{ display: 'flex', alignItems: 'center', margin: '0 0 10px 4px' }}>
                  {g.day}<span className="text-content-muted" style={{ marginLeft: 'auto', textTransform: 'none', letterSpacing: 0, fontWeight: 500, fontSize: 'calc(12px * var(--fs-scale-body, 1))' }}>{t('costs.spent', { amount: fmt(dtot) })}</span>
                </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {g.entries.map(en => en.kind === 'expense'
                    ? <ExpenseRow key={'e' + en.e.id} e={en.e} />
                    : <SettlementRow key={'s' + en.s.id} s={en.s} />)}
                </div>
              </div>
            )
          })}
        </div>

        {/* sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* settle up */}
          <div className={cardCls} style={{ borderRadius: 22, padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className={labelCls} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>{t('costs.settleUp')} · <span className="text-content">{(settlement?.flows || []).length}</span>
                <InfoDot title={t('costs.info.settleTitle')} size={13} style={{ margin: '-8px 0' }}><p style={{ margin: 0 }}>{t('costs.info.settleBody')}</p></InfoDot>
              </div>
              {canEdit && (
                <button onClick={() => setAddingPayment(true)}
                  className="text-content-muted bg-surface-secondary border border-edge"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 9px', borderRadius: 8, fontSize: 'calc(11.5px * var(--fs-scale-caption, 1))', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Plus size={13} /> {t('costs.addPayment')}
                </button>
              )}
            </div>
            <SettleFlows />
          </div>

          {/* balances */}
          <div className={cardCls} style={{ borderRadius: 22, padding: '22px 24px' }}>
            <div className={labelCls} style={{ marginBottom: 14 }}>{t('costs.balances')}</div>
            <BalancesList balances={settlement?.balances || []} />
          </div>

          {/* by category */}
          <div className={cardCls} style={{ borderRadius: 22, padding: '22px 24px' }}>
            <div className={labelCls} style={{ marginBottom: 14 }}>{t('costs.byCategory')}</div>
            <CategoryBreakdown />
          </div>
        </div>
      </div>
      </div>)}

      {modalOpen && (
        <ExpenseModal tripId={tripId} base={base} people={people} me={me} editing={editing}
          onCreateGuest={handleCreateGuest}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); loadBudgetItems(tripId); loadSettlement() }} />
      )}

      {guideOpen && <ExpensesGuideModal onClose={() => setGuideOpen(false)} />}
      {resetOpen && (
        <Modal isOpen onClose={() => setResetOpen(false)} title={t('costs.resetTitle')} size="md"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setResetOpen(false)} className="text-content-muted border border-edge" style={{ padding: '8px 16px', borderRadius: 10, background: 'none', fontSize: 'calc(13px * var(--fs-scale-body, 1))', cursor: 'pointer', fontFamily: 'inherit' }}>{t('common.cancel')}</button>
              <button onClick={handleReset} disabled={resetting}
                className="bg-[var(--danger)] text-white" style={{ padding: '8px 18px', borderRadius: 10, border: 0, fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: resetting ? 0.6 : 1 }}>
                {t('costs.resetConfirm')}
              </button>
            </div>
          }>
          <p className="text-content" style={{ margin: 0, fontSize: 'calc(13.5px * var(--fs-scale-body, 1))', lineHeight: 1.6 }}>{t('costs.resetWarning')}</p>
        </Modal>
      )}

      {(editingSettlement || addingPayment) && (
        <SettlementModal tripId={tripId} people={people} me={me} editing={editingSettlement} currency={base}
          onClose={() => { setEditingSettlement(null); setAddingPayment(false) }}
          onSaved={() => { setEditingSettlement(null); setAddingPayment(false); loadSettlement() }} />
      )}

      {tabsModal !== false && (
        <ExpenseTabsModal tripId={tripId} base={base} locale={locale} people={people} me={me} addItemFor={tabsModal.item ?? null}
          onClose={() => { setTabsModal(false); loadSettlement(); loadBudgetItems(tripId) }} />
      )}

      <style>{`
        .costs-root {
          --c-bg: #f8fafc; --c-bg2: oklch(0.965 0.01 70);
          --c-surface: #ffffff; --c-surface2: oklch(0.985 0.006 78);
          --c-ink: oklch(0.22 0.012 65); --c-ink2: oklch(0.42 0.012 65); --c-ink3: oklch(0.62 0.01 65);
          --c-line: oklch(0.92 0.008 70);
        }
        html.dark .costs-root {
          --c-bg: #121215; --c-bg2: #18181c;
          --c-surface: #1a1a1e; --c-surface2: #202027;
          --c-ink: #f4f4f5; --c-ink2: #a1a1aa; --c-ink3: #71717a;
          --c-line: #2a2a31;
        }
        .costs-root .bg-surface-card { background: var(--c-surface) !important; }
        .costs-root .bg-surface-secondary, .costs-root .bg-surface-input { background: var(--c-surface2) !important; }
        .costs-root .border-edge { border-color: var(--c-line) !important; }
        /* dark = neutral zinc + a touch of liquid glass, matching the dashboard */
        html.dark .costs-root .bg-surface-card {
          background: rgba(255,255,255,0.035) !important;
          border-color: rgba(255,255,255,0.08) !important;
          backdrop-filter: blur(20px) saturate(1.4);
          -webkit-backdrop-filter: blur(20px) saturate(1.4);
        }
        html.dark .costs-root .bg-surface-secondary,
        html.dark .costs-root .bg-surface-input { background: rgba(255,255,255,0.05) !important; }
        html.dark .costs-root .border-edge { border-color: rgba(255,255,255,0.08) !important; }
        .costs-root .text-content { color: var(--c-ink) !important; }
        .costs-root .text-content-muted { color: var(--c-ink2) !important; }
        .costs-root .text-content-faint { color: var(--c-ink3) !important; }
        .costs-root .exp-actions { opacity: 1; }
        @media (max-width: 1100px) {
          .costs-root .costs-summary { grid-template-columns: 1fr 1fr !important; }
          .costs-root .costs-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .costs-root .costs-summary { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )

  // ── shared settle-flow list ──────────────────────────────────────────────
  function SettleFlows() {
    const flows = settlement?.flows || []
    if (flows.length === 0) return (
      <div style={{ textAlign: 'center', padding: '14px 8px' }}>
        <div style={{ width: 46, height: 46, borderRadius: '50%', margin: '0 auto 10px', display: 'grid', placeItems: 'center', background: 'rgba(22,163,74,0.12)', color: 'var(--success)' }}><Check size={22} /></div>
        <div className="text-content" style={{ fontSize: 'calc(14.5px * var(--fs-scale-body, 1))', fontWeight: 600 }}>{t('costs.everyoneSquare')}</div>
        <div className="text-content-faint" style={{ fontSize: 'calc(12px * var(--fs-scale-body, 1))', marginTop: 2 }}>{t('costs.nothingOutstanding')}</div>
      </div>
    )
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {flows.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }} title={`${personName(f.from.user_id)} → ${f.to.user_id === me ? t('costs.youLower') : personName(f.to.user_id)}`}>
              <Avatar id={f.from.user_id} size={32} /><ArrowRight size={15} className="text-content-faint" /><Avatar id={f.to.user_id} size={32} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span className="text-content" style={{ fontSize: 'calc(14px * var(--fs-scale-body, 1))', fontWeight: 700 }}>{fmt(f.amount)}</span>
              {canEdit && <button onClick={() => settleFlow(f.from.user_id, f.to.user_id, f.amount)} className="bg-[var(--text-primary)] text-[var(--bg-primary)]" style={{ padding: '7px 12px', borderRadius: 9, fontSize: 'calc(12px * var(--fs-scale-body, 1))', fontWeight: 600, border: 0, cursor: 'pointer', fontFamily: 'inherit' }}>{t('costs.settle')}</button>}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ── mobile layout (Budget1Mobile.html): single flat column, total card on top ──
  function MobileBody() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
        {/* Total card — poster treatment: hot gradient + halftone dots. */}
        <section className="tour-gradient" style={{ color: '#fff', borderRadius: 22, padding: '20px 20px 16px', boxShadow: 'var(--shadow-lg)', position: 'relative', overflow: 'hidden' }}>
          <div className="tour-halftone" />
          <div className="tour-title" style={{ fontSize: 'calc(11.5px * var(--fs-scale-caption, 1))', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.75)', position: 'relative' }}>{t('costs.totalSpend')}</div>
          <div style={{ fontSize: 'calc(44px * var(--fs-scale-title, 1))', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, marginTop: 8, display: 'flex', alignItems: 'baseline' }}>{bigMoney(totals.totalSpend, 24, 'rgba(255,255,255,0.6)')}</div>
          <div style={{ display: 'flex', gap: 18, marginTop: 12, fontSize: 'calc(12px * var(--fs-scale-body, 1))', color: 'rgba(255,255,255,0.6)', flexWrap: 'wrap' }}>
            <span>{t('costs.yourShare')} · <b style={{ color: '#fff', fontWeight: 600 }}>{fmt0(totals.myShare)}</b></span>
            <span>{t('costs.youPaid')} · <b style={{ color: '#fff', fontWeight: 600 }}>{fmt0(totals.myPaid)}</b></span>
          </div>
          {canEdit && (
            <button onClick={() => { setEditing(null); setModalOpen(true) }} style={{ marginTop: 16, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.16)', color: '#fff', padding: 13, borderRadius: 14, fontSize: 'calc(14px * var(--fs-scale-body, 1))', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Plus size={17} /> {t('costs.addExpense')}
            </button>
          )}
        </section>

        {/* Owe / Owed */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className={cardCls} style={{ borderRadius: 18, padding: 16 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', marginBottom: 10, background: '#dc262622', color: 'var(--danger)' }}><ArrowDown size={17} /></div>
            <div className="text-content" style={{ fontSize: 'calc(12.5px * var(--fs-scale-body, 1))', fontWeight: 600 }}>{t('costs.youOwe')}</div>
            <div className="text-content-faint" style={{ fontSize: 'calc(10.5px * var(--fs-scale-caption, 1))' }}>{t('costs.youOweSub')}</div>
            <div style={{ fontSize: 'calc(27px * var(--fs-scale-title, 1))', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, marginTop: 12, display: 'flex', alignItems: 'baseline', color: 'var(--danger)' }}>{bigMoney(totals.owe, 16, 'var(--c-ink3)')}</div>
          </div>
          <div className={cardCls} style={{ borderRadius: 18, padding: 16 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', marginBottom: 10, background: '#16a34a22', color: 'var(--success)' }}><ArrowUp size={17} /></div>
            <div className="text-content" style={{ fontSize: 'calc(12.5px * var(--fs-scale-body, 1))', fontWeight: 600 }}>{t('costs.youreOwed')}</div>
            <div className="text-content-faint" style={{ fontSize: 'calc(10.5px * var(--fs-scale-caption, 1))' }}>{t('costs.youreOwedSub')}</div>
            <div style={{ fontSize: 'calc(27px * var(--fs-scale-title, 1))', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, marginTop: 12, display: 'flex', alignItems: 'baseline', color: 'var(--success)' }}>{bigMoney(totals.owed, 16, 'var(--c-ink3)')}</div>
          </div>
        </div>

        {/* Outstanding */}
        <div className={cardCls} style={{ borderRadius: 18, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: '#d9770622', color: '#d97706', flexShrink: 0 }}><AlertCircle size={17} /></div>
            <div style={{ minWidth: 0 }}>
              <div className="text-content" style={{ fontSize: 'calc(12.5px * var(--fs-scale-body, 1))', fontWeight: 600 }}>{t('costs.outstanding')}</div>
              <div className="text-content-faint" style={{ fontSize: 'calc(10.5px * var(--fs-scale-caption, 1))' }}>{t('costs.outstandingSub')}</div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 'calc(27px * var(--fs-scale-title, 1))', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, display: 'flex', alignItems: 'baseline', color: '#d97706' }}>{bigMoney(totals.outstanding, 16, 'var(--c-ink3)')}</div>
          </div>
        </div>

        {/* Settle up */}
        <div className={cardCls} style={{ borderRadius: 18, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8 }}>
            <div className="text-content" style={{ fontSize: 'calc(19px * var(--fs-scale-subtitle, 1))', fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'baseline', gap: 8 }}>{t('costs.settleUp')} <span className="text-content-faint" style={{ fontSize: 'calc(12px * var(--fs-scale-body, 1))', fontWeight: 500 }}>{(settlement?.flows || []).length}</span></div>
            {canEdit && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setTabsModal({})} className="text-content-muted bg-surface-card border border-edge" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 9, fontSize: 'calc(11.5px * var(--fs-scale-caption, 1))', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}><Link2 size={13} /> {t('costs.tabs')}</button>
                <button onClick={() => setAddingPayment(true)} className="text-content-muted bg-surface-card border border-edge" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 9, fontSize: 'calc(11.5px * var(--fs-scale-caption, 1))', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}><Plus size={13} /> {t('costs.addPayment')}</button>
              </div>
            )}
          </div>
          <SettleFlows />
        </div>

        {/* Expenses */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div className="text-content tour-title" style={{ fontSize: 'calc(17px * var(--fs-scale-subtitle, 1))' }}>{t('costs.expenses')}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setGuideOpen(true)} title={t('costs.guide.title')}
                className="bg-surface-card border border-edge text-content-muted"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                <HelpCircle size={15} />
              </button>
              {isTripOwner && (
                <button onClick={() => setResetOpen(true)} title={t('costs.resetTitle')}
                  className="bg-surface-card border border-edge text-content-muted"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                  <RotateCcw size={15} />
                </button>
              )}
              <button onClick={handleExportCsv} title={t('budget.exportCsv')} disabled={!budgetItems.length}
                className="bg-surface-card border border-edge text-content-muted disabled:opacity-40"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                <Download size={15} />
              </button>
            </div>
          </div>
          <div className="bg-surface-card border border-edge" style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12, padding: '0 12px', height: 42 }}>
            <Search size={16} className="text-content-faint" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('costs.searchPlaceholder')} className="text-content" style={{ border: 0, background: 'none', outline: 'none', fontSize: 'calc(14px * var(--fs-scale-body, 1))', width: '100%', fontFamily: 'inherit' }} />
          </div>
          <div className="bg-surface-secondary" style={{ display: 'flex', borderRadius: 11, padding: 3, gap: 2 }}>
            {(['all', 'mine', 'owed'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={filter === f ? 'bg-surface-card text-content' : 'text-content-muted'} style={{ flex: 1, padding: '8px 6px', fontSize: 'calc(12.5px * var(--fs-scale-body, 1))', fontWeight: 500, borderRadius: 8, border: 0, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>{t('costs.filter.' + f)}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <CustomSelect value={catFilter} onChange={v => setCatFilter(String(v))} options={categoryOptions} size="sm" style={{ flex: 1, minWidth: 0 }} />
            <CustomSelect value={dayFilter} onChange={v => setDayFilter(String(v))} options={dayOptions} size="sm" searchable style={{ flex: 1, minWidth: 0 }} />
          </div>
          {dayBanner}
          {dayGroups.length === 0
            ? <div className="text-content-faint" style={{ textAlign: 'center', padding: '36px 16px', fontSize: 'calc(13px * var(--fs-scale-body, 1))' }}>{search ? t('costs.noMatch') : t('costs.emptyText')}</div>
            : dayGroups.map(g => {
                const dtot = g.entries.reduce((a, en) => en.kind === 'expense' ? a + baseTotal(en.e) : a, 0)
                return (
                  <div key={g.day} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {!dayFilter && <div className={labelCls} style={{ display: 'flex', alignItems: 'center', padding: '0 2px' }}>{g.day}<span className="text-content-muted" style={{ marginLeft: 'auto', textTransform: 'none', letterSpacing: 0, fontWeight: 500, fontSize: 'calc(11.5px * var(--fs-scale-caption, 1))' }}>{t('costs.spent', { amount: fmt(dtot) })}</span></div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{g.entries.map(en => en.kind === 'expense'
                      ? <ExpenseRow key={'e' + en.e.id} e={en.e} />
                      : <SettlementRow key={'s' + en.s.id} s={en.s} />)}</div>
                  </div>
                )
              })}
        </div>

        {/* Balances */}
        <div className={cardCls} style={{ borderRadius: 18, padding: 16 }}>
          <div className={labelCls} style={{ marginBottom: 14 }}>{t('costs.balances')}</div>
          <BalancesList balances={settlement?.balances || []} />
        </div>

        {/* By category */}
        <div className={cardCls} style={{ borderRadius: 18, padding: 16 }}>
          <div className={labelCls} style={{ marginBottom: 14 }}>{t('costs.byCategory')}</div>
          <CategoryBreakdown />
        </div>
      </div>
    )
  }

  // ── inline subcomponents (close over helpers) ────────────────────────────
  function ExpenseRow({ e }: { e: BudgetItem }) {
    const c = catMeta(e.category)
    const Icon = c.Icon
    const cur = curOf(e)
    const payers = (e.payers || []).filter(p => p.amount > 0)
    const net = round2(myPaidOf(e) - myShareOf(e))
    const unfinished = isUnfinished(e)
    return (
      <div className="bg-surface-card border border-edge exp-row" style={{ display: 'grid', gridTemplateColumns: '46px 1fr auto', gap: 16, alignItems: 'center', borderRadius: 18, padding: '16px 20px' }}>
        <span style={{ position: 'relative', width: 46, height: 46, borderRadius: 13, display: 'grid', placeItems: 'center', background: c.color + '22', color: c.color }}>
          <Icon size={21} />
          {isMobile && unfinished && (
            <span title={t('costs.unfinishedHint')} style={{ position: 'absolute', bottom: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: '#d97706', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 'calc(12px * var(--fs-scale-body, 1))', fontWeight: 800, lineHeight: 1, border: '2px solid var(--bg-card)' }}>!</span>
          )}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
            <span className="text-content" style={{ fontSize: 'calc(15px * var(--fs-scale-subtitle, 1))', fontWeight: 600 }}>{e.name}</span>
            {!!e.is_private && (
              <span title={t('costs.personal')} style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--text-faint)', flexShrink: 0 }}>
                <Lock size={13} />
              </span>
            )}
            {e.receipt_file_id != null && (
              <button type="button" title={t('costs.viewReceipt')}
                onClick={() => openFile(`/api/trips/${tripId}/files/${e.receipt_file_id}/download`).catch(() => toast.error(t('common.unknownError')))}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 26, minHeight: 26, margin: '-6px -4px', background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'var(--text-faint)', flexShrink: 0 }}>
                <Receipt size={13} />
              </button>
            )}
            {unfinished && !isMobile && (
              <span title={t('costs.unfinishedHint')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px 2px 6px', borderRadius: 999, background: 'rgba(217,119,6,0.14)', color: '#d97706', fontSize: 'calc(11px * var(--fs-scale-caption, 1))', fontWeight: 700, flexShrink: 0 }}>
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#d97706', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 'calc(10px * var(--fs-scale-caption, 1))', fontWeight: 800 }}>!</span>
                {t('costs.unfinished')}
              </span>
            )}
          </div>
          {payers.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 5 }}>
              {payers.map(p => (
                <span key={p.user_id} className="bg-surface-secondary border border-edge" title={personName(p.user_id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px 3px 3px', borderRadius: 999, fontSize: 'calc(11.5px * var(--fs-scale-caption, 1))' }}>
                  <Avatar id={p.user_id} size={18} />
                  <span className="text-content" style={{ fontWeight: 700 }}>{fmt(convert(p.amount, cur))}</span>
                </span>
              ))}
            </div>
          )}
          {!isMobile && (
            <div className="text-content-faint" style={{ fontSize: 'calc(12px * var(--fs-scale-body, 1))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {t(c.labelKey)}
              {e.place_name ? <> · <MapPin size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /> {e.place_name}</> : ''}
              {e.supplier_name ? <> · <Store size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /> {e.supplier_name}</> : ''}
              {cur !== base ? ` · ${fmt(e.total_price, cur)} → ${fmt(baseTotal(e))}` : ''}
            </div>
          )}
          {isMobile && (e.place_name || e.supplier_name) && (
            <div className="text-content-faint" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'calc(12px * var(--fs-scale-body, 1))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {e.place_name && <><MapPin size={11} style={{ flexShrink: 0 }} /> {e.place_name}</>}
              {e.place_name && e.supplier_name && <span> · </span>}
              {e.supplier_name && <><Store size={11} style={{ flexShrink: 0 }} /> {e.supplier_name}</>}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, alignSelf: 'center' }}>
          <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
            <div className="text-content" style={{ fontSize: 'calc(18px * var(--fs-scale-subtitle, 1))', fontWeight: 600 }}>{fmt(baseTotal(e))}</div>
            {!isUnfinished && (e.members || []).length > 0 && Math.abs(net) > 0.01 && (
              <div style={{ fontSize: 'calc(12px * var(--fs-scale-body, 1))', marginTop: 2, fontWeight: 500, whiteSpace: 'nowrap', color: net > 0 ? 'var(--success)' : 'var(--danger)' }}>
                {net > 0 ? t('costs.youLent', { amount: fmt(net) }) : t('costs.youBorrowed', { amount: fmt(-net) })}
              </div>
            )}
          </div>
          {canEdit && (
            <div className="exp-actions" style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
              <button title={t('common.edit')} onClick={() => { setEditing(e); setModalOpen(true) }} className="bg-surface-secondary border border-edge text-content-muted" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 999, cursor: 'pointer' }}><Pencil size={15} /></button>
              <button title={t('costs.addToTab')} onClick={() => setTabsModal({ item: e })} className="bg-surface-secondary border border-edge text-content-muted" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 999, cursor: 'pointer' }}><Link2 size={15} /></button>
              <button title={t('common.delete')} onClick={() => handleDelete(e.id)} className="bg-surface-secondary border border-edge" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 999, cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={15} /></button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // A settle-up payment as a ledger row — visually distinct from an expense, with
  // inline edit + undo (reuses deleteSettlement) so it isn't buried in a modal.
  function SettlementRow({ s }: { s: Settlement }) {
    return (
      <div className="bg-surface-card border border-edge exp-row" style={{ display: 'grid', gridTemplateColumns: '46px 1fr auto', gap: 16, alignItems: 'center', borderRadius: 18, padding: '16px 20px' }}>
        <span style={{ width: 46, height: 46, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'rgba(22,163,74,0.12)', color: 'var(--success)' }}><ArrowLeftRight size={21} /></span>
        <div style={{ minWidth: 0 }}>
          <div className="text-content" style={{ fontSize: 'calc(15px * var(--fs-scale-subtitle, 1))', fontWeight: 600, marginBottom: 6 }}>{t('costs.payment')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }} title={`${personName(s.from_user_id)} → ${personName(s.to_user_id)}`}>
            <Avatar id={s.from_user_id} size={20} /><ArrowRight size={13} className="text-content-faint" /><Avatar id={s.to_user_id} size={20} />
            <span className="text-content-faint" style={{ fontSize: 'calc(12px * var(--fs-scale-body, 1))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{personName(s.from_user_id)} → {personName(s.to_user_id)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, alignSelf: 'center' }}>
          <div className="text-content" style={{ fontSize: 'calc(18px * var(--fs-scale-subtitle, 1))', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmt(s.amount)}</div>
          {canEdit && (
            <div className="exp-actions" style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
              <button title={t('common.edit')} onClick={() => setEditingSettlement(s)} className="bg-surface-secondary border border-edge text-content-muted" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 999, cursor: 'pointer' }}><Pencil size={15} /></button>
              <button title={t('costs.undo')} onClick={() => undoSettlement(s.id)} className="bg-surface-secondary border border-edge" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 999, cursor: 'pointer', color: 'var(--danger)' }}><RotateCcw size={15} /></button>
            </div>
          )}
        </div>
      </div>
    )
  }

  function BalancesList({ balances }: { balances: SettlementData['balances'] }) {
    const rows = people.map(p => balances.find(b => b.user_id === p.id) || { user_id: p.id, username: p.username, avatar_url: null, balance: 0 })
    const max = Math.max(1, ...rows.map(r => Math.abs(r.balance)))
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rows.map(r => {
          const pct = Math.min(100, Math.abs(r.balance) / max * 100)
          const pos = r.balance > 0.01, neg = r.balance < -0.01
          return (
            <div key={r.user_id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 10, alignItems: 'center' }}>
              <Avatar id={r.user_id} size={28} />
              <div>
                <div className="text-content" style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 600 }}>{personName(r.user_id)}</div>
                <div className="bg-surface-secondary" style={{ height: 5, borderRadius: 3, marginTop: 5, position: 'relative', overflow: 'hidden' }}>
                  <span style={{ position: 'absolute', left: '50%', top: -1, bottom: -1, width: 1, background: 'var(--border-primary)' }} />
                  {pos && <span style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: pct / 2 + '%', background: 'var(--success)', borderRadius: 3 }} />}
                  {neg && <span style={{ position: 'absolute', right: '50%', top: 0, bottom: 0, width: pct / 2 + '%', background: 'var(--danger)', borderRadius: 3 }} />}
                </div>
              </div>
              <div style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 600, textAlign: 'right', color: pos ? 'var(--success)' : neg ? 'var(--danger)' : 'var(--text-faint)' }}>
                {pos ? '+' + fmt(r.balance) : neg ? '−' + fmt(-r.balance) : fmt(0)}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  function CategoryBreakdown() {
    const tot: Record<string, number> = {}
    for (const e of budgetItems) { const k = catMeta(e.category).key; tot[k] = (tot[k] || 0) + baseTotal(e) }
    const rows = COST_CATEGORY_LIST.filter(c => (tot[c.key] || 0) > 0).sort((a, b) => (tot[b.key] || 0) - (tot[a.key] || 0))
    if (rows.length === 0) return <div className="text-content-faint" style={{ fontSize: 'calc(12.5px * var(--fs-scale-body, 1))' }}>{t('costs.noCategories')}</div>
    // Bars are scaled relative to the most expensive category (the top row fills the
    // bar), not to the trip grand total — makes the relative ranking readable.
    const maxCat = Math.max(0, ...rows.map(c => tot[c.key] || 0))
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map(c => {
          const v = tot[c.key]; const pct = maxCat ? v / maxCat * 100 : 0
          return (
            <div key={c.key} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 10, alignItems: 'center' }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color }} />
              <span className="text-content" style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 500 }}>{t(c.labelKey)}</span>
              <span className="text-content-muted" style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 600 }}>{fmt0(v)}</span>
              <div className="bg-surface-secondary" style={{ gridColumn: '1 / -1', height: 5, borderRadius: 3, overflow: 'hidden', marginTop: -2 }}>
                <span style={{ display: 'block', height: '100%', width: pct + '%', background: c.color, borderRadius: 3 }} />
              </div>
            </div>
          )
        })}
      </div>
    )
  }
}

// ── pure subcomponents ─────────────────────────────────────────────────────
function SummaryCard({ label, sub, amount, currency, locale, icon, foot, tone }: { label: string; sub: string; amount: number; currency: string; locale: string; icon: React.ReactNode; foot: React.ReactNode; tone: 'owe' | 'owed' | 'total' | 'unfinished' }) {
  const total = tone === 'total'
  const accent = tone === 'owe' ? 'var(--danger)' : tone === 'owed' ? 'var(--success)' : tone === 'unfinished' ? '#d97706' : undefined
  const muted = total ? 'rgba(255,255,255,0.55)' : 'var(--text-faint)'
  // formatToParts keeps the design's "big integer + muted symbol/decimals" styling
  // while letting Intl place the symbol and pick separators per locale + currency.
  let parts: Intl.NumberFormatPart[] | null = null
  try {
    const d = currencyDecimals(currency)
    parts = new Intl.NumberFormat(currencyLocale(currency), { style: 'currency', currency: (currency || 'EUR').toUpperCase(), minimumFractionDigits: d, maximumFractionDigits: d }).formatToParts(amount || 0)
  } catch { parts = null }
  const big = (p: Intl.NumberFormatPart) => p.type === 'integer' || p.type === 'group' || p.type === 'minusSign'
  return (
    <div className={total ? 'tour-gradient' : 'bg-surface-card border border-edge'}
      style={{ borderRadius: 22, padding: '26px 28px', position: 'relative', overflow: 'hidden', ...(total ? { color: '#fff' } : {}) }}>
      {total && <div className="tour-halftone" />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <span style={{ width: 36, height: 36, borderRadius: 11, display: 'grid', placeItems: 'center', background: total ? 'rgba(255,255,255,0.12)' : (accent + '22'), color: total ? '#fff' : accent }}>{icon}</span>
        <div>
          <div style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 600 }} className={total ? '' : 'text-content'}>{label}</div>
          <div style={{ fontSize: 'calc(12px * var(--fs-scale-body, 1))', opacity: total ? 0.6 : 1 }} className={total ? '' : 'text-content-faint'}>{sub}</div>
        </div>
      </div>
      <div style={{ fontSize: 'calc(46px * var(--fs-scale-title, 1))', fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1, marginTop: 20, display: 'flex', alignItems: 'baseline', color: total ? '#fff' : accent }}>
        {parts
          ? parts.map((p, i) => <span key={i} style={big(p) ? undefined : { fontSize: 'calc(26px * var(--fs-scale-title, 1))', fontWeight: 500, color: muted }}>{p.value}</span>)
          : <span>{formatMoney(amount, currency, locale)}</span>}
      </div>
      <div style={{ marginTop: 16, fontSize: 'calc(12.5px * var(--fs-scale-body, 1))', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', opacity: total ? 0.85 : 1 }}>{foot}</div>
    </div>
  )
}

function FlowPills({ ids, lead, Avatar, name }: { ids: number[]; lead: string; Avatar: (p: { id: number; size?: number }) => React.JSX.Element; name: (id: number) => string }) {
  const uniq = Array.from(new Set(ids))
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span className="text-content-faint">{lead}</span>
      {uniq.map(id => (
        <span key={id} className="bg-surface-secondary border border-edge text-content" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px 3px 3px', borderRadius: 999, fontSize: 'calc(12px * var(--fs-scale-body, 1))', fontWeight: 600 }}>
          <Avatar id={id} size={18} />{name(id)}
        </span>
      ))}
    </span>
  )
}

// Add or edit a settle-up payment (from / to / amount). Reachable inline from the
// ledger row and from a manual "Add payment" button, so recording "I sent money to
// X" works the same whether or not there's an outstanding expense behind it.
function SettlementModal({ tripId, people, me, editing, currency, onClose, onSaved }: {
  tripId: number; people: TripMember[]; me: number; editing: Settlement | null; currency: string; onClose: () => void; onSaved: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const otherDefault = people.find(p => p.id !== me)?.id ?? me
  const [fromId, setFromId] = useState<string>(String(editing?.from_user_id ?? me))
  const [toId, setToId] = useState<string>(String(editing?.to_user_id ?? otherDefault))
  const [amount, setAmount] = useState<string>(editing ? String(editing.amount) : '')
  const [saving, setSaving] = useState(false)

  const amt = parseFloat(amount) || 0
  const valid = amt > 0 && fromId !== toId
  const opts = people.map(p => ({ value: String(p.id), label: p.id === me ? t('costs.you') : p.username }))

  const save = async () => {
    if (!valid) return
    setSaving(true)
    const data = { from_user_id: Number(fromId), to_user_id: Number(toId), amount: amt, currency }
    try {
      if (editing) await budgetApi.updateSettlement(tripId, editing.id, data)
      else await budgetApi.createSettlement(tripId, data)
      onSaved()
    } catch { toast.error(t('common.unknownError')) } finally { setSaving(false) }
  }

  const inputCls = 'w-full bg-surface-input border border-edge text-content'
  const labelCls = 'block text-[11px] font-semibold uppercase tracking-[0.08em] text-content-faint mb-[6px]'

  return (
    <Modal isOpen onClose={onClose} title={editing ? t('costs.editPayment') : t('costs.addPayment')} size="md"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} className="text-content-muted border border-edge" style={{ padding: '8px 16px', borderRadius: 10, background: 'none', fontSize: 'calc(13px * var(--fs-scale-body, 1))', cursor: 'pointer', fontFamily: 'inherit' }}>{t('common.cancel')}</button>
          <button onClick={save} disabled={!valid || saving} className="bg-[var(--text-primary)] text-[var(--bg-primary)]" style={{ padding: '8px 20px', borderRadius: 10, border: 0, fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 600, cursor: !valid || saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: !valid || saving ? 0.5 : 1 }}>{editing ? t('common.save') : t('costs.addPayment')}</button>
        </div>
      }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className={labelCls}>{t('costs.from')}</label>
          <CustomSelect value={fromId} onChange={v => setFromId(String(v))} options={opts} style={{ width: '100%' }} />
        </div>
        <div>
          <label className={labelCls}>{t('costs.to')}</label>
          <CustomSelect value={toId} onChange={v => setToId(String(v))} options={opts} style={{ width: '100%' }} />
        </div>
        <div>
          <label className={labelCls}>{t('costs.amount')}</label>
          <input type="text" inputMode="decimal" placeholder="0.00" value={amount}
            onChange={e => setAmount(e.target.value.replace(',', '.'))} className={inputCls} style={{ borderRadius: 10, padding: '11px 13px', fontSize: 'calc(14px * var(--fs-scale-body, 1))', outline: 'none', fontWeight: 600 }} />
        </div>
      </div>
    </Modal>
  )
}

// ── Add / edit expense modal ───────────────────────────────────────────────
export interface ExpensePrefill {
  name?: string
  category?: string
  amount?: number
  reservationId?: number
  /** Pre-pin the expense to a venue (the venue card's "Add expense" flow). */
  placeId?: number
}

export function ExpenseModal({ tripId, base, people, me, editing, prefill, onCreateGuest, onClose, onSaved }: {
  tripId: number; base: string; people: TripMember[]; me: number; editing: BudgetItem | null; prefill?: ExpensePrefill;
  /** Create an off-platform person as a trip guest, inline from the split editor. */
  onCreateGuest?: (name: string) => Promise<TripMember | null>;
  onClose: () => void; onSaved: () => void
}) {
  const { t, locale } = useTranslation()
  const toast = useToast()
  const { addBudgetItem, updateBudgetItem } = useTripStore()
  const { convert } = useExchangeRates(base)
  const sym = (c: string) => SYMBOLS[c] || (c + ' ')

  const [name, setName] = useState(editing?.name || prefill?.name || '')
  const [cat, setCat] = useState<string>(editing ? catMeta(editing.category).key : (prefill?.category || 'food'))
  const [currency, setCurrency] = useState((editing?.currency || base).toUpperCase())
  const [day, setDay] = useState(editing?.expense_date || new Date().toISOString().slice(0, 10))
  const [total, setTotal] = useState<string>(() => {
    if (editing) return editing.total_price ? String(editing.total_price) : ''
    if (prefill?.amount != null) return String(prefill.amount)
    return ''
  })
  const [participants, setParticipants] = useState<Set<number>>(() =>
    editing ? new Set((editing.members || []).map(m => m.user_id)) : new Set(people.map(p => p.id)))

  // Payer state: 0 represents "Nobody (planning entry)"
  const [payerId, setPayerId] = useState<number>(() => {
    const existingPayer = (editing?.payers || []).find(p => p.amount > 0)
    return existingPayer ? existingPayer.user_id : me
  })

  const [splitMode, setSplitMode] = useState<'equally' | 'custom' | 'ticket'>(() => {
    if (editing?.note && editing.note.startsWith('TICKETJSON:')) {
      return 'ticket'
    }
    if (editing && editing.members && editing.members.length > 0) {
      const hasCustom = editing.members.some(m => m.amount !== null && m.amount !== undefined)
      return hasCustom ? 'custom' : 'equally'
    }
    return 'equally'
  })

  const [ticketItems, setTicketItems] = useState<TicketItem[]>(() => {
    if (editing?.note && editing.note.startsWith('TICKETJSON:')) {
      try {
        const parsed = JSON.parse(editing.note.slice(11))
        return (parsed.items || []).map((item: any) => ({
          id: String(Math.random()),
          name: item.name,
          price: String(item.price),
          // Legacy rows have no qty (their price was the line total) — qty 1
          // keeps the amounts identical.
          qty: String(item.qty || 1),
          participants: new Set(item.parts || [])
        }))
      } catch {
        return []
      }
    }
    return []
  })

  const [customAmounts, setCustomAmounts] = useState<Record<number, string>>(() => {
    const m: Record<number, string> = {}
    if (editing && editing.members) {
      for (const member of editing.members) {
        if (member.amount !== null && member.amount !== undefined) {
          m[member.user_id] = String(member.amount)
        }
      }
    }
    return m
  })

  const [saving, setSaving] = useState(false)

  // Personal expenses (visible only to their creator, excluded from the group
  // settlement). Only the creator's is_private change is honored server-side, so
  // the toggle is hidden when editing someone else's item.
  const [isPrivate, setIsPrivate] = useState(!!editing?.is_private)
  const canTogglePrivate = !editing || editing.created_by == null || editing.created_by === me

  // Scanned/attached receipt: kept across edits, set by a successful (or even
  // failed-but-stored, 409/502) receipt scan.
  const [receiptFileId, setReceiptFileId] = useState<number | null>(editing?.receipt_file_id ?? null)
  const [scanning, setScanning] = useState(false)
  const scanInputRef = useRef<HTMLInputElement>(null)

  // Venue link: pin the expense to one of the event's venues. The list loads
  // lazily; only visible venues are offered (the server enforces that too).
  const [placeId, setPlaceId] = useState<number | null>(editing?.place_id ?? prefill?.placeId ?? null)
  const [venues, setVenues] = useState<{ id: number; name: string }[] | null>(null)
  useEffect(() => {
    let live = true
    placesApi.list(tripId)
      .then((res: { places?: { id: number; name: string }[] }) => { if (live) setVenues(res.places || []) })
      .catch(() => { if (live) setVenues([]) })
    return () => { live = false }
  }, [tripId])

  // Supplier link: the instance-wide vendor book. Auto-set by a receipt scan;
  // the list loads lazily like venues.
  const [supplierId, setSupplierId] = useState<number | null>((editing as { supplier_id?: number | null } | null)?.supplier_id ?? null)
  const [supplierList, setSupplierList] = useState<{ id: number; name: string }[] | null>(null)
  useEffect(() => {
    let live = true
    suppliersApi.list()
      .then((res: { suppliers?: { id: number; name: string }[] }) => { if (live) setSupplierList(res.suppliers || []) })
      .catch(() => { if (live) setSupplierList([]) })
    return () => { live = false }
  }, [])

  // A personal expense is never split — ticket mode (and its derived total)
  // only applies while the expense is a group one.
  const isTicketMode = splitMode === 'ticket' && !isPrivate

  const ticketInfo = useMemo(() => {
    return calculateTicketShares(ticketItems)
  }, [ticketItems])

  const totalNum = isTicketMode ? ticketInfo.total : (parseFloat(total) || 0)
  const splitSum = [...participants].reduce((sum, id) => sum + (parseFloat(customAmounts[id]) || 0), 0)
  const customBalanced = Math.round(splitSum * 100) === Math.round(totalNum * 100)
  const each = participants.size > 0 ? totalNum / participants.size : 0
  const equalShares = useMemo(() => {
    return splitEqualShares(totalNum, [...participants].map(id => ({ user_id: id })), editing?.id || 0)
  }, [totalNum, participants, editing])

  const placeholderShares = useMemo(() => {
    const emptyParts = [...participants].filter(id => !customAmounts[id])
    if (emptyParts.length === 0) return {}

    const enteredSum = [...participants]
      .filter(id => customAmounts[id])
      .reduce((sum, id) => sum + (parseFloat(customAmounts[id]) || 0), 0)
    const remaining = Math.max(0, totalNum - enteredSum)

    return splitEqualShares(remaining, emptyParts.map(id => ({ user_id: id })), editing?.id || 0)
  }, [totalNum, participants, customAmounts, editing])
  
  const ticketValid = ticketItems.length > 0 && ticketItems.every(item => item.name.trim().length > 0 && (parseFloat(item.price) || 0) > 0 && (parseFloat(item.qty || '1') || 0) >= 1 && item.participants.size > 0)
  const valid = name.trim().length > 0 && (
    isPrivate
      ? totalNum > 0 // personal: just a name and an amount — nothing to split
      : isTicketMode
        ? ticketValid
        : totalNum > 0 && (participants.size === 0 || splitMode === 'equally' || customBalanced)
  )

  const onTotalChange = (v: string) => {
    setTotal(v.replace(',', '.'))
  }

  const handleCustomAmountChange = (id: number, val: string) => {
    val = val.replace(',', '.')
    if (/^\d*\.?\d{0,2}$/.test(val) || val === '') {
      setCustomAmounts(prev => ({ ...prev, [id]: val }))
    }
  }

  const handleAddEmptyItem = () => {
    setTicketItems(prev => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        name: '',
        price: '',
        qty: '1',
        participants: new Set(people.map(p => p.id))
      }
    ])
  }

  const handleUpdateItemQty = (id: string, qty: string) => {
    if (/^\d{0,3}$/.test(qty)) {
      setTicketItems(prev => prev.map(item => item.id === id ? { ...item, qty } : item))
    }
  }

  const handleUpdateItemName = (id: string, name: string) => {
    setTicketItems(prev => prev.map(item => item.id === id ? { ...item, name } : item))
  }

  const handleUpdateItemPrice = (id: string, price: string) => {
    price = price.replace(',', '.')
    if (/^\d*\.?\d{0,2}$/.test(price) || price === '') {
      setTicketItems(prev => prev.map(item => item.id === id ? { ...item, price } : item))
    }
  }

  const handleRemoveItem = (id: string) => {
    setTicketItems(prev => prev.filter(item => item.id !== id))
  }

  const handleToggleItemParticipant = (itemId: string, userId: number) => {
    setTicketItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const nextParts = new Set(item.participants)
        if (nextParts.has(userId)) nextParts.delete(userId)
        else nextParts.add(userId)
        return { ...item, participants: nextParts }
      }
      return item
    }))
  }

  const handleScanPick = async (pickedList: File[]) => {
    setScanning(true)
    try {
      // Several files = several PHOTOS of one long docket (iOS lets you pick
      // multiple from the library or Files). A PDF (e.g. an iOS Notes/Files
      // document scan) always travels alone — drop accompanying files.
      let picked = pickedList
      if (picked.length > 1) {
        const pdf = picked.find(f => f.type === 'application/pdf')
        picked = pdf ? [pdf] : picked.slice(0, 6)
      }
      const fd = new FormData()
      for (const p of picked) {
        const file = await prepareReceiptImage(p)
        fd.append('file', file, file.name)
      }
      const res: ReceiptScanResponse = await budgetApi.scanReceipt(tripId, fd)
      if (res.file?.id) setReceiptFileId(res.file.id)
      // The merchant landed in the vendor book (and maybe on the map): link
      // supplier + venue on this expense and refresh the pickers.
      if (res.supplier) {
        setSupplierId(res.supplier.id)
        setSupplierList(list => list && !list.some(s => s.id === res.supplier!.id) ? [...list, { id: res.supplier!.id, name: res.supplier!.name }] : list)
      }
      if (res.place) {
        setPlaceId(res.place.id)
        setVenues(list => list && !list.some(v => v.id === res.place!.id) ? [...list, { id: res.place!.id, name: res.place!.name }] : list)
      }
      if (res.place) toast.success(t('costs.autoLinked', { name: res.place.name }))
      else if (res.supplier) toast.success(t('costs.autoLinkedSupplier', { name: res.supplier.name }))
      const receipt = res.receipt
      if (receipt?.merchant && !name.trim()) setName(receipt.merchant)
      if (receipt?.date) setDay(receipt.date)
      if (receipt?.currency) setCurrency(receipt.currency.toUpperCase())
      // Fill the manual total too — it's what a personal (no-split) expense
      // uses, and in group ticket mode the field is derived anyway.
      if (receipt?.total != null && receipt.total > 0) setTotal(String(receipt.total))
      const items = receipt?.items || []
      if (items.length > 0) {
        setSplitMode('ticket')
        // Participants start EMPTY on purpose: the payer must explicitly assign
        // who shared each line — nobody gets billed for lines they didn't have.
        setTicketItems(items.map(item => {
          // Real qty × unit-price lines when the extraction gives a unit price
          // that multiplies back to the printed line total exactly; otherwise
          // qty 1 at the line total, so the receipt's numbers are never off.
          const qty = Math.max(1, Math.round(item.quantity || 1))
          const unit = item.unit_price
          const clean = qty > 1 && unit != null && Math.abs(Math.round(unit * qty * 100) - Math.round(item.price * 100)) === 0
          return {
            id: String(Date.now() + Math.random()),
            name: item.name,
            qty: clean ? String(qty) : '1',
            price: clean ? String(unit) : String(item.price),
            participants: new Set<number>(),
          }
        }))
      }
      for (const w of res.warnings || []) toast.warning(w)
    } catch (err) {
      // 409 (no AI / text-only model) and 502 (AI failed) carry a human-readable
      // error plus the stored file — keep it attached to the manual entry.
      const resp = (err as { response?: { data?: { error?: string; file?: { id?: number } } } })?.response?.data
      if (resp?.file?.id) setReceiptFileId(resp.file.id)
      toast.error(resp?.error || t('costs.scanFailed'))
    } finally {
      setScanning(false)
    }
  }

  const toggleParticipant = (id: number) => {
    const nextParts = new Set(participants)
    if (nextParts.has(id)) {
      nextParts.delete(id)
      setCustomAmounts(prev => {
        const copy = { ...prev }
        delete copy[id]
        return copy
      })
    } else {
      nextParts.add(id)
    }
    setParticipants(nextParts)
  }

  // Add an off-platform person (trip guest) without leaving the bill — the
  // first step of their onboarding. They join the split immediately; the
  // tab/join-link flow can pick them up afterwards.
  const [addingPerson, setAddingPerson] = useState(false)
  const [personName, setPersonName] = useState('')
  const [personBusy, setPersonBusy] = useState(false)
  const addPerson = async () => {
    if (!onCreateGuest || !personName.trim() || personBusy) return
    setPersonBusy(true)
    const guest = await onCreateGuest(personName.trim())
    if (guest) {
      setPersonName('')
      setAddingPerson(false)
      // Assign them to this bill right away in equal/custom mode; itemized
      // lines stay explicit (assign them per line, like everyone else).
      if (!isTicketMode) setParticipants(prev => new Set([...prev, guest.id]))
    }
    setPersonBusy(false)
  }

  const save = async () => {
    if (!valid) return
    setSaving(true)
    // Personal: lodged as the owner's own spend — self-paid, self-owed, no
    // split, no settlement (the server enforces this shape too).
    const payerList = isPrivate
      ? (totalNum > 0 ? [{ user_id: me, amount: totalNum }] : [])
      : (payerId > 0 && participants.size > 0) ? [{ user_id: payerId, amount: totalNum }] : []
    const memberList = isPrivate
      ? [{ user_id: me, amount: null }]
      : [...participants].map(id => ({
          user_id: id,
          amount: splitMode === 'custom'
            ? (parseFloat(customAmounts[id]) || 0)
            : splitMode === 'ticket'
            ? (ticketInfo.shares[id] || 0)
            : null
        }))
    const data = {
      name: name.trim(),
      category: cat,
      currency,
      payers: payerList,
      members: memberList,
      member_ids: isPrivate ? [me] : [...participants],
      expense_date: day || null,
      total_price: totalNum,
      is_private: isPrivate,
      receipt_file_id: receiptFileId,
      // Only send the venue pin when it actually changed: re-sending another
      // member's private venue id (hydrated nameless) would read as unknown to
      // the server and 400 the whole save.
      ...(placeId !== (editing?.place_id ?? null) ? { place_id: placeId } : {}),
      ...(supplierId !== ((editing as { supplier_id?: number | null } | null)?.supplier_id ?? null) ? { supplier_id: supplierId } : {}),
      note: isTicketMode ? 'TICKETJSON:' + JSON.stringify({
        items: ticketItems.map(item => ({
          name: item.name,
          price: item.price,
          qty: Math.max(1, Math.round(parseFloat(item.qty) || 1)),
          parts: [...item.participants]
        }))
      }) : null,
      ...(!editing && prefill?.reservationId ? { reservation_id: prefill.reservationId } : {}),
    }
    try {
      if (editing) await updateBudgetItem(tripId, editing.id, data)
      else await addBudgetItem(tripId, data)
      onSaved()
    } catch {
      toast.error(t('common.unknownError'))
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full bg-surface-input border border-edge text-content'
  const labelCls = 'block text-[11px] font-semibold uppercase tracking-[0.08em] text-content-faint mb-[6px]'

  return (
    <Modal isOpen onClose={onClose} title={editing ? t('costs.editExpense') : t('costs.addExpense')} size="2xl"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {!valid && !saving && (
            <span className="text-content-faint" style={{ fontSize: 'calc(12px * var(--fs-scale-caption, 1))', marginRight: 'auto' }}>{t('costs.saveHint')}</span>
          )}
          <button onClick={onClose} className="text-content-muted border border-edge" style={{ padding: '8px 16px', borderRadius: 10, background: 'none', fontSize: 'calc(13px * var(--fs-scale-body, 1))', cursor: 'pointer', fontFamily: 'inherit' }}>{t('common.cancel')}</button>
          <button onClick={save} disabled={!valid || saving} className="bg-[var(--text-primary)] text-[var(--bg-primary)]" style={{ padding: '8px 20px', borderRadius: 10, border: 0, fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 600, cursor: !valid || saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: !valid || saving ? 0.5 : 1 }}>{editing ? t('common.save') : t('costs.addExpense')}</button>
        </div>
      }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <button type="button" onClick={() => scanInputRef.current?.click()} disabled={scanning}
            className="bg-surface-secondary border border-edge text-content-muted"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 10, fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: scanning ? 0.7 : 1 }}>
            {scanning ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
            {scanning ? t('costs.scanningReceipt') : t('costs.scanReceipt')}
          </button>
          <InfoDot title={t('costs.info.scanTitle')} size={14} style={{ marginLeft: 4, verticalAlign: 'middle' }}><p style={{ margin: 0 }}>{t('costs.info.scanBody')}</p></InfoDot>
          {/* No `capture` attribute: iOS then offers the full sheet — Take
              Photo, Photo Library AND Files (where Notes/Files document scans
              live) — instead of jumping straight to the camera. `multiple`
              lets a long docket arrive as several photos. */}
          <input ref={scanInputRef} type="file" accept="image/*,application/pdf" multiple
            style={{ display: 'none' }}
            onChange={e => { const fs = Array.from(e.target.files || []); e.target.value = ''; if (fs.length) handleScanPick(fs) }} />
        </div>

        {/* Who paid + where: the two answers the crew knows before anything
            else, so they lead the form (venue goes full-width on a personal
            expense, where the payer question doesn't exist). */}
        <div style={{ display: 'grid', gridTemplateColumns: isPrivate ? '1fr' : '1fr 1fr', gap: 10 }}>
          {!isPrivate && (
            <div style={{ minWidth: 0 }}>
              <label className={labelCls}>{t('costs.whoPaid')}</label>
              <CustomSelect value={String(payerId)} onChange={v => setPayerId(Number(v))}
                options={[
                  { value: '0', label: t('costs.noOnePaid') || 'Nobody (planning entry)' },
                  ...people.map(p => ({ value: String(p.id), label: p.id === me ? t('costs.you') : p.username }))
                ]}
                style={{ width: '100%' }} />
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
              <label className={labelCls}>{t('costs.venue')}</label>
              <InfoDot title={t('costs.info.venueTitle')} size={13} style={{ margin: '-4px 0 2px' }}><p style={{ margin: 0 }}>{t('costs.info.venueBody')}</p></InfoDot>
            </span>
            <CustomSelect value={placeId != null ? String(placeId) : ''} onChange={v => setPlaceId(v ? Number(v) : null)} searchable
              options={[
                { value: '', label: t('costs.noVenue') },
                // Keep a pin to a venue the picker can't offer (someone else's
                // private venue, hydrated without a name) selectable as-is.
                ...(placeId != null && venues != null && !venues.some(p => p.id === placeId)
                  ? [{ value: String(placeId), label: editing?.place_name || t('costs.privateVenue') }]
                  : []),
                ...(venues || []).map(p => ({ value: String(p.id), label: p.name })),
              ]}
              style={{ width: '100%' }} />
          </div>
        </div>

        <div>
          <label className={labelCls}>{t('costs.whatFor')}</label>
          <input value={name} onChange={e => setName(e.target.value)} enterKeyHint="next" placeholder={t('costs.namePlaceholder')} className={inputCls} style={{ borderRadius: 10, padding: '11px 13px', fontSize: 'calc(14px * var(--fs-scale-body, 1))', outline: 'none' }} />
        </div>

        <div>
          <label className={labelCls}>{t('costs.totalAmount')}</label>
          <div className="bg-surface-input border border-edge" style={{ height: FIELD_H, boxSizing: 'border-box', display: 'flex', alignItems: 'center', borderRadius: 10, padding: '0 12px', opacity: isTicketMode ? 0.6 : 1 }}>
            <span className="text-content-faint" style={{ fontSize: 'calc(15px * var(--fs-scale-subtitle, 1))' }}>{sym(currency)}</span>
            <NumericInput mode="decimal" placeholder="0.00" value={isTicketMode ? ticketInfo.total.toFixed(2) : total}
              onValueChange={onTotalChange}
              disabled={isTicketMode}
              className="text-content" style={{ flex: 1, border: 0, background: 'none', outline: 'none', fontSize: 'calc(15px * var(--fs-scale-subtitle, 1))', fontWeight: 600, paddingLeft: 6, width: '100%' }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <label className={labelCls}>{t('costs.currency')}</label>
            <CustomSelect value={currency} onChange={v => setCurrency(String(v))} searchable
              options={currenciesWith(currency).map(c => ({ value: c, label: SYMBOLS[c] ? `${c}  ${SYMBOLS[c]}` : c }))}
              style={{ width: '100%' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <label className={labelCls}>{t('costs.day')}</label>
            <CustomDatePicker value={day} onChange={setDay} style={{ width: '100%' }} />
          </div>
        </div>

        {currency !== base && totalNum > 0 && (
          <div className="bg-surface-secondary border border-edge text-content-muted" style={{ borderRadius: 10, padding: '10px 12px', fontSize: 'calc(12.5px * var(--fs-scale-body, 1))', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>{formatMoney(totalNum, currency, locale)}</span>
            <span className="text-content-faint">≈</span>
            <span className="text-content" style={{ fontWeight: 600 }}>{formatMoney(convert(totalNum, currency), base, locale)}</span>
            <span className="text-content-faint">· {t('costs.liveRate')}</span>
          </div>
        )}

        <div>
          <label className={labelCls}>{t('costs.category')}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {COST_CATEGORY_LIST.map(c => {
              const Icon = c.Icon; const on = cat === c.key
              return (
                <button key={c.key} onClick={() => setCat(c.key)}
                  className={on ? 'bg-surface-card text-content border' : 'bg-surface-secondary text-content-muted border border-edge'}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px 6px 7px', borderRadius: 999, fontSize: 'calc(12.5px * var(--fs-scale-body, 1))', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', borderColor: on ? 'var(--text-primary)' : undefined }}>
                  <span style={{ width: 24, height: 24, borderRadius: 7, display: 'grid', placeItems: 'center', background: c.color + '22', color: c.color }}><Icon size={14} /></span>
                  {t(c.labelKey)}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className={labelCls}>{t('costs.supplier')}</label>
          <CustomSelect value={supplierId != null ? String(supplierId) : ''} onChange={v => setSupplierId(v ? Number(v) : null)} searchable
            options={[
              { value: '', label: t('costs.noSupplier') },
              ...(supplierId != null && supplierList != null && !supplierList.some(s => s.id === supplierId)
                ? [{ value: String(supplierId), label: (editing as { supplier_name?: string | null } | null)?.supplier_name || String(supplierId) }]
                : []),
              ...(supplierList || []).map(s => ({ value: String(s.id), label: s.name })),
            ]}
            style={{ width: '100%' }} />
        </div>

        {canTogglePrivate && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignSelf: 'flex-start' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
            <label className="text-content" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 500 }}>
              <input type="checkbox" checked={isPrivate}
                onChange={e => {
                  const on = e.target.checked
                  // Coming from an itemized split: carry the ticket sum into the
                  // (re-enabled) manual total so the amount isn't lost.
                  if (on && splitMode === 'ticket' && !total && ticketInfo.total > 0) setTotal(ticketInfo.total.toFixed(2))
                  setIsPrivate(on)
                }} style={{ cursor: 'pointer' }} />
              <Lock size={13} className="text-content-faint" />
              {t('costs.personalExpense')}
            </label>
            <InfoDot title={t('costs.info.personalTitle')} size={14}><p style={{ margin: 0 }}>{t('costs.info.personalBody')}</p></InfoDot>
            </div>
            {isPrivate && (
              <div className="text-content-faint" style={{ fontSize: 'calc(11.5px * var(--fs-scale-caption, 1))', paddingLeft: 21 }}>
                {t('costs.personalHint')}
              </div>
            )}
          </div>
        )}

        {!isPrivate && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
              <label className={labelCls} style={{ marginBottom: 0 }}>{t('costs.split') || 'Split'}</label>
              <InfoDot title={t('costs.info.splitTitle')} size={13}><p style={{ margin: 0 }}>{t('costs.info.splitBody')}</p></InfoDot>
            </span>
            <div className="bg-surface-secondary" style={{ display: 'flex', borderRadius: 8, padding: 2 }}>
              <button type="button" onClick={() => setSplitMode('equally')}
                className={splitMode === 'equally' ? 'bg-surface-card text-content' : 'text-content-muted'}
                style={{ padding: '6px 12px', fontSize: 'calc(12.5px * var(--fs-scale-body, 1))', borderRadius: 6, fontWeight: 600, border: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
                {t('costs.splitEqually') || 'Equally'}
              </button>
              <button type="button" onClick={() => setSplitMode('custom')}
                className={splitMode === 'custom' ? 'bg-surface-card text-content' : 'text-content-muted'}
                style={{ padding: '6px 12px', fontSize: 'calc(12.5px * var(--fs-scale-body, 1))', borderRadius: 6, fontWeight: 600, border: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
                {t('costs.splitCustom') || 'Custom'}
              </button>
              <button type="button" onClick={() => setSplitMode('ticket')}
                className={splitMode === 'ticket' ? 'bg-surface-card text-content' : 'text-content-muted'}
                style={{ padding: '6px 12px', fontSize: 'calc(12.5px * var(--fs-scale-body, 1))', borderRadius: 6, fontWeight: 600, border: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
                {t('costs.splitTicket') || 'Ticket'}
              </button>
            </div>
          </div>
          {splitMode === 'ticket' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ticketItems.map((item, itemIdx) => (
                  <div key={item.id} className="bg-surface-secondary border border-edge" style={{ padding: 10, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder={t('costs.itemName')}
                        value={item.name}
                        onChange={e => handleUpdateItemName(item.id, e.target.value)}
                        className="bg-surface-input border border-edge text-content"
                        // minWidth: 0 lets the name shrink on phones — without it the
                        // input's intrinsic width squeezed the price box to ZERO width,
                        // making the amount untappable on mobile (the "can't type a
                        // number" bug). Qty + price boxes get guaranteed fixed bases.
                        style={{ flex: '1 1 auto', minWidth: 0, padding: '6px 10px', borderRadius: 8, fontSize: 13, border: '1px solid var(--border-color)', outline: 'none' }}
                      />
                      <div className="bg-surface-input border border-edge" style={{ flex: '0 0 38px', display: 'flex', alignItems: 'center', borderRadius: 8 }}>
                        <NumericInput
                          mode="integer"
                          placeholder="1"
                          value={item.qty}
                          onValueChange={v => handleUpdateItemQty(item.id, v)}
                          className="text-content"
                          style={{ width: '100%', minWidth: 0, border: 0, background: 'none', outline: 'none', fontSize: 13, fontWeight: 600, textAlign: 'center', padding: '6px 0' }}
                        />
                      </div>
                      <span className="text-content-faint" style={{ fontSize: 12, flexShrink: 0, margin: '0 -2px' }}>×</span>
                      <div className="bg-surface-input border border-edge" style={{ flex: '0 0 92px', display: 'flex', alignItems: 'center', padding: '0 8px', borderRadius: 8 }}>
                        <span className="text-content-faint" style={{ fontSize: 12, flexShrink: 0 }}>{sym(currency)}</span>
                        <NumericInput
                          mode="decimal"
                          placeholder="0.00"
                          value={item.price}
                          onValueChange={v => handleUpdateItemPrice(item.id, v)}
                          className="text-content"
                          style={{ width: '100%', minWidth: 0, border: 0, background: 'none', outline: 'none', fontSize: 13, fontWeight: 600, textAlign: 'right', padding: '6px 0' }}
                        />
                      </div>
                      <button type="button" onClick={() => handleRemoveItem(item.id)} aria-label={t('common.delete')} className="text-content-muted" style={{ background: 'none', border: 0, cursor: 'pointer', minWidth: 34, minHeight: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, margin: '-6px 0' }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                    {ticketLineCents(item) > 0 && Math.round(parseFloat(item.qty) || 1) > 1 && (
                      <div className="text-content-faint" style={{ fontSize: 11, textAlign: 'right', marginTop: -2 }}>
                        = {sym(currency)}{(ticketLineCents(item) / 100).toFixed(2)}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
                      <span className="text-content-faint" style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', marginRight: 4 }}>{t('costs.splitting')}</span>
                      {(() => {
                        const all = item.participants.size === people.length
                        return (
                          <button
                            type="button"
                            onClick={() => setTicketItems(prev => prev.map(it => it.id === item.id ? { ...it, participants: all ? new Set<number>() : new Set(people.map(p => p.id)) } : it))}
                            className={all ? 'bg-surface-card text-content border' : 'bg-surface-secondary text-content-muted border border-edge'}
                            style={{ display: 'inline-flex', alignItems: 'center', padding: '8px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', border: all ? '1px solid var(--text-primary)' : undefined }}
                          >
                            {t('costs.everyone')}
                          </button>
                        )
                      })()}
                      {people.map((p, pIdx) => {
                        const active = item.participants.has(p.id)
                        return (
                          <button
                            type="button"
                            key={p.id}
                            onClick={() => handleToggleItemParticipant(item.id, p.id)}
                            className={active ? 'bg-surface-card text-content border' : 'bg-surface-secondary text-content-muted border border-edge'}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', border: active ? '1px solid var(--text-primary)' : undefined }}
                          >
                            {p.avatar_url
                              ? <img src={p.avatar_url} alt="" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} />
                              : <span style={{ width: 18, height: 18, borderRadius: '50%', background: SPLIT_COLORS[pIdx % SPLIT_COLORS.length].gradient, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 700 }}>{(p.id === me ? t('costs.youShort') : p.username.charAt(0)).toUpperCase()}</span>}
                            <span>{p.id === me ? t('costs.you') : p.username}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" onClick={handleAddEmptyItem} className="border border-dashed border-edge text-content-muted" style={{ padding: '8px 12px', borderRadius: 10, background: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Plus size={14} /> {t('costs.addItem')}
              </button>
              {ticketItems.length > 0 && !ticketValid && (
                <div className="text-content-faint" style={{ fontSize: 12 }}>{t('costs.ticketHint')}</div>
              )}

              {ticketItems.length > 0 && (
                <div className="bg-surface-secondary border border-edge" style={{ padding: 12, borderRadius: 10 }}>
                  <div className="text-content" style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{t('costs.sharesSummary')}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {people.map(p => {
                      const share = ticketInfo.shares[p.id] || 0
                      return (
                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span className="text-content-muted">{p.id === me ? t('costs.you') : p.username}</span>
                          <span className="text-content" style={{ fontWeight: 600 }}>{sym(currency)}{share.toFixed(2)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {people.map((p, idx) => {
                  const on = participants.has(p.id)
                  return (
                    <div key={p.id} className="bg-surface-secondary border border-edge" style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: 10, alignItems: 'center', padding: '8px 11px', borderRadius: 10, opacity: on ? 1 : 0.5 }}>
                      <button type="button" onClick={() => toggleParticipant(p.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 0, cursor: 'pointer', fontFamily: 'inherit', padding: 0, minWidth: 0, textAlign: 'left' }}>
                        {p.avatar_url
                          ? <img src={p.avatar_url} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', display: 'block', flexShrink: 0, opacity: on ? 1 : 0.45 }} />
                          : <span style={{ width: 22, height: 22, borderRadius: '50%', background: SPLIT_COLORS[idx % SPLIT_COLORS.length].gradient, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0, opacity: on ? 1 : 0.45 }}>{(p.id === me ? t('costs.youShort') : p.username.charAt(0)).toUpperCase()}</span>}
                        <span className="text-content" style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.id === me ? t('costs.you') : p.username}</span>
                        {p.is_guest && <GuestBadge size="xs" />}
                      </button>
                      {splitMode === 'equally' ? (
                        on ? (
                          <span className="text-content" style={{ fontSize: 14, fontWeight: 600, textAlign: 'right', paddingRight: 10 }}>
                            {sym(currency)}{(equalShares[p.id] || 0).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-content-faint" style={{ fontSize: 12, textAlign: 'right', paddingRight: 10 }}>{t('costs.excluded')}</span>
                        )
                      ) : (
                        on ? (
                          <div className="bg-surface-input border border-edge" style={{ display: 'flex', alignItems: 'center', gap: 4, borderRadius: 8, padding: '0 10px' }}>
                            <span className="text-content-faint" style={{ fontSize: 13 }}>{sym(currency)}</span>
                            <input type="text" inputMode="decimal" placeholder={(placeholderShares[p.id] || 0).toFixed(2)} value={customAmounts[p.id] || ''}
                              onChange={e => handleCustomAmountChange(p.id, e.target.value)}
                              className="text-content" style={{ width: '100%', border: 0, background: 'none', outline: 'none', fontSize: 14, fontWeight: 600, padding: '8px 0', textAlign: 'right' }} />
                          </div>
                        ) : (
                          <button type="button" onClick={() => toggleParticipant(p.id)} className="text-content-faint" style={{ background: 'none', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, textAlign: 'right' }}>{t('costs.tapToInclude')}</button>
                        )
                      )}
                    </div>
                  )
                })}
              </div>
              <div style={{ marginTop: 10, fontSize: 12.5, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                {splitMode === 'equally' ? (
                  <span className="text-content-faint">
                    {participants.size > 0 && t('costs.splitSummary', { count: participants.size, amount: sym(currency) + each.toFixed(2) })}
                  </span>
                ) : (
                  <span style={{ fontWeight: 600, color: customBalanced ? 'var(--success)' : 'var(--danger)' }}>
                    {customBalanced 
                      ? t('costs.splitMatches')
                      : t('costs.splitProgress', {
                          sum: `${sym(currency)}${splitSum.toFixed(2)}`,
                          total: `${sym(currency)}${totalNum.toFixed(2)}`,
                          direction: (totalNum - splitSum) > 0 ? t('costs.splitUnder') : t('costs.splitOver'),
                          diff: `${sym(currency)}${Math.abs(totalNum - splitSum).toFixed(2)}`,
                        })}
                  </span>
                )}
              </div>
            </>
          )}

          {/* Add someone who isn't on the platform yet — created as a trip
              guest (free, no account) and immediately part of the split. */}
          {onCreateGuest && (
            addingPerson ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <input autoFocus value={personName} onChange={e => setPersonName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addPerson() }}
                  placeholder={t('costs.addPersonPlaceholder')}
                  className="bg-surface-input border border-edge text-content"
                  style={{ flex: '1 1 160px', minWidth: 0, borderRadius: 10, padding: '9px 12px', fontSize: 'calc(13.5px * var(--fs-scale-body, 1))', outline: 'none', fontFamily: 'inherit' }} />
                <button type="button" onClick={addPerson} disabled={!personName.trim() || personBusy}
                  className="bg-[var(--text-primary)] text-[var(--bg-primary)]"
                  style={{ padding: '8px 16px', borderRadius: 10, border: 0, fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: !personName.trim() || personBusy ? 0.5 : 1 }}>
                  {t('common.add')}
                </button>
                <button type="button" onClick={() => { setAddingPerson(false); setPersonName('') }}
                  className="text-content-muted border border-edge"
                  style={{ padding: '8px 14px', borderRadius: 10, background: 'none', fontSize: 'calc(13px * var(--fs-scale-body, 1))', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {t('common.cancel')}
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setAddingPerson(true)}
                className="text-content-muted"
                style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 10, border: '1.5px dashed var(--border-color, #d1d5db)', background: 'none', fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Plus size={14} /> {t('costs.addPerson')}
              </button>
            )
          )}
        </div>
        )}
      </div>
    </Modal>
  )
}
