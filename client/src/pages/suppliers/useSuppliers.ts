import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../i18n'
import { useToast } from '../../components/shared/Toast'
import { getApiErrorMessage } from '../../types'
import { suppliersApi } from '../../api/client'
import type { SupplierDetail, SupplierListEntry } from '../../api/client'
import { captureEvent } from '../../analytics/posthog'

/** The editable contact form mirrored in the detail modal. */
export interface SupplierFormState {
  category: string
  phone: string
  email: string
  website: string
  address: string
  notes: string
}

const EMPTY_FORM: SupplierFormState = { category: '', phone: '', email: '', website: '', address: '', notes: '' }

function formFromSupplier(s: SupplierDetail): SupplierFormState {
  return {
    category: s.category ?? '',
    phone: s.phone ?? '',
    email: s.email ?? '',
    website: s.website ?? '',
    address: s.address ?? '',
    notes: s.notes ?? '',
  }
}

/**
 * Suppliers CRM page logic — owns the list + debounced search, the lazily
 * fetched detail (one GET per open), the create flow (name → POST → open the
 * fresh detail), the contact-form edit/save, on-demand enrichment and the
 * confirm-guarded delete. SuppliersPage stays a pure wiring container.
 */
export function useSuppliers() {
  const { t, locale } = useTranslation()
  const toast = useToast()

  // ── List + search ───────────────────────────────────────────────────
  const [suppliers, setSuppliers] = useState<SupplierListEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Guard against out-of-order responses (a slow earlier search must not
  // clobber the newer result).
  const reqSeq = useRef(0)
  const load = useCallback(async (q: string) => {
    const seq = ++reqSeq.current
    try {
      const data = await suppliersApi.list(q)
      if (seq === reqSeq.current) setSuppliers(data.suppliers ?? [])
    } catch {
      /* keep the last good list */
    } finally {
      if (seq === reqSeq.current) setLoading(false)
    }
  }, [])

  // Initial load (empty query fires immediately) + debounced search reload.
  useEffect(() => {
    const handle = window.setTimeout(() => { void load(search) }, search ? 250 : 0)
    return () => window.clearTimeout(handle)
  }, [search, load])

  // ── Detail (lazy GET on open) ───────────────────────────────────────
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selected, setSelected] = useState<SupplierDetail | null>(null)
  const [form, setForm] = useState<SupplierFormState>(EMPTY_FORM)

  const openSupplier = useCallback(async (id: number) => {
    setSelectedId(id)
    setSelected(null)
    setForm(EMPTY_FORM)
    try {
      const data = await suppliersApi.detail(id)
      setSelected(data.supplier)
      setForm(formFromSupplier(data.supplier))
    } catch (err) {
      setSelectedId(null)
      toast.error(getApiErrorMessage(err, t('common.error')))
    }
  }, [toast, t])

  const [confirmDelete, setConfirmDelete] = useState(false)

  const closeDetail = useCallback(() => {
    setSelectedId(null)
    setSelected(null)
    setConfirmDelete(false)
  }, [])

  const setField = useCallback((field: keyof SupplierFormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  // ── Create (name → POST → open detail) ──────────────────────────────
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = useCallback(async () => {
    const name = newName.trim()
    if (!name || creating) return
    setCreating(true)
    try {
      const data = await suppliersApi.create({ name })
      captureEvent('supplier_created')
      setShowCreate(false)
      setNewName('')
      void load(search)
      void openSupplier(data.supplier.id)
    } catch (err) {
      toast.error(getApiErrorMessage(err, t('suppliers.createError')))
    } finally {
      setCreating(false)
    }
  }, [newName, creating, load, search, openSupplier, toast, t])

  // ── Save the contact form ───────────────────────────────────────────
  const [saving, setSaving] = useState(false)
  const handleSave = useCallback(async () => {
    if (selectedId == null || saving) return
    setSaving(true)
    try {
      await suppliersApi.update(selectedId, {
        category: form.category,
        phone: form.phone,
        email: form.email,
        website: form.website,
        address: form.address,
        notes: form.notes,
      })
      // The PUT answers the bare row (no aggregates/history) — merge the saved
      // fields into the open detail and refresh the list for the card chips.
      setSelected(prev => prev ? {
        ...prev,
        category: form.category || null,
        phone: form.phone || null,
        email: form.email || null,
        website: form.website || null,
        address: form.address || null,
        notes: form.notes || null,
      } : prev)
      toast.success(t('suppliers.detail.saved'))
      void load(search)
    } catch (err) {
      toast.error(getApiErrorMessage(err, t('suppliers.saveError')))
    } finally {
      setSaving(false)
    }
  }, [selectedId, saving, form, toast, t, load, search])

  // ── Enrich (Google Places + AI, gap-fill only) ──────────────────────
  const [enriching, setEnriching] = useState(false)
  const handleEnrich = useCallback(async () => {
    if (selectedId == null || enriching) return
    setEnriching(true)
    try {
      const data = await suppliersApi.enrich(selectedId)
      if (data.supplier) {
        setSelected(data.supplier)
        setForm(formFromSupplier(data.supplier))
      }
      toast.success(t('suppliers.detail.enriched'))
      void load(search)
    } catch (err) {
      toast.error(getApiErrorMessage(err, t('common.error')))
    } finally {
      setEnriching(false)
    }
  }, [selectedId, enriching, toast, t, load, search])

  // ── Delete (behind the nested confirm modal) ────────────────────────
  const [deleting, setDeleting] = useState(false)
  const handleDelete = useCallback(async () => {
    if (selectedId == null || deleting) return
    setDeleting(true)
    try {
      await suppliersApi.remove(selectedId)
      toast.success(t('suppliers.detail.deleted'))
      closeDetail()
      void load(search)
    } catch (err) {
      toast.error(getApiErrorMessage(err, t('common.error')))
    } finally {
      setDeleting(false)
    }
  }, [selectedId, deleting, toast, t, closeDetail, load, search])

  return {
    t, locale,
    // list
    suppliers, loading, search, setSearch,
    // detail
    selectedId, selected, openSupplier, closeDetail,
    form, setField,
    // create
    showCreate, setShowCreate, newName, setNewName, creating, handleCreate,
    // save / enrich / delete
    saving, handleSave,
    enriching, handleEnrich,
    confirmDelete, setConfirmDelete, deleting, handleDelete,
  }
}
