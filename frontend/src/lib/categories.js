import { useEffect, useState } from 'react'
import { getCategories } from '../Api.jsx'

// One shared request for the whole site. Each category carries `state`: live | coming_soon | hidden.
let cache = null      // { at, list }
let inflight = null
const TTL = 60_000

function load() {
  if (cache && Date.now() - cache.at < TTL) return Promise.resolve(cache.list)
  if (!inflight) {
    inflight = getCategories()
      .then((list) => { cache = { at: Date.now(), list: Array.isArray(list) ? list : [] }; return cache.list })
      .finally(() => { inflight = null })
  }
  return inflight
}

export function resetCategories() { cache = null }

// { list, bySlug, ready, failed }. If the request fails the site behaves as before (everything shown).
export default function useCategories() {
  const [s, setS] = useState(() => ({ list: cache?.list || [], ready: !!cache, failed: false }))
  useEffect(() => {
    let live = true
    load().then((list) => live && setS({ list, ready: true, failed: false }))
      .catch(() => live && setS({ list: [], ready: true, failed: true }))
    return () => { live = false }
  }, [])
  const bySlug = Object.fromEntries(s.list.map((c) => [c.slug, c]))
  return { ...s, bySlug }
}