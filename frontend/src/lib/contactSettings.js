import { useEffect, useState } from 'react'
import { request } from '../Api.jsx'

// Contact details come from the backend (set by staff in Admin > Contact). Nothing is typed into the pages.
// One shared copy, refreshed at most once a minute, so the Contact page and the floating button share one request.
const TTL = 60_000
let cache = null // { at, data }
let inflight = null

export function loadContactSettings({ force = false } = {}) {
  if (!force && cache && Date.now() - cache.at < TTL) return Promise.resolve(cache.data)
  if (inflight) return inflight
  inflight = request('contact-settings/', { auth: false })
    .then((data) => { cache = { at: Date.now(), data }; return data })
    .finally(() => { inflight = null })
  return inflight
}

// Called by the admin screen after saving, so the next page view loads the new details.
export const resetContactSettings = () => { cache = null }

export function useContactSettings() {
  const [state, setState] = useState(() => (cache ? { data: cache.data, loading: false, error: false } : { data: null, loading: true, error: false }))
  useEffect(() => {
    let live = true
    loadContactSettings()
      .then((data) => { if (live) setState({ data, loading: false, error: false }) })
      .catch(() => { if (live) setState((s) => ({ data: s.data, loading: false, error: true })) })
    return () => { live = false }
  }, [])
  return state
}

// wa.me opens the WhatsApp app on phones and WhatsApp Web / the desktop app on computers. `digits` has no "+".
export const waLink = (digits, text) => `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`
export const telHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, '')}`

// +8801712345678 -> +880 1712 345678 (other numbers are shown as stored)
export function prettyPhone(p) {
  const m = /^\+880(\d{4})(\d{6})$/.exec(p || '')
  return m ? `+880 ${m[1]} ${m[2]}` : p || ''
}