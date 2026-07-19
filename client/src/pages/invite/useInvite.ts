import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { guestInviteApi, type GuestInvitePrefill } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { captureEvent } from '../../analytics/posthog'

export type InviteViewState = 'loading' | 'valid' | 'expired' | 'invalid'
export type InviteStep = 'form' | 'colleagues'

/**
 * State machine for the public invite redemption page:
 * resolve → form → (register: cookie set server-side, store adopts the
 * session) → optional colleague-links step → into the trip.
 */
export function useInvite() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const adoptSession = useAuthStore(s => s.adoptSession)

  const [view, setView] = useState<InviteViewState>('loading')
  const [step, setStep] = useState<InviteStep>('form')
  const [prefill, setPrefill] = useState<GuestInvitePrefill | null>(null)

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [tripId, setTripId] = useState<number | null>(null)
  const [colleagueCount, setColleagueCount] = useState(3)
  const [colleagueLinks, setColleagueLinks] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!token) { setView('invalid'); return }
    guestInviteApi.resolve(token)
      .then((p) => {
        if (cancelled) return
        setPrefill(p)
        if (p.contact_email) setEmail(p.contact_email)
        if (p.company_name) setCompany(p.company_name)
        setView('valid')
        captureEvent('invite_landing_viewed', { state: 'valid' })
      })
      .catch((err) => {
        if (cancelled) return
        const status = err?.response?.status
        const state = status === 410 ? 'expired' : 'invalid'
        setView(state)
        captureEvent('invite_landing_viewed', { state })
      })
    return () => { cancelled = true }
  }, [token])

  useEffect(() => () => { if (copiedTimer.current) clearTimeout(copiedTimer.current) }, [])

  const submit = useCallback(async () => {
    if (!token || submitting) return
    setSubmitting(true)
    setError(null)
    captureEvent('invite_registration_submitted', { has_company: !!company.trim() })
    try {
      const data = await guestInviteApi.register(token, {
        username: username.trim(),
        email: email.trim(),
        password,
        ...(company.trim() ? { company_name: company.trim() } : {}),
      })
      setTripId(data.trip_id ?? null)
      await adoptSession(data.user)
      captureEvent('invite_registration_completed', { trip_id: data.trip_id ?? undefined })
      if (company.trim()) {
        setStep('colleagues')
        captureEvent('invite_colleagues_viewed')
      } else {
        navigate(data.trip_id ? `/trips/${data.trip_id}` : '/dashboard')
      }
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { error?: string } } }
      setError(errorKeyFor(e.response?.status, e.response?.data?.error))
    } finally {
      setSubmitting(false)
    }
  }, [token, submitting, username, email, password, company, adoptSession, navigate])

  const generateColleagues = useCallback(async () => {
    if (generating) return
    setGenerating(true)
    try {
      const res = await guestInviteApi.createColleagues(colleagueCount)
      setColleagueLinks(res.invite_paths.map(p => `${window.location.origin}${p}`))
      captureEvent('invite_colleague_links_generated', { count: res.invite_paths.length })
    } catch {
      /* non-fatal — the user can skip */
    } finally {
      setGenerating(false)
    }
  }, [generating, colleagueCount])

  const copyLink = useCallback((idx: number) => {
    const url = colleagueLinks[idx]
    if (!url) return
    try {
      navigator.clipboard?.writeText(url)
    } catch { /* older mobile browsers without the async clipboard */ }
    setCopiedIdx(idx)
    if (copiedTimer.current) clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopiedIdx(null), 1600)
  }, [colleagueLinks])

  const finish = useCallback(() => {
    navigate(tripId ? `/trips/${tripId}` : '/dashboard')
  }, [navigate, tripId])

  return {
    view, step, prefill,
    username, setUsername, email, setEmail, password, setPassword, company, setCompany,
    submitting, error, submit,
    colleagueCount, setColleagueCount, colleagueLinks, generating, generateColleagues,
    copiedIdx, copyLink, finish,
  }
}

function errorKeyFor(status?: number, serverError?: string): string {
  if (status === 409) return 'invites.errors.taken'
  if (status === 429) return 'invites.errors.rateLimited'
  if (status === 404 || status === 410) return 'invites.errors.generic'
  if (status === 400) {
    if (serverError?.toLowerCase().includes('reserved')) return 'invites.errors.reserved'
    if (serverError?.toLowerCase().includes('password')) return 'invites.errors.password'
  }
  return 'invites.errors.generic'
}
