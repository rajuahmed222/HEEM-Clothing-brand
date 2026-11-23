// Backend address. For production set VITE_API_URL in frontend/.env
export const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

async function get(path) {
  const res = await fetch(`${API}/api/${path}`)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export const getProducts = (query = '') => get(`products/${query}`)
export const getProduct = (slug) => get(`products/${slug}/`)
export const getCategories = () => get('categories/')
export const formatPrice = (p) => `৳${Number(p).toLocaleString('en-US')}`

export async function searchProducts(query = '', signal) {
  const res = await fetch(`${API}/api/search/?${query}`, { signal })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export async function suggestProducts(q, signal) {
  const res = await fetch(`${API}/api/search/suggest/?q=${encodeURIComponent(q)}`, { signal })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}


const TOKEN_KEY = 'heem_token'

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) } catch { return null }
}

// remember = true -> stays after the browser closes, false -> only this tab/session
export const setToken = (token, remember = true) => {
  try {
    localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    if (token) (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token)
  } catch { /* storage blocked: user simply stays signed out after refresh */ }
}

// One helper for every account/shop call. Sends the login token when there is one.
export async function request(path, { method = 'GET', body, signal, auth = true } = {}) {
  const headers = {}
  const token = auth ? getToken() : null
  if (token) headers.Authorization = `Token ${token}`
  let payload
  if (body instanceof FormData) payload = body
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body) }

  let res
  try {
    res = await fetch(`${API}/api/${path}`, { method, headers, body: payload, signal })
  } catch (e) {
    if (e.name === 'AbortError') throw e
    const err = new Error('Cannot reach the server. Please try again.')
    err.status = 0
    throw err
  }
  if (res.status === 204) return null
  let data = null
  try { data = await res.json() } catch { /* empty body */ }
  if (!res.ok) {
    const err = new Error(errorText({ data }) || `Request failed (${res.status})`)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

// Turn a DRF error body into one readable sentence
export function errorText(err) {
  const d = err?.data
  if (!d) return err?.message || ''
  if (typeof d === 'string') return d
  if (d.detail) return d.detail
  const first = Object.values(d).flat().find((v) => typeof v === 'string')
  return first || err?.message || ''
}

// Field-level errors, e.g. { email: 'An account with this email already exists.' }
export function fieldErrors(err) {
  const d = err?.data
  if (!d || typeof d !== 'object') return {}
  const out = {}
  for (const [k, v] of Object.entries(d)) out[k] = Array.isArray(v) ? v[0] : String(v)
  return out
}

export const getRelatedProducts = (slug, signal) => request(`products/${slug}/related/`, { auth: false, signal })