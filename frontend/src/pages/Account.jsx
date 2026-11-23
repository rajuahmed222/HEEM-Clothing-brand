import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { request, formatPrice } from '../Api.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { Img } from '../components/ProductCard.jsx'
import { Badge, fmtDate, orderTone, payLabel, payTone } from '../components/orders/orderUi.jsx'
import useOrderAlerts from '../lib/orderAlerts.js'

const card = 'block border border-[#1a1716]/15 p-6 transition-colors hover:border-[#1a1716]'
const textLink = 'text-sm underline underline-offset-4 transition-colors hover:text-[#B08D57]'

export default function Account() {
  const { user } = useAuth()
  const { dot, actionNeeded, verified } = useOrderAlerts()
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    document.title = 'My account - HEEM'
    let live = true
    request('dashboard/').then((d) => { if (live) setData(d) }).catch(() => { if (live) setError(true) })
    return () => { live = false }
  }, [])

  const c = data?.counts
  const current = data?.current_order
  const firstName = user.full_name.split(' ')[0]

  return (
    <section className="px-[2.5vw] pb-24">
      <header className="pb-10 pt-12 md:pt-20">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">My account</p>
        <h1 className="mt-4 font-display text-5xl uppercase leading-none md:text-7xl">Welcome back, {firstName}</h1>
        <p className="mt-5 max-w-xl text-neutral-600">Your orders, addresses and saved pieces, all in one quiet place.</p>
        <p className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-neutral-500">
          <span className="break-all">{user.email}</span>
          <Link to="/account/profile" className={textLink}>Edit profile</Link>
        </p>
      </header>

      {dot === 'red' && (
        <p role="alert" className="mb-8 flex flex-wrap items-center gap-3 text-sm text-red-700">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-red-600" />
          One of your payments could not be verified.
          <Link to={`/account/orders/${actionNeeded[0]}`} className="underline underline-offset-4">Send the details again</Link>
        </p>
      )}
      {dot === 'green' && (
        <p role="status" className="mb-8 flex flex-wrap items-center gap-3 text-sm text-green-700">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-green-600" />
          Your payment was verified. Thank you.
          <Link to={`/account/orders/${verified[0]}`} className="underline underline-offset-4">View order</Link>
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/account/orders" className={card}>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Total orders</p>
          <p className="mt-3 font-display text-4xl">{c ? c.orders : '–'}</p>
        </Link>
        <Link to="/account/orders" className={card}>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Active orders</p>
          <p className="mt-3 font-display text-4xl">{c ? c.active_orders : '–'}</p>
        </Link>
        <Link to="/wishlist" className={card}>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Wishlist items</p>
          <p className="mt-3 font-display text-4xl">{c ? c.wishlist : '–'}</p>
        </Link>
        <Link to="/cart" className={card}>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Shopping bag items</p>
          <p className="mt-3 font-display text-4xl">{c ? c.cart : '–'}</p>
        </Link>
      </div>

      {error && <p className="mt-10 text-neutral-600">We could not load your summary. Please refresh the page.</p>}

      {current && (
        <section aria-labelledby="current-title" className="mt-14">
          <h2 id="current-title" className="font-display text-2xl">Current order</h2>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border border-[#1a1716]/15 p-6">
            <div>
              <p className="font-display text-xl tracking-[0.04em]">{current.number}</p>
              <p className="mt-1 text-sm text-neutral-500">Placed {fmtDate(current.created_at, false)} / {formatPrice(current.total)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={orderTone(current.status)}>{current.status_label}</Badge>
                <Badge tone={payTone(current)}>{payLabel(current)}</Badge>
              </div>
            </div>
            <Link to={`/account/tracking/${current.number}`} className="border-b border-current pb-0.5 text-sm uppercase tracking-[0.18em] transition-colors hover:text-[#B08D57]">Track order</Link>
          </div>
        </section>
      )}

      {data && (
        <section aria-labelledby="recent-title" className="mt-14">
          <div className="flex items-baseline justify-between">
            <h2 id="recent-title" className="font-display text-2xl">Recent orders</h2>
            {data.recent_orders.length > 0 && <Link to="/account/orders" className={textLink}>View all</Link>}
          </div>
          {data.recent_orders.length === 0 ? (
            <div className="mt-5 border border-[#1a1716]/15 p-8 text-center">
              <p className="font-display text-2xl">You have not placed an order yet</p>
              <Link to="/search" className="mt-6 inline-block bg-[#1a1716] px-8 py-3.5 text-sm uppercase tracking-[0.2em] text-[#F7F4EF] transition-colors hover:bg-[#B08D57]">Discover the Collection</Link>
            </div>
          ) : (
            <ul className="mt-5 divide-y divide-[#1a1716]/10 border-y border-[#1a1716]/15">
              {data.recent_orders.map((o, i) => (
                <li key={o.number} className="flex flex-wrap items-center gap-4 py-4">
                  <div className="aspect-[3/4] w-14 shrink-0 overflow-hidden">
                    <Img src={o.items[0]?.thumbnail} alt={o.items[0]?.product_name || ''} i={i} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link to={`/account/orders/${o.number}`} className="font-display text-lg hover:text-[#B08D57]">{o.number}</Link>
                    <p className="text-sm text-neutral-500">{fmtDate(o.created_at, false)} / {o.items.length} {o.items.length === 1 ? 'item' : 'items'}</p>
                    <div className="mt-2"><Badge tone={orderTone(o.status)}>{o.status_label}</Badge></div>
                  </div>
                  <div className="text-right">
                    <p>{formatPrice(o.total)}</p>
                    <p className="mt-2 flex flex-wrap justify-end gap-x-5 gap-y-1">
                      <Link to={`/account/orders/${o.number}`} className={textLink}>View details</Link>
                      {!['cancelled', 'returned'].includes(o.status) && <Link to={`/account/tracking/${o.number}`} className={textLink}>Track order</Link>}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="mt-14 flex flex-wrap gap-x-8 gap-y-3">
        <Link to="/search" className={textLink}>Continue shopping</Link>
        <Link to="/account/addresses" className={textLink}>Saved addresses{c ? ` (${c.addresses})` : ''}</Link>
      </div>

      <section aria-labelledby="profile-title" className="mt-14 max-w-xl">
        <h2 id="profile-title" className="font-display text-2xl">Profile</h2>
        <p className="mt-3 text-sm text-neutral-600">
          Your profile is {user.profile_completion}% complete.{' '}
          <Link to="/account/profile" className="underline underline-offset-4 hover:text-[#B08D57]">Add your details</Link> or{' '}
          <Link to="/account/addresses" className="underline underline-offset-4 hover:text-[#B08D57]">save an address</Link> to move it forward.
        </p>
        <div className="mt-3 h-1.5 w-full bg-[#1a1716]/10" role="progressbar" aria-valuenow={user.profile_completion} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completion">
          <div className="h-full bg-[#1a1716]" style={{ width: `${user.profile_completion}%` }} />
        </div>
      </section>
    </section>
  )
}