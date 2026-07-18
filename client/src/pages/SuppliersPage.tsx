import React from 'react'
import { Loader2, MapPin, Plus, ReceiptText, Search, Sparkles, Store, Trash2 } from 'lucide-react'
import Navbar from '../components/Layout/Navbar'
import Modal from '../components/shared/Modal'
import InfoDot from '../components/shared/InfoDot'
import { formatDate, formatMoney } from '../utils/formatters'
import { useSuppliers } from './suppliers/useSuppliers'
import type { SupplierListEntry } from '../api/client'
import type { TranslationFn } from '../types'
import '../styles/dashboard.css'

export default function SuppliersPage(): React.ReactElement {
  const c = useSuppliers()
  const { t, locale } = c

  // t-dependent display array for the contact form rows (page-level per PATTERN.md).
  const contactFields = [
    { key: 'category', label: t('suppliers.detail.category'), placeholder: t('suppliers.detail.categoryPlaceholder') },
    { key: 'phone', label: t('suppliers.detail.phone') },
    { key: 'email', label: t('suppliers.detail.email') },
    { key: 'website', label: t('suppliers.detail.website') },
    { key: 'address', label: t('suppliers.detail.address') },
  ] as const

  const hasSearch = c.search.trim().length > 0

  let body: React.ReactElement
  if (c.loading && c.suppliers.length === 0) {
    body = (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 rounded-full animate-spin border-edge" style={{ borderTopColor: 'var(--text-primary)' }} />
      </div>
    )
  } else if (c.suppliers.length === 0) {
    body = (
      <div className="flex flex-col items-center text-center gap-2 py-16 px-4">
        <Store size={26} className="text-content-faint" />
        {hasSearch ? (
          <p className="text-[14px] font-medium text-content-muted" style={{ margin: 0 }}>
            {t('suppliers.noResults', { query: c.search.trim() })}
          </p>
        ) : (
          <>
            <p className="text-[15px] font-semibold text-content" style={{ margin: 0 }}>{t('suppliers.empty')}</p>
            <p className="text-[13px] text-content-muted" style={{ margin: 0, maxWidth: 420 }}>{t('suppliers.emptyHint')}</p>
          </>
        )}
      </div>
    )
  } else {
    body = (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14 }}>
        {c.suppliers.map(s => (
          <SupplierCard key={s.id} supplier={s} locale={locale} t={t} onOpen={() => { void c.openSupplier(s.id) }} />
        ))}
      </div>
    )
  }

  return (
    <>
      <Navbar />
      <div className="trek-dash" style={{ minHeight: '100vh', paddingTop: 'var(--nav-h)', background: 'var(--bg-primary)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '30px 24px 120px' }}>

          {/* Header row: title + info, subtitle, search, add */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 22 }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <h1 className="tour-title text-content" style={{ margin: 0, fontSize: 'calc(24px * var(--fs-scale-title, 1))', display: 'flex', alignItems: 'center', gap: 8 }}>
                {t('suppliers.title')}
                <InfoDot title={t('suppliers.info.title')}>
                  <p style={{ margin: 0 }}>{t('suppliers.info.body')}</p>
                </InfoDot>
              </h1>
              <p className="text-content-muted" style={{ margin: '4px 0 0', fontSize: 'calc(13px * var(--fs-scale-body, 1))', maxWidth: 640 }}>
                {t('suppliers.subtitle')}
              </p>
            </div>

            <div className="flex items-center gap-2 px-3 rounded-lg border border-edge bg-surface-card" style={{ height: 38, minWidth: 220 }}>
              <Search size={15} className="text-content-faint" />
              <input
                value={c.search}
                onChange={e => c.setSearch(e.target.value)}
                placeholder={t('suppliers.searchPlaceholder')}
                className="bg-transparent text-content text-[13px] outline-none border-none"
                style={{ width: 190 }}
              />
            </div>

            <button
              type="button"
              onClick={() => c.setShowCreate(true)}
              className="bg-accent text-accent-text inline-flex items-center gap-1.5 rounded-lg text-[13px] font-medium"
              style={{ border: 'none', cursor: 'pointer', height: 38, padding: '0 14px' }}
            >
              <Plus size={15} strokeWidth={2.5} />
              {t('suppliers.add')}
            </button>
          </div>

          {body}
        </div>
      </div>

      {/* Supplier detail — editable contact form + cross-event history */}
      <Modal
        isOpen={c.selectedId != null}
        onClose={c.closeDetail}
        title={c.selected?.name ?? t('suppliers.title')}
        size="xl"
        footer={c.selected != null && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { void c.handleEnrich() }}
              disabled={c.enriching}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-edge text-content-secondary text-[13px] hover:bg-surface-hover disabled:opacity-50"
            >
              {c.enriching ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {c.enriching ? t('suppliers.detail.enriching') : t('suppliers.detail.enrich')}
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => c.setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-danger text-[13px] font-medium hover:bg-danger-soft"
            >
              <Trash2 size={14} />
              {t('suppliers.detail.delete')}
            </button>
            <button
              type="button"
              onClick={() => { void c.handleSave() }}
              disabled={c.saving}
              className="px-3 py-1.5 rounded-lg bg-accent text-accent-text text-[13px] font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {t('suppliers.detail.save')}
            </button>
          </div>
        )}
      >
        {c.selected == null ? (
          <div className="flex justify-center py-12">
            <Loader2 size={22} className="animate-spin text-content-faint" />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Contact form */}
            <div>
              <SectionLabel>{t('suppliers.detail.contact')}</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                {contactFields.map(f => (
                  <div key={f.key}>
                    <label className="block text-[12px] font-medium text-content-secondary mb-1.5" htmlFor={`supplier-${f.key}`}>{f.label}</label>
                    <input
                      id={`supplier-${f.key}`}
                      value={c.form[f.key]}
                      onChange={e => c.setField(f.key, e.target.value)}
                      placeholder={'placeholder' in f ? f.placeholder : undefined}
                      className="w-full px-3 py-2 rounded-lg border border-edge bg-surface-input text-content text-[14px] outline-none focus:border-accent"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* AI notes — read-only, only once enrichment wrote one */}
            {c.selected.ai_summary && (
              <div className="rounded-xl border border-edge bg-surface-tertiary" style={{ padding: '12px 14px' }}>
                <SectionLabel><span className="inline-flex items-center gap-1.5"><Sparkles size={12} /> {t('suppliers.detail.aiSummary')}</span></SectionLabel>
                <p className="text-[13px] text-content-secondary" style={{ margin: 0, lineHeight: 1.6 }}>{c.selected.ai_summary}</p>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-[12px] font-medium text-content-secondary mb-1.5" htmlFor="supplier-notes">{t('suppliers.detail.notes')}</label>
              <textarea
                id="supplier-notes"
                value={c.form.notes}
                onChange={e => c.setField('notes', e.target.value)}
                placeholder={t('suppliers.detail.notesPlaceholder')}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-edge bg-surface-input text-content text-[13px] outline-none focus:border-accent resize-y"
              />
            </div>

            {/* Spend by event */}
            {c.selected.spendByEvent.length > 0 && (
              <div>
                <SectionLabel>{t('suppliers.detail.spend')}</SectionLabel>
                <div className="rounded-xl border border-edge overflow-hidden">
                  {c.selected.spendByEvent.map(row => (
                    <div key={row.trip_id} className="flex items-center gap-3 px-3.5 py-2.5 border-b border-edge-secondary last:border-b-0">
                      <span className="text-[13px] font-medium text-content truncate" style={{ flex: 1, minWidth: 0 }}>{row.trip_title}</span>
                      <span className="text-[12px] text-content-faint flex-shrink-0">
                        {row.count === 1 ? t('suppliers.expense') : t('suppliers.expenses', { count: row.count })}
                      </span>
                      <span className="text-[13px] font-semibold text-content flex-shrink-0">
                        {formatMoney(row.total, row.currency ?? '', locale)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interactions */}
            <div>
              <SectionLabel>{t('suppliers.detail.interactions')}</SectionLabel>
              {c.selected.expenses.length === 0 ? (
                <p className="text-[13px] text-content-faint" style={{ margin: 0 }}>{t('suppliers.detail.noInteractions')}</p>
              ) : (
                <div className="rounded-xl border border-edge overflow-hidden">
                  {c.selected.expenses.map(e => (
                    <div key={e.id} className="flex items-center gap-3 px-3.5 py-2.5 border-b border-edge-secondary last:border-b-0">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="text-[13px] font-medium text-content truncate">{e.name}</div>
                        <div className="text-[11.5px] text-content-faint truncate">{e.trip_title}</div>
                      </div>
                      <span className="text-[12px] text-content-faint flex-shrink-0">
                        {formatDate((e.expense_date ?? e.created_at).slice(0, 10), locale)}
                      </span>
                      <span className="text-[13px] font-semibold text-content flex-shrink-0">
                        {formatMoney(e.total_price, e.currency ?? '', locale)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Venues */}
            {c.selected.venues.length > 0 && (
              <div>
                <SectionLabel>{t('suppliers.detail.venuesTitle')}</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {c.selected.venues.map(v => (
                    <span key={v.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-edge bg-surface-tertiary text-[12px] text-content-secondary">
                      <MapPin size={11} />
                      {v.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Nested delete confirm */}
      <Modal
        isOpen={c.confirmDelete}
        onClose={() => c.setConfirmDelete(false)}
        title={t('suppliers.detail.deleteTitle')}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => c.setConfirmDelete(false)} className="px-3 py-1.5 rounded-lg border border-edge text-content-secondary text-[13px] hover:bg-surface-hover">
              {t('common.cancel')}
            </button>
            <button type="button" onClick={() => { void c.handleDelete() }} disabled={c.deleting} className="px-3 py-1.5 rounded-lg bg-danger text-white text-[13px] font-semibold hover:opacity-90 disabled:opacity-50">
              {t('suppliers.detail.delete')}
            </button>
          </div>
        }
      >
        <p className="text-[13px] text-content-secondary">{t('suppliers.detail.deleteBody', { name: c.selected?.name ?? '' })}</p>
      </Modal>

      {/* Add supplier — name only; details land in the detail modal it opens */}
      <Modal
        isOpen={c.showCreate}
        onClose={() => c.setShowCreate(false)}
        title={t('suppliers.add')}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => c.setShowCreate(false)} className="px-3 py-1.5 rounded-lg border border-edge text-content-secondary text-[13px] hover:bg-surface-hover">
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={() => { void c.handleCreate() }}
              disabled={!c.newName.trim() || c.creating}
              className="px-3 py-1.5 rounded-lg bg-accent text-accent-text text-[13px] font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {c.creating ? <Loader2 size={14} className="animate-spin" /> : t('suppliers.add')}
            </button>
          </div>
        }
      >
        <input
          autoFocus
          value={c.newName}
          onChange={e => c.setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && c.newName.trim()) void c.handleCreate() }}
          placeholder={t('suppliers.namePlaceholder')}
          className="w-full px-3 py-2 rounded-lg border border-edge bg-surface-input text-content text-[14px] outline-none focus:border-accent"
        />
      </Modal>
    </>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="text-[11px] font-semibold uppercase text-content-faint" style={{ letterSpacing: '0.1em', marginBottom: 8 }}>
      {children}
    </div>
  )
}

function SupplierCard({ supplier: s, locale, t, onOpen }: {
  supplier: SupplierListEntry
  locale: string
  t: TranslationFn
  onOpen: () => void
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-2xl border border-edge bg-surface-card text-left transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-accent cursor-pointer"
      style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}
    >
      <div className="flex items-start gap-2">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="text-[15px] font-semibold text-content truncate">{s.name}</div>
          {s.source === 'receipt' && (
            <span className="inline-flex items-center gap-1 mt-1 text-[10.5px] font-medium text-content-faint">
              <ReceiptText size={11} />
              {t('suppliers.fromReceipt')}
            </span>
          )}
        </div>
        {s.category && (
          <span className="flex-shrink-0 px-2 py-0.5 rounded-full border border-edge bg-surface-tertiary text-[11px] font-medium text-content-secondary truncate" style={{ maxWidth: 130 }}>
            {s.category}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-content-muted">
        <span>{s.event_count === 1 ? t('suppliers.event') : t('suppliers.events', { count: s.event_count })}</span>
        <span>{s.expense_count === 1 ? t('suppliers.expense') : t('suppliers.expenses', { count: s.expense_count })}</span>
        {s.venue_count > 0 && <span>{t('suppliers.venues', { count: s.venue_count })}</span>}
      </div>

      <div className="text-[11.5px] text-content-faint">
        {s.last_interaction
          ? t('suppliers.lastInteraction', { date: formatDate(s.last_interaction.slice(0, 10), locale) ?? '' })
          : t('suppliers.neverUsed')}
      </div>
    </button>
  )
}
