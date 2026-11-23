import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { request, formatPrice, errorText } from '../Api.jsx'
import { Img } from '../components/ProductCard.jsx'
import RecommendedProducts from '../components/RecommendedProducts.jsx'
import { useShop } from '../context/ShopContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const textBtn = 'text-sm underline underline-offset-4 transition-colors hover:text-[#B08D57] disabled:opacity-40 disabled:no-underline'
const stepBtn = 'h-10 w-10 text-lg transition-colors hover:text-[#B08D57] disabled:opacity-35 disabled:hover:text-inherit'
const cta = 'block w-full py-4 text-center text-sm uppercase tracking-[0.2em]'

function Header({ count }) {
  return (
    <header className="pb-10 pt-12 md:pt-20">
      <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Shopping bag</p>
      <h1 className="mt-4 font-display text-5xl uppercase leading-none md:text-7xl">Your bag</h1>
      {count > 0 && <p className="mt-5 text-xs uppercase tracking-[0.2em] text-neutral-500">{count} {count === 1 ? 'item' : 'items'}</p>}
    </header>
  )
}

function Skeleton() {
  return (
    <div aria-hidden="true" className="space-y-8">
      {[0, 1].map((i) => (
        <div key={i} className="flex gap-6 border-b border-[#1a1716]/15 pb-8">
          <div className="aspect-[3/4] w-28 animate-pulse bg-[#1a1716]/[0.06]" />
          <div className="flex-1 space-y-3">
            <div className="h-3 w-1/2 animate-pulse bg-[#1a1716]/[0.06]" />
            <div className="h-3 w-1/4 animate-pulse bg-[#1a1716]/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Cart() {
  const { cart, wishIds, loaded, error, updateQty, removeItem, toggleWish, refresh } = useShop()
  const { user } = useAuth()
  const [policy, setPolicy] = useState(null)
  const [busy, setBusy] = useState(false)
  // key = which line the message belongs to ('page' = general message at the top)
  const [note, setNote] = useState({ key: '', text: '', ok: true })

  useEffect(() => { document.title = 'Shopping bag - HEEM' }, [])
  useEffect(() => {
    let live = true
    request('store/policy/', { auth: false }).then((p) => { if (live) setPolicy(p) }).catch(() => {})
    return () => { live = false }
  }, [])

  const items = cart.items
  const subtotal = Number(cart.subtotal) || 0
  const perItem = policy?.max_per_item ?? 10
  const blocked = items.some((i) => !i.in_stock || i.quantity_exceeds_stock)
  const toFree = policy ? Math.max(Number(policy.free_over) - subtotal, 0) : 0

  const run = async (key, action, doneText) => {
    if (busy) return
    setBusy(true)
    setNote({ key, text: '', ok: true })
    try {
      await action()
      if (doneText) setNote({ key: 'page', text: doneText, ok: true })
    } catch (e) {
      setNote({ key, text: errorText(e) || e.message, ok: false })
    } finally {
      setBusy(false)
    }
  }
  const setQty = (item, q) => run(item.variant_id, () => updateQty(item, q))
  const remove = (item) => run(item.variant_id, () => removeItem(item), `${item.name} removed from your bag.`)
  const saveForLater = (item) => run(item.variant_id, async () => {
    // wishlist is per product; toggling an item that is already saved would remove it, so only add when missing
    if (!wishIds.has(item.product_id)) await toggleWish(item.product_id)
    await removeItem(item)
  }, `${item.name} saved to your wishlist.`)

  const status = <p role="status" className="min-h-6 pb-4 text-sm text-neutral-700">{note.key === 'page' ? note.text : ''}</p>
  const recommended = <RecommendedProducts exclude={new Set(items.map((i) => i.product_id))} />

  if (!loaded) {
    return <section className="px-[2.5vw] pb-24"><Header count={0} /><Skeleton /></section>
  }
  if (error && items.length === 0) {
    return (
      <section className="px-[2.5vw] pb-24">
        <Header count={0} />
        <p className="text-neutral-600">We could not load your bag. {error}</p>
        <button type="button" onClick={refresh} className={`mt-6 ${textBtn}`}>Try again</button>
      </section>
    )
  }
  if (items.length === 0) {
    return (
      <section className="px-[2.5vw] pb-24">
        <Header count={0} />
        {status}
        <div className="py-10 text-center md:py-20">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Your bag is empty</p>
          <h2 className="mx-auto mt-4 max-w-xl font-display text-3xl md:text-4xl">Wear your identity</h2>
          <Link to="/search" className="mt-10 inline-block bg-[#1a1716] px-10 py-4 text-sm uppercase tracking-[0.2em] text-[#F7F4EF] transition-colors hover:bg-[#B08D57]">
            Discover the Collection
          </Link>
          {wishIds.size > 0 && <p className="mt-6"><Link to="/wishlist" className={textBtn}>View your wishlist ({wishIds.size})</Link></p>}
        </div>
        {recommended}
      </section>
    )
  }

  return (
    <section className="px-[2.5vw] pb-24">
      <Header count={cart.count} />
      {status}
      <div className="grid gap-12 nav:grid-cols-[minmax(0,1fr)_24rem] nav:gap-16">
        <ul aria-label="Items in your bag" className="border-t border-[#1a1716]/15">
          {items.map((item, idx) => {
            const max = Math.min(item.stock, perItem)
            const lineNote = note.key === item.variant_id && note.text
            return (
              <li key={item.variant_id} className="flex gap-4 border-b border-[#1a1716]/15 py-6 md:gap-6">
                <Link to={`/product/${item.slug}`} aria-label={item.name} className="block w-24 shrink-0 md:w-32">
                  <div className="aspect-[3/4] overflow-hidden"><Img src={item.image} alt={item.name} i={idx} /></div>
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="text-sm uppercase tracking-[0.12em]">
                        <Link to={`/product/${item.slug}`} className="transition-colors hover:text-[#B08D57]">{item.name}</Link>
                      </h2>
                      <p className="mt-1 text-sm text-neutral-500">{[item.color, item.size && `Size ${item.size}`].filter(Boolean).join(' / ')}</p>
                      <p className="mt-1 text-sm text-neutral-600">{formatPrice(item.price)}</p>
                    </div>
                    <p className="whitespace-nowrap">{formatPrice(item.line_total)}</p>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-3 pt-4">
                    <div role="group" aria-label={`Quantity for ${item.name}`} className="inline-flex items-center border border-[#1a1716]/20">
                      <button type="button" aria-label="Decrease quantity" disabled={busy || item.quantity <= 1} onClick={() => setQty(item, item.quantity - 1)} className={stepBtn}>−</button>
                      <output aria-live="polite" className="w-8 text-center">{item.quantity}</output>
                      <button type="button" aria-label="Increase quantity" disabled={busy || item.quantity >= max} onClick={() => setQty(item, item.quantity + 1)} className={stepBtn}>+</button>
                    </div>
                    <button type="button" disabled={busy} onClick={() => saveForLater(item)} className={textBtn}>Save for later</button>
                    <button type="button" disabled={busy} onClick={() => remove(item)} className={textBtn}>Remove</button>
                  </div>

                  {!item.in_stock && <p className="mt-3 text-sm text-[#8a6d3b]">This option is sold out. Remove it to continue.</p>}
                  {item.in_stock && item.quantity_exceeds_stock && (
                    <p className="mt-3 text-sm text-[#8a6d3b]">
                      Only {item.stock} left.{' '}
                      <button type="button" disabled={busy} onClick={() => setQty(item, item.stock)} className={textBtn}>Update quantity</button>
                    </p>
                  )}
                  {lineNote && <p role="alert" className="mt-3 text-sm text-[#8a6d3b]">{lineNote}</p>}
                </div>
              </li>
            )
          })}
        </ul>

        <aside aria-label="Order summary" className="h-fit border border-[#1a1716]/15 p-6 md:p-8 nav:sticky nav:top-24">
          <h2 className="font-display text-2xl">Order summary</h2>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Delivery</dt><dd className="text-neutral-600">Calculated at checkout</dd></div>
          </dl>
          {policy && (
            <p className="mt-4 text-xs leading-relaxed text-neutral-500">
              Delivery is {formatPrice(policy.delivery_dhaka)} inside Dhaka and {formatPrice(policy.delivery_outside)} elsewhere, free on orders over {formatPrice(policy.free_over)}.
              {' '}{toFree > 0 ? `Add ${formatPrice(toFree)} more for free delivery.` : 'Your order qualifies for free delivery.'}
            </p>
          )}
          <div className="mt-6 flex justify-between border-t border-[#1a1716]/15 pt-4">
            <span>Total before delivery</span><span className="text-lg">{formatPrice(subtotal)}</span>
          </div>

          <div className="mt-6">
            {blocked ? (
              <>
                <button type="button" disabled className={`${cta} cursor-not-allowed bg-[#1a1716] text-[#F7F4EF] opacity-40`}>Proceed to checkout</button>
                <p className="mt-3 text-sm text-[#8a6d3b]">Some items are unavailable. Update or remove them to continue.</p>
              </>
            ) : (
              <Link to="/checkout" className={`${cta} bg-[#1a1716] text-[#F7F4EF] transition-colors hover:bg-[#B08D57]`}>Proceed to checkout</Link>
            )}
            <Link to="/search" className={`${cta} mt-3 border border-[#1a1716]/20 transition-colors hover:border-[#1a1716]`}>Continue shopping</Link>
          </div>
          {!user && <p className="mt-4 text-xs text-neutral-500">At checkout you can sign in or continue as a guest. Your bag is kept.</p>}
        </aside>
      </div>
      {recommended}
    </section>
  )
}