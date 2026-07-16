import { useState, useEffect } from 'react'
import { Tag, Calendar, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { getLocaleForLanguage, useTranslation } from '../../i18n'
import apiClient from '../../api/client'

const PER_PAGE = 10

interface GithubRelease {
  id: number
  prerelease: boolean
  tag_name: string
  name: string | null
  body: string | null
  published_at: string | null
  created_at: string
  author: { login: string } | null
  [key: string]: unknown
}

export default function GitHubPanel({ isPrerelease = false }: { isPrerelease?: boolean }) {
  const { t, language } = useTranslation()
  const [releases, setReleases] = useState<GithubRelease[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchReleases = async (pageNum = 1, append = false) => {
    try {
      const res = await apiClient.get(`/admin/github-releases`, { params: { per_page: PER_PAGE, page: pageNum } })
      const data = Array.isArray(res.data) ? res.data : []
      setReleases(prev => append ? [...prev, ...data] : data)
      setHasMore(data.length === PER_PAGE)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchReleases(1).finally(() => setLoading(false))
  }, [])

  const handleLoadMore = async () => {
    const next = page + 1
    setLoadingMore(true)
    await fetchReleases(next, true)
    setPage(next)
    setLoadingMore(false)
  }

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString(getLocaleForLanguage(language), { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // Simple markdown-to-html for release notes (handles headers, bold, lists, links)
  const renderBody = (body) => {
    if (!body) return null
    const lines = body.split('\n')
    const elements = []
    let listItems = []

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`ul-${elements.length}`} className="space-y-1 my-2">
            {listItems.map((item, i) => (
              <li key={i} className="flex gap-2 text-xs text-content-muted">
                <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: 'var(--text-faint)' }} />
                <span dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
              </li>
            ))}
          </ul>
        )
        listItems = []
      }
    }

    const escapeHtml = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    const inlineFormat = (text) => {
      return escapeHtml(text)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.+?)`/g, '<code style="font-size:11px;padding:1px 4px;border-radius:4px;background:var(--bg-secondary)">$1</code>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
          const safeUrl = url.startsWith('http://') || url.startsWith('https://') ? url : '#'
          return `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer" style="color:#3b82f6;text-decoration:underline">${label}</a>`
        })
    }

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) { flushList(); continue }

      if (trimmed.startsWith('### ')) {
        flushList()
        elements.push(
          <h4 key={elements.length} className="text-xs font-semibold mt-3 mb-1 text-content">
            {trimmed.slice(4)}
          </h4>
        )
      } else if (trimmed.startsWith('## ')) {
        flushList()
        elements.push(
          <h3 key={elements.length} className="text-sm font-semibold mt-3 mb-1 text-content">
            {trimmed.slice(3)}
          </h3>
        )
      } else if (/^[-*] /.test(trimmed)) {
        listItems.push(trimmed.slice(2))
      } else {
        flushList()
        elements.push(
          <p key={elements.length} className="text-xs my-1 text-content-muted"
            dangerouslySetInnerHTML={{ __html: inlineFormat(trimmed) }}
          />
        )
      }
    }
    flushList()
    return elements
  }

  return (
    <div className="space-y-3">
      {/* Loading / Error / Releases */}
      {loading ? (
        <div className="rounded-xl border overflow-hidden bg-surface-card border-edge">
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-content-muted" />
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border overflow-hidden bg-surface-card border-edge">
          <div className="p-6 text-center">
            <p className="text-sm text-content-muted">{t('admin.github.error')}</p>
            <p className="text-xs mt-1 text-content-faint">{error}</p>
          </div>
        </div>
      ) : (
      <div className="rounded-xl border overflow-hidden bg-surface-card border-edge">
        <div className="px-5 py-4 border-b flex items-center justify-between border-edge-secondary">
          <div>
            <h2 className="font-semibold text-content">{t('admin.github.title')}</h2>
            <p className="text-xs mt-0.5 text-content-faint">{t('admin.github.subtitle')}</p>
          </div>
        </div>

        {/* Timeline */}
        <div className="px-5 py-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[11px] top-3 bottom-3 w-px" style={{ background: 'var(--border-primary)' }} />

            <div className="space-y-0">
              {(isPrerelease ? releases : releases.filter(r => !r.prerelease)).map((release, idx) => {
                const isLatest = idx === 0
                const isExpanded = expanded[release.id]

                return (
                  <div key={release.id} className="relative pl-8 pb-5">
                    {/* Timeline dot */}
                    <div
                      className="absolute left-0 top-1 w-[23px] h-[23px] rounded-full flex items-center justify-center border-2"
                      style={{
                        background: isLatest ? 'var(--text-primary)' : 'var(--bg-card)',
                        borderColor: isLatest ? 'var(--text-primary)' : 'var(--border-primary)',
                      }}
                    >
                      <Tag size={10} style={{ color: isLatest ? 'var(--bg-card)' : 'var(--text-faint)' }} />
                    </div>

                    {/* Release content */}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-content">
                          {release.tag_name}
                        </span>
                        {isLatest && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(34,197,94,0.12)] text-[#16a34a]">
                            {t('admin.github.latest')}
                          </span>
                        )}
                        {release.prerelease && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(245,158,11,0.12)] text-[#d97706]">
                            {t('admin.github.prerelease')}
                          </span>
                        )}
                      </div>

                      {release.name && release.name !== release.tag_name && (
                        <p className="text-xs font-medium mt-0.5 text-content-muted">
                          {release.name}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[11px] text-content-faint">
                          <Calendar size={10} />
                          {formatDate(release.published_at || release.created_at)}
                        </span>
                      </div>

                      {/* Expandable body */}
                      {release.body && (
                        <div className="mt-2">
                          <button
                            onClick={() => toggleExpand(release.id)}
                            className="flex items-center gap-1 text-[11px] font-medium transition-colors text-content-muted"
                          >
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {isExpanded ? t('admin.github.hideDetails') : t('admin.github.showDetails')}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 p-3 rounded-lg bg-surface-secondary">
                              {renderBody(release.body)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="text-center pt-2">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors bg-surface-secondary text-content-muted"
              >
                {loadingMore ? <Loader2 size={12} className="animate-spin" /> : <ChevronDown size={12} />}
                {loadingMore ? t('admin.github.loading') : t('admin.github.loadMore')}
              </button>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}
