import { useEffect, useMemo, useState } from 'react'
import { request } from '../Api.jsx'

// Delivery and return rules come from the backend (GET /api/store/policy/), so pages never hardcode them.
// If a key in rules.store_policy() is named differently from the guesses below, fix it HERE, in this one place.
const KEYS = {
  dhaka: ['delivery_charge_dhaka', 'dhaka_charge', 'delivery_dhaka', 'charge_dhaka'],
  outside: ['delivery_charge_outside', 'outside_charge', 'delivery_outside', 'charge_outside'],
  freeOver: ['free_delivery_over', 'free_delivery_threshold', 'free_over'],
  returnDays: ['return_window_days', 'return_days'],
}

const pick = (raw, keys) => {
  for (const k of keys) {
    const v = raw?.[k]
    if (v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(v))) return Number(v)
  }
  return null
}

export function readPolicy(raw) {
  return {
    dhaka: pick(raw, KEYS.dhaka),
    outside: pick(raw, KEYS.outside),
    freeOver: pick(raw, KEYS.freeOver),
    returnDays: pick(raw, KEYS.returnDays),
  }
}

let cached = null // one request per visit is enough

export function usePolicy() {
  const [raw, setRaw] = useState(cached)
  useEffect(() => {
    if (cached) return undefined
    let live = true
    request('store/policy/', { auth: false })
      .then((d) => { cached = d; if (live) setRaw(d) })
      .catch(() => {}) // pages still read well without the numbers
    return () => { live = false }
  }, [])
  return useMemo(() => readPolicy(raw), [raw])
}