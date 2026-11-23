import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { request, formatPrice } from '../Api.jsx'
import { Img } from '../components/ProductCard.jsx'
import { Badge, PAYMENT_STATUSES, fmtDate, orderTone, payLabel, payTone } from '../components/orders/orderUi.jsx'

// The chips map to real backend statuses (see ORDER_GROUPS in shopping/views.py)
const GROUPS = [
  ['', 'All orders'], ['processing', 'Processing'], ['shipped', 'Shipped'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled'],
]
const control = 'w-full border border-[#1a1716]/20 bg-transparent px-4 py-3 text-[0.95rem] outline-none focus:border-[#1a1716]'
const link = 'border-b border-current pb-0.5 text-sm uppercase tracking-[0.18em] transition-colors hover:text-[#B08D57]'

const queryString = (q, group, pay) => {
  const p = new URLSearchParams()
  if (q.trim()) p.set('q', q.trim())
  if (group) p.set('group', group)
  if (pay) p.set('payment_status', pay)
  return p.toString()
}

export default function Orders() {
  const [q, setQ] = useState('')
  const [group, setGroup] = useState('')
  const [pay, setPay] = useState('')
  const [orders, setOrders] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const filtered = !!(q.trim() || group || pay)

  useEffect(() => { document.title = 'My orders - HEEM' }, [])

  useEffect(() => {
    const ctl = new AbortController()
    setLoading(true)
    setError(false)
    const t = setTimeout(() => {
      request(`orders/?${queryString(q, group, pay)}`, { signal: ctl.signal })
        .then((d) => { setOrders(d); setLoading(false) })
        .catch((e) => { if (e.name !== 'AbortError') { setError(true); setLoading(false) } })
    }, 250)
    return () => { clearTimeout(t); ctl.abort() }
  }, [q, group, pay, attempt])

  // Pick up what staff change in the admin (payment verified / rejected, shipping updates) without a manual reload
  useEffect(() => {
    const tick = () => { if (!document.hidden) request(`orders/?${queryString(q, group, pay)}`).then(setOrders).catch(() => {}) }
    const id = setInterval(tick, 30000)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick) }
  }, [q, group, pay])

  const clear = () => { setQ(''); setGroup(''); setPay('') }

  return (
    <section className="px-[2.5vw] pb-24">
      <header className="pb-8 pt-12 md:pt-20">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">My account</p>
        <h1 className="mt-4 font-display text-5xl uppercase leading-none md:text-7xl">My orders</h1>
      </header>

      <div role="group" aria-label="Filter orders" className="flex flex-wrap gap-2">
        {GROUPS.map(([v, l]) => (
          <button key={v} type="button" aria-pressed={group === v} onClick={() => setGroup(v)}
            className={`border px-4 py-2 text-sm transition-colors ${group === v ? 'border-[#1a1716] bg-[#1a1716] text-[#F7F4EF]' : 'border-[#1a1716]/20 hover:border-[#1a1716]'}`}>{l}</button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[1.6fr_1fr]">
        <label className="block text-sm">
          <span className="mb-2 block text-neutral-500">Order number</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. HEEM-20261015-A7K2" className={control} autoComplete="off" />
        </label>
        <label className="block text-sm">
          <span className="mb-2 block text-neutral-500">Payment status</span>
          <select value={pay} onChange={(e) => setPay(e.target.value)} className={control}>
            <option value="">All</option>
            {PAYMENT_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </div>
      {filtered && <p className="pt-4 text-sm"><button type="button" onClick={clear} className="underline underline-offset-4 hover:text-[#B08D57]">Clear filters</button></p>}

      <div aria-busy={loading} className={`mt-8 transition-opacity ${loading && orders ? 'opacity-50' : ''}`}>
        {error ? (
          <div>
            <p className="text-neutral-600">We could not load your orders.</p>
            <button type="button" onClick={() => setAttempt((a) => a + 1)} className="mt-4 text-sm underline underline-offset-4 hover:text-[#B08D57]">Try again</button>
          </div>
        ) : !orders ? (
          <div aria-hidden="true" className="space-y-4">{[0, 1].map((i) => <div key={i} className="h-40 animate-pulse bg-[#1a1716]/[0.06]" />)}</div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">{filtered ? 'No matching orders' : 'No orders yet'}</p>
            <h2 className="mx-auto mt-4 max-w-xl font-display text-3xl md:text-4xl">{filtered ? 'Try a different filter or search' : 'Your orders will appear here'}</h2>
            {!filtered && (
              <Link to="/search" className="mt-10 inline-block bg-[#1a1716] px-10 py-4 text-sm uppercase tracking-[0.2em] text-[#F7F4EF] transition-colors hover:bg-[#B08D57]">Discover the Collection</Link>
            )}
          </div>
        ) : (
          <ul className="space-y-4">
            {orders.map((o) => (
              <li key={o.number} className="border border-[#1a1716]/15 p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl tracking-[0.04em]">{o.number}</p>
                    <p className="mt-1 text-sm text-neutral-500">Placed {fmtDate(o.created_at, false)}{o.is_gift && ' / Gift'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={orderTone(o.status)}>{o.status_label}</Badge>
                    <Badge tone={payTone(o)}>{payLabel(o)}</Badge>
                  </div>
                </div>

                <ul className="mt-5 space-y-3">
                  {o.items.slice(0, 2).map((it, i) => (
                    <li key={`${it.product_slug}-${it.size}-${it.color}`} className="flex gap-4">
                      <div className="aspect-[3/4] w-14 shrink-0 overflow-hidden"><Img src={it.thumbnail} alt={it.product_name} i={i} /></div>
                      <div className="min-w-0 text-sm">
                        <p className="uppercase tracking-[0.1em]">{it.product_name}</p>
                        <p className="mt-1 text-neutral-500">{[it.color, it.size && `Size ${it.size}`].filter(Boolean).join(' / ')}</p>
                        <p className="mt-1 text-neutral-500">Qty {it.quantity}</p>
                      </div>
                    </li>
                  ))}
                  {o.items.length > 2 && <li className="text-sm text-neutral-500">+ {o.items.length - 2} more {o.items.length - 2 === 1 ? 'item' : 'items'}</li>}
                </ul>

                {o.can_resubmit_payment && (
                  <p role="alert" className="mt-4 text-sm text-[#8a6d3b]">
                    Your payment could not be verified.{' '}
                    <Link to={`/account/orders/${o.number}`} className="underline underline-offset-4">Try again</Link>
                  </p>
                )}

                <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <Link to={`/account/orders/${o.number}`} className={link}>View details</Link>
                    {!['cancelled', 'returned'].includes(o.status) && <Link to={`/account/tracking/${o.number}`} className={link}>Track order</Link>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-neutral-500">{o.payment_method_label}</p>
                    <p className="text-lg">{formatPrice(o.total)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}