import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { request } from '../Api.jsx'
import { useAuth } from './AuthContext.jsx'

// ONE cart and ONE wishlist for the whole site.
//  - signed in  -> stored in the backend (database)
//  - guest      -> only variant ids / product ids are kept in this browser, prices and stock
//                  always come from the backend, so both modes show the same data.
// After login the guest items are merged into the account, then the browser copy is cleared.

const ShopContext = createContext(null)
export const useShop = () => useContext(ShopContext)

const GC = 'heem_guest_cart' // [{variant_id, quantity}]
const GW = 'heem_guest_wish' // [product_id]
const read = (k) => { try { return JSON.parse(localStorage.getItem(k)) || [] } catch { return [] } }
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* ignore */ } }
const EMPTY = { items: [], count: 0, subtotal: 0 }

export function ShopProvider({ children }) {
  const { user, ready } = useAuth()
  const [cart, setCart] = useState(EMPTY)
  const [wish, setWish] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const signedIn = !!user

  const loadGuestCart = useCallback(async () => {
    const lines = read(GC)
    if (!lines.length) return EMPTY
    const rows = await request(`cart/resolve/?ids=${lines.map((l) => l.variant_id).join(',')}`, { auth: false })
    const items = rows.map((r) => {
      const qty = lines.find((l) => l.variant_id === r.variant_id)?.quantity || 1
      return { ...r, id: null, quantity: qty, line_total: qty * Number(r.price), quantity_exceeds_stock: qty > r.stock }
    })
    return { items, count: items.reduce((n, i) => n + i.quantity, 0), subtotal: items.reduce((n, i) => n + i.line_total, 0) }
  }, [])

  const loadGuestWish = useCallback(async () => {
    const ids = read(GW)
    if (!ids.length) return []
    return request(`wishlist/resolve/?ids=${ids.join(',')}`, { auth: false })
  }, [])

  const refresh = useCallback(async () => {
    try {
      if (signedIn) {
        const [c, w] = await Promise.all([request('cart/'), request('wishlist/')])
        setCart(c); setWish(w)
      } else {
        const [c, w] = await Promise.all([loadGuestCart(), loadGuestWish()])
        setCart(c); setWish(w)
      }
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoaded(true)
    }
  }, [signedIn, loadGuestCart, loadGuestWish])

  // When login state is known (or changes): merge guest items if we just signed in, then load
  const lastId = useRef(null)
  useEffect(() => {
    if (!ready) return
    ;(async () => {
      if (user && lastId.current !== user.id) {
        const gc = read(GC), gw = read(GW)
        try {
          if (gc.length) await request('cart/merge/', { method: 'POST', body: { items: gc } })
          if (gw.length) await request('wishlist/merge/', { method: 'POST', body: { product_ids: gw } })
          write(GC, []); write(GW, [])
        } catch { /* keep the guest copy, try again next time */ }
      }
      lastId.current = user ? user.id : null
      await refresh()
    })()
  }, [ready, user, refresh])

  // ----- cart actions (they throw on failure so the page can show the message) -----
  const addToCart = useCallback(async (variantId, quantity = 1) => {
    if (signedIn) {
      setCart(await request('cart/', { method: 'POST', body: { variant_id: variantId, quantity } }))
    } else {
      const lines = read(GC)
      const line = lines.find((l) => l.variant_id === variantId)
      if (line) line.quantity += quantity; else lines.push({ variant_id: variantId, quantity })
      write(GC, lines)
      setCart(await loadGuestCart())
    }
  }, [signedIn, loadGuestCart])

  const updateQty = useCallback(async (item, quantity) => {
    if (signedIn) {
      setCart(await request(`cart/${item.id}/`, { method: 'PATCH', body: { quantity } }))
    } else {
      if (quantity > item.stock) throw new Error(`Only ${item.stock} in stock.`)
      write(GC, read(GC).map((l) => (l.variant_id === item.variant_id ? { ...l, quantity } : l)))
      setCart(await loadGuestCart())
    }
  }, [signedIn, loadGuestCart])

  const removeItem = useCallback(async (item) => {
    if (signedIn) {
      setCart(await request(`cart/${item.id}/`, { method: 'DELETE' }))
    } else {
      write(GC, read(GC).filter((l) => l.variant_id !== item.variant_id))
      setCart(await loadGuestCart())
    }
  }, [signedIn, loadGuestCart])

  // ----- wishlist actions -----
  const wishIds = useMemo(() => new Set(wish.map((w) => w.product_id)), [wish])

  const toggleWish = useCallback(async (productId) => {
    if (!productId) return
    const has = wishIds.has(productId)
    if (signedIn) {
      if (has) await request(`wishlist/${productId}/`, { method: 'DELETE' })
      else await request('wishlist/', { method: 'POST', body: { product_id: productId } })
      setWish(await request('wishlist/'))
    } else {
      const ids = read(GW)
      write(GW, has ? ids.filter((i) => i !== productId) : [...ids, productId])
      setWish(await loadGuestWish())
    }
  }, [signedIn, wishIds, loadGuestWish])

  const moveToCart = useCallback(async (productId, variantId) => {
    if (signedIn) {
      setCart(await request(`wishlist/${productId}/move-to-cart/`, { method: 'POST', body: { variant_id: variantId } }))
      setWish(await request('wishlist/'))
    } else {
      await addToCart(variantId, 1)
      write(GW, read(GW).filter((i) => i !== productId))
      setWish(await loadGuestWish())
    }
  }, [signedIn, addToCart, loadGuestWish])

  const value = useMemo(() => ({
    cart, cartCount: cart.count, wish, wishIds, wishCount: wish.length, loaded, error,
    addToCart, updateQty, removeItem, toggleWish, moveToCart, refresh,
  }), [cart, wish, wishIds, loaded, error, addToCart, updateQty, removeItem, toggleWish, moveToCart, refresh])

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}