import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { publicTabApi, type PublicTabData } from '../../api/client'

/**
 * Public expense-tab page hook — owns the token lookup, the public read
 * fetch, the copy-to-clipboard feedback and the one-time name claim.
 * PublicTabPage is a pure wiring container (see src/pages/PATTERN.md).
 * No auth, no stores: the page renders for anonymous visitors.
 */
export function usePublicTab() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<PublicTabData | null>(null)
  const [error, setError] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState(false)

  useEffect(() => {
    if (!token) return
    publicTabApi.get(token).then(setData).catch(() => setError(true))
  }, [token])

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      setTimeout(() => setCopied(c => (c === key ? null : c)), 1600)
    } catch { /* clipboard unavailable (http / old browser) — the text stays selectable */ }
  }

  const submitClaim = async () => {
    if (!token || !firstName.trim() || !lastName.trim()) return
    setClaiming(true)
    setClaimError(false)
    try {
      await publicTabApi.claim(token, firstName.trim(), lastName.trim())
      const fresh = await publicTabApi.get(token)
      setData(fresh)
    } catch {
      setClaimError(true)
    } finally {
      setClaiming(false)
    }
  }

  return { token, data, error, copied, firstName, setFirstName, lastName, setLastName, claiming, claimError, copy, submitClaim }
}
