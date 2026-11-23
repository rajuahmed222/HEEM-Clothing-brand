import { useCallback, useEffect, useState } from 'react'
import { request } from '../Api.jsx'
import { useAuth } from '../context/AuthContext.jsx'

// red   = a payment was rejected: the customer has to act, so it stays until they send new details
// green = a payment was verified: shown until the customer has opened that order
const KEY = 'heem_seen_paid'
const EVENT = 'heem-alerts'
const NONE = { action_needed: [], verified: [] }

const readSeen = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] }
}

// Call when the customer has looked at a verified order, so its green dot goes away
export function markPaidSeen(number) {
  const seen = readSeen()
  if (seen.includes(number)) return
  try { localStorage.setItem(KEY, JSON.stringify([...seen, number].slice(-200))) } catch { /* storage blocked: the dot just stays */ }
  window.dispatchEvent(new Event(EVENT))
}

export default function useOrderAlerts() {
  const { user } = useAuth()
  const [data, setData] = useState(NONE)
  const [, rerender] = useState(0)

  const load = useCallback(() => {
    if (!user || document.hidden) return
    request('orders/alerts/').then(setData).catch(() => {})
  }, [user])

  useEffect(() => {
    if (!user) { setData(NONE); return undefined }
    load()
    const id = setInterval(load, 30000)
    const onSeen = () => rerender((n) => n + 1)
    document.addEventListener('visibilitychange', load)
    window.addEventListener(EVENT, onSeen)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', load)
      window.removeEventListener(EVENT, onSeen)
    }
  }, [user, load])

  const seen = readSeen()
  const verified = data.verified.filter((n) => !seen.includes(n))
  const dot = data.action_needed.length ? 'red' : verified.length ? 'green' : null
  return { dot, actionNeeded: data.action_needed, verified }
}