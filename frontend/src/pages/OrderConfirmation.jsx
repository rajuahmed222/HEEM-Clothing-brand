import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { request, formatPrice } from '../Api.jsx'
import { Img } from '../components/ProductCard.jsx'
import { markPaidSeen } from '../lib/orderAlerts.js'

const btn = 'block w-full py-4 text-center text-sm uppercase tracking-[0.2em] md:w-auto md:px-10'

// What the customer needs to know about the payment right now. Nothing here says "paid" unless staff verified it.
function paymentMessage(o) {
  const p = o.payment
  switch (o.payment_status) {
    case 'pending_verification':
      return 'We have received your payment details and will check them against our account shortly. Your order is confirmed once the payment is verified.'
    case 'paid':
      return 'Your payment has been verified. Thank you.'
    case 'failed':
      return `We could not verify your payment${p?.review_note ? `: ${p.review_note}` : '.'} Open your order to send the correct details.`
    case 'cod_pending':
      return `Please pay ${formatPrice(o.total)} in cash when your order is delivered.`
    case 'refund_pending':
      return 'Your refund is being processed.'
    case 'refunded':
      return 'Your payment has been refunded.'
    default:
      return ''
  }
}

export default function OrderConfirmation() {
  const { number } = useParams()
  const [order, setOrder] = useState(null)
  const [state, setState] = useState('loading') // loading | ok | missing | error
  const [attempt, setAttempt] = useState(0)

  useEffect(() => { document.title = 'Order placed - HEEM' }, [])
  useEffect(() => { if (order?.payment_status === 'paid') markPaidSeen(order.number) }, [order?.payment_status, order?.number])
  useEffect(() => {
    let live = true
    window.scrollTo(0, 0)
    setState('loading')
    request(`orders/${number}/`)
      .then((o) => { if (live) { setOrder(o); setState('ok') } })
      .catch((e) => { if (live) setState(e.status === 404 ? 'missing' : 'error') })
    return () => { live = false }
  }, [number, attempt])

  // While the payment waits for staff, check every 15 seconds so "paid" / "failed" shows up without a reload
  useEffect(() => {
    if (state !== 'ok' || order?.payment_status !== 'pending_verification') return undefined
    let stop = false
    const tick = () => {
      if (document.hidden) return
      request(`orders/${number}/`).then((d) => { if (!stop) setOrder(d) }).catch(() => {})
    }
    const id = setInterval(tick, 15000)
    const onVisible = () => { if (!document.hidden) tick() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { stop = true; clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [state, number, order?.payment_status])

  if (state === 'loading') {
    return <section className="px-[2.5vw] py-24" aria-busy="true"><div className="h-10 w-64 animate-pulse bg-[#1a1716]/[0.06]" /></section>
  }
  if (state === 'missing') {
    return (
      <section className="px-[2.5vw] py-32 text-center">
        <h1 className="font-display text-3xl md:text-4xl">We could not find this order</h1>
        <Link to="/search" className="mt-8 inline-block border-b border-current pb-1 text-sm uppercase tracking-[0.18em] hover:text-[#B08D57]">Continue shopping</Link>
      </section>
    )
  }
  if (state === 'error') {
    return (
      <section className="px-[2.5vw] py-32 text-center">
        <h1 className="font-display text-3xl md:text-4xl">We could not load your order</h1>
        <p className="mt-4 text-neutral-600">Your order was saved. Please try again to see the details.</p>
        <button type="button" onClick={() => setAttempt((a) => a + 1)} className="mt-8 border-b border-current pb-1 text-sm uppercase tracking-[0.18em] hover:text-[#B08D57]">Try again</button>
      </section>
    )
  }

  const o = order
  const placed = new Date(o.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const mobile = !!o.payment

  return (
    <section className="px-[2.5vw] pb-24">
      <header className="pb-10 pt-12 md:pt-20">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Thank you{o.buyer_name ? `, ${o.buyer_name.split(' ')[0]}` : ''}</p>
        <h1 className="mt-4 font-display text-5xl uppercase leading-none md:text-7xl">Order placed</h1>
        <p className="mt-6 text-lg">Order number <span className="font-display text-2xl tracking-[0.06em]">{o.number}</span></p>
        <p className="mt-1 text-sm text-neutral-500">{placed}</p>
      </header>

      <div className="grid gap-12 nav:grid-cols-[minmax(0,1fr)_26rem] nav:gap-16">
        <div className="space-y-12">
          <section aria-labelledby="pay-title">
            <h2 id="pay-title" className="font-display text-2xl">Payment</h2>
            <p className="mt-3">{o.payment_method_label} <span className="text-neutral-500">/ {o.payment_status_label}</span></p>
            <p role="status" className="mt-3 max-w-xl leading-relaxed text-neutral-600">{paymentMessage(o)}</p>
            {mobile && (
              <dl className="mt-5 grid max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                <dt className="text-neutral-500">Paid from</dt><dd>{o.payment.sender_number}</dd>
                <dt className="text-neutral-500">TrxID</dt><dd>{o.payment.trx_id}</dd>
                <dt className="text-neutral-500">Amount sent</dt><dd>{formatPrice(o.payment.amount_sent)}</dd>
              </dl>
            )}
          </section>

          <section aria-labelledby="deliver-title">
            <h2 id="deliver-title" className="font-display text-2xl">{o.is_gift ? 'Gift delivery' : 'Delivery address'}</h2>
            <address className="mt-3 not-italic leading-relaxed text-neutral-700">
              {o.recipient_name}<br />{o.phone}<br />{o.address_summary}
              {o.landmark && <><br />{o.landmark}</>}
              {o.postal_code && <><br />{o.postal_code}</>}
            </address>
            {o.is_gift && (
              <div className="mt-4 text-sm text-neutral-600">
                <p>Ordered by {o.buyer_name}{o.buyer_phone ? `, ${o.buyer_phone}` : ''}</p>
                {o.gift_message && <p className="mt-2 max-w-xl whitespace-pre-line">Gift message: {o.gift_message}</p>}
              </div>
            )}
          </section>

          <div className="flex flex-col gap-3 md:flex-row">
            <Link to={`/account/orders/${o.number}`} className={`${btn} bg-[#1a1716] text-[#F7F4EF] transition-colors hover:bg-[#B08D57]`}>Track order</Link>
            <Link to="/search" className={`${btn} border border-[#1a1716]/20 transition-colors hover:border-[#1a1716]`}>Continue shopping</Link>
          </div>
        </div>

        <aside aria-label="Order summary" className="h-fit border border-[#1a1716]/15 p-6 md:p-8">
          <h2 className="mb-6 font-display text-2xl">Order summary</h2>
          <ul className="divide-y divide-[#1a1716]/10">
            {o.items.map((it, i) => (
              <li key={`${it.product_slug}-${it.size}-${it.color}`} className="flex gap-4 py-4 first:pt-0">
                <div className="aspect-[3/4] w-16 shrink-0 overflow-hidden"><Img src={it.thumbnail} alt={it.product_name} i={i} /></div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="uppercase tracking-[0.1em]">{it.product_name}</p>
                  <p className="mt-1 text-neutral-500">{[it.color, it.size && `Size ${it.size}`].filter(Boolean).join(' / ')}</p>
                  <p className="mt-1 text-neutral-500">Qty {it.quantity}</p>
                </div>
                <p className="whitespace-nowrap text-sm">{formatPrice(it.line_total)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-5 space-y-3 border-t border-[#1a1716]/15 pt-5 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPrice(o.subtotal)}</dd></div>
            {Number(o.discount) > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>-{formatPrice(o.discount)}</dd></div>}
            <div className="flex justify-between"><dt>Delivery</dt><dd>{Number(o.delivery_charge) === 0 ? 'Free' : formatPrice(o.delivery_charge)}</dd></div>
            <div className="flex justify-between border-t border-[#1a1716]/15 pt-4 text-base"><dt>Total</dt><dd className="text-lg">{formatPrice(o.total)}</dd></div>
          </dl>
        </aside>
      </div>
    </section>
  )
}