import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { request } from '../Api.jsx'
import { Badge, fmtDate, orderTone, payLabel, payTone } from '../components/orders/orderUi.jsx'
import { buildStages, endNotice, isFinished, paymentNotice, shipmentDates } from '../lib/tracking.js'

const MARK = {
  done: 'border-[#1a1716] bg-[#1a1716]',
  current: 'border-[#1a1716] bg-[#F7F4EF] ring-4 ring-[#1a1716]/10',
  todo: 'border-[#1a1716]/25 bg-[#F7F4EF]',
  stopped: 'border-dashed border-[#1a1716]/25 bg-[#F7F4EF]',
  failed: 'border-[#8a6d3b] bg-[#8a6d3b]',
}
const STATE_TEXT = { done: 'completed', current: 'in progress', todo: 'not yet', stopped: 'not reached', failed: 'needs attention' }
const textBtn = 'text-sm underline underline-offset-4 transition-colors hover:text-[#B08D57]'

function Stages({ stages }) {
  return (
    <ol className="grid md:grid-cols-6">
      {stages.map((s, i) => (
        <li key={s.key} className="relative flex gap-4 pb-8 last:pb-0 md:block md:pb-0 md:pr-3">
          {i < stages.length - 1 && (
            <span aria-hidden="true"
              className={`absolute left-[0.4375rem] top-5 h-full w-px md:left-5 md:top-[0.6875rem] md:h-px md:w-full ${s.state === 'done' ? 'bg-[#1a1716]' : 'bg-[#1a1716]/20'}`} />
          )}
          <span aria-hidden="true" className={`relative z-10 mt-1 block h-3.5 w-3.5 shrink-0 rounded-full border ${MARK[s.state]}`} />
          <div className="md:mt-4">
            <p className={s.state === 'todo' || s.state === 'stopped' ? 'text-neutral-400' : s.state === 'failed' ? 'text-[#8a6d3b]' : ''}>
              {s.label}<span className="sr-only"> ({STATE_TEXT[s.state]})</span>
            </p>
            {s.time && <p className="mt-1 text-sm text-neutral-500">{fmtDate(s.time)}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}

export default function OrderTracking() {
  const { number } = useParams()
  const navigate = useNavigate()
  const [orders, setOrders] = useState(null)
  const [listError, setListError] = useState(false)
  const [order, setOrder] = useState(null)
  const [state, setState] = useState('loading') // loading | ok | missing | error
  const [attempt, setAttempt] = useState(0)

  useEffect(() => { document.title = 'Order tracking - HEEM' }, [])

  useEffect(() => {
    let live = true
    request('orders/').then((d) => { if (live) setOrders(d) }).catch(() => { if (live) setListError(true) })
    return () => { live = false }
  }, [attempt])

  // The order to show: the one in the address, else the newest order that is still on its way, else the newest order
  const target = number || (orders && (orders.find((o) => !isFinished(o)) || orders[0])?.number)

  useEffect(() => {
    if (!target) return undefined
    let live = true
    setState('loading')
    request(`orders/${target}/`)
      .then((d) => { if (live) { setOrder(d); setState('ok') } })
      .catch((e) => { if (live) setState(e.status === 404 ? 'missing' : 'error') })
    return () => { live = false }
  }, [target, attempt])

  // Picks up what staff change in the admin, without a manual reload
  useEffect(() => {
    if (state !== 'ok' || !order || (isFinished(order) && order.payment_status !== 'pending_verification')) return undefined
    let stop = false
    const tick = () => {
      if (document.hidden) return
      request(`orders/${order.number}/`).then((d) => { if (!stop) setOrder(d) }).catch(() => {})
    }
    const id = setInterval(tick, 15000)
    document.addEventListener('visibilitychange', tick)
    return () => { stop = true; clearInterval(id); document.removeEventListener('visibilitychange', tick) }
  }, [state, order?.number, order?.status, order?.payment_status])

  const Header = (
    <header className="pb-8 pt-12 md:pt-20">
      <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">My account</p>
      <h1 className="mt-4 font-display text-5xl uppercase leading-none md:text-7xl">Order tracking</h1>
    </header>
  )

  if (listError) {
    return (
      <section className="px-[2.5vw] pb-24">{Header}
        <p className="text-neutral-600">We could not load your orders.</p>
        <button type="button" onClick={() => setAttempt((a) => a + 1)} className={`mt-4 ${textBtn}`}>Try again</button>
      </section>
    )
  }
  if (orders && orders.length === 0) {
    return (
      <section className="px-[2.5vw] pb-24">{Header}
        <div className="py-12 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Nothing to track yet</p>
          <h2 className="mx-auto mt-4 max-w-xl font-display text-3xl md:text-4xl">Your orders will appear here</h2>
          <Link to="/search" className="mt-10 inline-block bg-[#1a1716] px-10 py-4 text-sm uppercase tracking-[0.2em] text-[#F7F4EF] transition-colors hover:bg-[#B08D57]">Discover the Collection</Link>
        </div>
      </section>
    )
  }

  const stages = order ? buildStages(order) : []
  const end = order ? endNotice(order) : null
  const payNote = order ? paymentNotice(order) : null
  const dates = order ? shipmentDates(order) : {}

  return (
    <section className="px-[2.5vw] pb-24">
      {Header}

      <div className="max-w-xl">
        <label htmlFor="track-order" className="mb-2 block text-sm text-neutral-500">Choose an order</label>
        <select id="track-order" value={target || ''} disabled={!orders}
          onChange={(e) => navigate(`/account/tracking/${e.target.value}`)}
          className="w-full border border-[#1a1716]/20 bg-transparent px-4 py-3 text-[0.95rem] outline-none focus:border-[#1a1716]">
          {!orders && <option value="">Loading…</option>}
          {orders?.map((o) => <option key={o.number} value={o.number}>{o.number} / {o.status_label} / {fmtDate(o.created_at, false)}</option>)}
          {orders && number && !orders.some((o) => o.number === number) && <option value={number}>{number}</option>}
        </select>
      </div>

      {state === 'loading' && (
        <div aria-busy="true" className="mt-10 space-y-4"><div className="h-6 w-64 animate-pulse bg-[#1a1716]/[0.06]" /><div className="h-32 animate-pulse bg-[#1a1716]/[0.06]" /></div>
      )}
      {state === 'missing' && <p className="mt-10 text-neutral-600">We could not find this order. Please choose one from the list.</p>}
      {state === 'error' && (
        <div className="mt-10">
          <p className="text-neutral-600">We could not load this order.</p>
          <button type="button" onClick={() => setAttempt((a) => a + 1)} className={`mt-4 ${textBtn}`}>Try again</button>
        </div>
      )}

      {state === 'ok' && order && (
        <div className="mt-12 space-y-14">
          <div>
            <p className="font-display text-2xl tracking-[0.04em]">{order.number}</p>
            <p className="mt-1 text-sm text-neutral-500">Placed {fmtDate(order.created_at)}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone={orderTone(order.status)}>{order.status_label}</Badge>
              <Badge tone={payTone(order)}>{payLabel(order)}</Badge>
            </div>
          </div>

          {end && (
            <div role="status" className="max-w-2xl border border-[#8a6d3b] p-5 text-[#8a6d3b]">
              <p className="font-display text-xl">{end.title}</p>
              {end.time && <p className="mt-1 text-sm">{fmtDate(end.time)}</p>}
              {end.note && <p className="mt-2 text-sm">{end.note}</p>}
            </div>
          )}
          {payNote && (
            <div role="status" className={`max-w-2xl border p-5 ${payNote.tone === 'warn' ? 'border-[#8a6d3b] text-[#8a6d3b]' : 'border-[#1a1716]/15 text-neutral-700'}`}>
              <p className="text-sm leading-relaxed">{payNote.text}</p>
              {payNote.action && <p className="mt-3"><Link to={`/account/orders/${order.number}`} className={textBtn}>Send your payment details again</Link></p>}
            </div>
          )}

          <section aria-labelledby="stages-title">
            <h2 id="stages-title" className="mb-8 font-display text-2xl">Progress</h2>
            <Stages stages={stages} />
          </section>

          <section aria-labelledby="ship-title">
            <h2 id="ship-title" className="mb-4 font-display text-2xl">Shipment</h2>
            {order.courier || order.tracking_code ? (
              <dl className="grid max-w-md grid-cols-[auto_1fr] gap-x-8 gap-y-3 text-[0.95rem]">
                {order.courier && <><dt className="text-neutral-500">Courier</dt><dd>{order.courier}</dd></>}
                {order.tracking_code && <><dt className="text-neutral-500">Tracking number</dt><dd className="select-all">{order.tracking_code}</dd></>}
                {dates.shipped && <><dt className="text-neutral-500">Shipped on</dt><dd>{fmtDate(dates.shipped)}</dd></>}
                {dates.delivered && <><dt className="text-neutral-500">Delivered on</dt><dd>{fmtDate(dates.delivered)}</dd></>}
              </dl>
            ) : (
              <p className="max-w-xl leading-relaxed text-neutral-600">
                Tracking details will appear here once your order has been handed over to the courier. We only show information we receive from the courier.
              </p>
            )}
          </section>

          <p className="flex flex-wrap gap-x-8 gap-y-3">
            <Link to={`/account/orders/${order.number}`} className={textBtn}>View order details</Link>
            <Link to="/search" className={textBtn}>Continue shopping</Link>
          </p>
        </div>
      )}
    </section>
  )
}