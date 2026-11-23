import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { request, formatPrice, errorText } from '../Api.jsx'
import { Img } from '../components/ProductCard.jsx'
import { useShop } from '../context/ShopContext.jsx'
import { BD_MOBILE, Field, clean } from '../components/checkout/AddressForm.jsx'
import { Badge, fmtDate, orderTone, payLabel, payTone } from '../components/orders/orderUi.jsx'
import { markPaidSeen } from '../lib/orderAlerts.js'
import InvoiceButton from '../components/order/InvoiceButton.jsx'

const h2 = 'font-display text-2xl'
const textBtn = 'text-sm underline underline-offset-4 transition-colors hover:text-[#B08D57] disabled:opacity-40 disabled:no-underline'
const solid = 'bg-[#1a1716] px-8 py-3.5 text-sm uppercase tracking-[0.2em] text-[#F7F4EF] transition-colors hover:bg-[#B08D57] disabled:cursor-not-allowed disabled:opacity-40'
const first = (m) => (Array.isArray(m) ? m[0] : String(m))

function paymentMessage(o) {
  if (['cancelled', 'returned'].includes(o.status) && o.payment_status === 'cod_pending') return 'This order was not delivered, so no payment is due.'
  switch (o.payment_status) {
    case 'pending_verification': return 'We have your payment details and will check them against our account. Your order is confirmed once the payment is verified.'
    case 'paid': return 'Your payment has been verified.'
    case 'failed': return `We could not verify your payment${o.payment?.review_note ? `: ${o.payment.review_note}` : '.'}`
    case 'cod_pending': return `Please pay ${formatPrice(o.total)} in cash when your order is delivered.`
    case 'refund_pending': return 'Your refund is being processed.'
    case 'refunded': return 'Your payment has been refunded.'
    default: return ''
  }
}

function Timeline({ timeline }) {
  const { events, upcoming } = timeline
  return (
    <ol className="relative border-l border-[#1a1716]/20 pl-6">
      {events.map((e, i) => {
        const current = i === events.length - 1
        return (
          <li key={`${e.status}-${e.created_at}`} className="relative pb-6 last:pb-0">
            <span aria-hidden="true" className={`absolute -left-[1.85rem] top-1.5 h-3 w-3 rounded-full border border-[#1a1716] ${current ? 'bg-[#1a1716]' : 'bg-[#F7F4EF]'}`} />
            <p className={current ? '' : 'text-neutral-700'}>{e.label}{current && <span className="sr-only"> (current)</span>}</p>
            <p className="text-sm text-neutral-500">{fmtDate(e.created_at)}</p>
            {e.note && <p className="mt-1 text-sm text-neutral-600">{e.note}</p>}
          </li>
        )
      })}
      {upcoming.map((u) => (
        <li key={u.status} className="relative pb-6 text-neutral-400 last:pb-0">
          <span aria-hidden="true" className="absolute -left-[1.85rem] top-1.5 h-3 w-3 rounded-full border border-[#1a1716]/30 bg-[#F7F4EF]" />
          <p>{u.label}</p>
        </li>
      ))}
    </ol>
  )
}

// Shown only after staff rejected a mobile payment: the customer can send corrected details
function ResubmitPayment({ order, onDone }) {
  const [f, setF] = useState({ sender_number: '', trx_id: '', amount_sent: String(Number(order.total)), note: '' })
  const [errors, setErrors] = useState({})
  const [banner, setBanner] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = async (ev) => {
    ev.preventDefault()
    if (busy) return
    const err = {}
    if (!BD_MOBILE.test(clean(f.sender_number))) err.sender_number = 'Enter the mobile number you paid from (01XXXXXXXXX).'
    if (!/^[A-Za-z0-9]{6,20}$/.test(f.trx_id.trim())) err.trx_id = 'Enter the TrxID exactly as in your payment message.'
    if (!(Number(f.amount_sent) > 0)) err.amount_sent = 'Enter the amount you sent.'
    setErrors(err)
    setBanner('')
    if (Object.keys(err).length) return
    setBusy(true)
    try {
      const data = await request(`orders/${order.number}/payment/`, {
        method: 'POST',
        body: { sender_number: clean(f.sender_number), trx_id: f.trx_id.trim(), amount_sent: String(f.amount_sent).trim(), note: f.note.trim() },
      })
      onDone(data, 'Thank you. Your payment details were sent and are waiting for verification.')
    } catch (e) {
      const d = e.data || {}
      const src = d.payment && typeof d.payment === 'object' ? d.payment : d
      const mapped = {}
      for (const k of ['sender_number', 'trx_id', 'amount_sent', 'note']) if (src[k]) mapped[k] = first(src[k])
      setErrors(mapped)
      setBanner(Object.keys(mapped).length ? 'Please check the highlighted fields.' : (errorText(e) || e.message))
      setBusy(false)
    }
  }

  return (
    <form id="payment-resubmit" onSubmit={submit} noValidate className="mt-6 border border-[#1a1716]/15 p-5 md:p-6">
      <h3 className="font-display text-xl">Send your payment details again</h3>
      <p className="mt-2 text-sm text-neutral-600">Enter the details from your {order.payment_method_label} payment message. We will never ask for your PIN, OTP or password.</p>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Field id="re-sender_number" label="Number you paid from" error={errors.sender_number}>
          {(p) => <input {...p} type="tel" inputMode="tel" placeholder="01XXXXXXXXX" value={f.sender_number} onChange={set('sender_number')} autoComplete="tel" />}
        </Field>
        <Field id="re-trx_id" label="Transaction ID (TrxID)" error={errors.trx_id}>
          {(p) => <input {...p} value={f.trx_id} onChange={set('trx_id')} autoComplete="off" autoCapitalize="characters" spellCheck="false" />}
        </Field>
        <Field id="re-amount_sent" label="Amount sent (৳)" error={errors.amount_sent}>
          {(p) => <input {...p} inputMode="decimal" value={f.amount_sent} onChange={set('amount_sent')} autoComplete="off" />}
        </Field>
        <Field id="re-note" label="Note" optional error={errors.note}>
          {(p) => <input {...p} maxLength={200} value={f.note} onChange={set('note')} autoComplete="off" />}
        </Field>
      </div>
      {banner && <p role="alert" className="mt-4 text-sm text-[#8a6d3b]">{banner}</p>}
      <button type="submit" disabled={busy} className={`mt-5 ${solid}`}>{busy ? 'Sending…' : 'Send payment details'}</button>
    </form>
  )
}

// Cancel / return: a reason box and a confirmation step, so it is never one accidental click
function OrderAction({ label, confirmLabel, hint, url, onDone, doneText }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const data = await request(url, { method: 'POST', body: { reason: reason.trim() } })
      onDone(data, doneText)
    } catch (e) {
      setError(errorText(e) || e.message)
      setBusy(false)
    }
  }

  if (!open) return <button type="button" onClick={() => setOpen(true)} className={textBtn}>{label}</button>
  return (
    <div className="mt-2 max-w-xl border border-[#1a1716]/15 p-5">
      <p className="text-sm text-neutral-600">{hint}</p>
      <label htmlFor={`reason-${url}`} className="mt-4 block text-sm">Reason <span className="text-neutral-400">(optional)</span></label>
      <textarea id={`reason-${url}`} rows={2} maxLength={250} value={reason} onChange={(e) => setReason(e.target.value)}
        className="mt-2 w-full border border-[#1a1716]/20 bg-transparent px-4 py-3 text-[0.95rem] outline-none focus:border-[#1a1716]" />
      {error && <p role="alert" className="mt-3 text-sm text-[#8a6d3b]">{error}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-5">
        <button type="button" onClick={run} disabled={busy} className={solid}>{busy ? 'Please wait…' : confirmLabel}</button>
        <button type="button" onClick={() => setOpen(false)} disabled={busy} className={textBtn}>Keep as it is</button>
      </div>
    </div>
  )
}

export default function OrderDetail() {
  const { number } = useParams()
  const [o, setO] = useState(null)
  const [state, setState] = useState('loading') // loading | ok | missing | error
  const [attempt, setAttempt] = useState(0)
  const [message, setMessage] = useState('')
  const [reordering, setReordering] = useState(false)
  const [bagLink, setBagLink] = useState(false)
  const { refresh } = useShop()

  useEffect(() => { document.title = `Order ${number} - HEEM` }, [number])
  useEffect(() => { if (o?.payment_status === 'paid') markPaidSeen(o.number) }, [o?.payment_status, o?.number])
  useEffect(() => {
    let live = true
    window.scrollTo(0, 0)
    setState('loading')
    request(`orders/${number}/`)
      .then((d) => { if (live) { setO(d); setState('ok') } })
      .catch((e) => { if (live) setState(e.status === 404 ? 'missing' : 'error') })
    return () => { live = false }
  }, [number, attempt])

  const seen = useRef({ pay: '', status: '' })
  useEffect(() => { if (o) seen.current = { pay: o.payment_status, status: o.status } }, [o])

  // Picks up what staff do in the admin (payment verified / rejected, shipping updates) without a manual reload.
  // Checks every 15 seconds while the tab is open, and straight away when the customer comes back to the tab.
  useEffect(() => {
    if (state !== 'ok' || !o) return undefined
    const finished = ['delivered', 'cancelled', 'returned'].includes(o.status)
      && !['pending_verification', 'refund_pending'].includes(o.payment_status)
    if (finished) return undefined
    let stop = false
    const tick = () => {
      if (document.hidden) return
      request(`orders/${number}/`).then((d) => {
        if (stop) return
        if (d.payment_status !== seen.current.pay) {
          setMessage(d.payment_status === 'paid' ? 'Your payment has been verified.'
            : d.payment_status === 'failed' ? 'We could not verify your payment. Please see the details below.'
            : 'Your payment status was updated.')
        } else if (d.status !== seen.current.status) {
          setMessage('Your order status was updated.')
        }
        setO(d)
      }).catch(() => {})
    }
    const id = setInterval(tick, 15000)
    const onVisible = () => { if (!document.hidden) tick() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { stop = true; clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [state, number, o?.status, o?.payment_status])

  const reorder = async () => {
    if (reordering) return
    setReordering(true); setMessage(''); setBagLink(false)
    try {
      const d = await request(`orders/${number}/reorder/`, { method: 'POST' })
      await refresh()
      const added = d.added.reduce((n, a) => n + a.quantity, 0)
      const skipped = d.skipped.length
      setBagLink(added > 0)
      setMessage(added
        ? `${added} ${added === 1 ? 'item was' : 'items were'} added to your bag.${skipped ? ` ${skipped} could not be added because ${skipped === 1 ? 'it is' : 'they are'} no longer available.` : ''}`
        : 'None of these items could be added because they are no longer available.')
    } catch (e) {
      setMessage(errorText(e) || e.message)
    } finally {
      setReordering(false)
    }
  }

  const updated = (data, text) => { setO(data); setMessage(text); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  if (state === 'loading') {
    return <section className="px-[2.5vw] py-24" aria-busy="true"><div className="h-10 w-72 animate-pulse bg-[#1a1716]/[0.06]" /><div className="mt-10 h-64 animate-pulse bg-[#1a1716]/[0.06]" /></section>
  }
  if (state === 'missing') {
    return (
      <section className="px-[2.5vw] py-32 text-center">
        <h1 className="font-display text-3xl md:text-4xl">We could not find this order</h1>
        <Link to="/account/orders" className="mt-8 inline-block border-b border-current pb-1 text-sm uppercase tracking-[0.18em] hover:text-[#B08D57]">Back to my orders</Link>
      </section>
    )
  }
  if (state === 'error') {
    return (
      <section className="px-[2.5vw] py-32 text-center">
        <h1 className="font-display text-3xl md:text-4xl">We could not load this order</h1>
        <button type="button" onClick={() => setAttempt((a) => a + 1)} className="mt-8 border-b border-current pb-1 text-sm uppercase tracking-[0.18em] hover:text-[#B08D57]">Try again</button>
      </section>
    )
  }

  const inProgress = ['processing', 'packed', 'shipped', 'in_transit', 'out_for_delivery'].includes(o.status)
  const pay = o.payment

  return (
    <section className="px-[2.5vw] pb-24">
      <header className="pb-8 pt-12 md:pt-16">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
          <Link to="/account/orders" className="hover:text-[#B08D57]">My orders</Link> / Order details
        </p>
        <h1 className="mt-4 font-display text-4xl leading-none md:text-6xl">{o.number}</h1>
        <p className="mt-3 text-sm text-neutral-500">Placed {fmtDate(o.created_at)}{o.is_gift && ' / Gift order'}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Badge tone={orderTone(o.status)}>{o.status_label}</Badge>
          <Badge tone={payTone(o)}>{payLabel(o)}</Badge>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          {!['cancelled', 'returned'].includes(o.status) && <Link to={`/account/tracking/${o.number}`} className={textBtn}>Track order</Link>}
          <button type="button" onClick={reorder} disabled={reordering} className={textBtn}>{reordering ? 'Please wait…' : 'Reorder'}</button>
          <Link to="/search" className={textBtn}>Continue shopping</Link>
          {o.can_invoice && <InvoiceButton load={() => request(`orders/${o.number}/invoice-link/`)} />}
        </div>
      </header>
      <p role="status" className="min-h-6 pb-4 text-sm text-neutral-700">{message}{bagLink && <> <Link to="/cart" className="underline underline-offset-4">View bag</Link></>}</p>

      {o.can_resubmit_payment && (
        <div role="alert" className="mb-10 border border-[#8a6d3b] p-5 text-[#8a6d3b]">
          <p className="font-display text-xl">We could not verify your payment</p>
          {o.payment?.review_note && <p className="mt-2 text-sm">{o.payment.review_note}</p>}
          <p className="mt-2 text-sm">Please check the details and send them again. If you have already sent the money, enter the correct details and we will check again.</p>
          <button type="button" className="mt-4 text-sm underline underline-offset-4"
            onClick={() => document.getElementById('payment-resubmit')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
            Try again
          </button>
        </div>
      )}

      <div className="grid gap-12 nav:grid-cols-[minmax(0,1fr)_26rem] nav:gap-16">
        <div className="space-y-14">
          <section aria-labelledby="progress-title">
            <h2 id="progress-title" className={`${h2} mb-6`}>Order progress</h2>
            <Timeline timeline={o.timeline} />
            {(o.courier || o.tracking_code) ? (
              <dl className="mt-6 grid max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                {o.courier && <><dt className="text-neutral-500">Courier</dt><dd>{o.courier}</dd></>}
                {o.tracking_code && <><dt className="text-neutral-500">Tracking code</dt><dd className="select-all">{o.tracking_code}</dd></>}
              </dl>
            ) : (
              <p className="mt-6 text-sm text-neutral-500">Courier and tracking details will appear here once your order has been handed over for delivery.</p>
            )}
          </section>

          <section aria-labelledby="payment-title">
            <h2 id="payment-title" className={`${h2} mb-4`}>Payment</h2>
            <p>{o.payment_method_label} <span className="text-neutral-500">/ {payLabel(o)}</span></p>
            {paymentMessage(o) && <p className="mt-3 max-w-xl leading-relaxed text-neutral-600">{paymentMessage(o)}</p>}
            {pay && (
              <dl className="mt-5 grid max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                <dt className="text-neutral-500">Paid from</dt><dd>{pay.sender_number}</dd>
                <dt className="text-neutral-500">TrxID</dt><dd>{pay.trx_id}</dd>
                <dt className="text-neutral-500">Amount sent</dt><dd>{formatPrice(pay.amount_sent)}</dd>
              </dl>
            )}
            {o.can_resubmit_payment && <ResubmitPayment order={o} onDone={updated} />}
            {o.payment_timeline.length > 1 && (
              <details className="mt-6 text-sm">
                <summary className="cursor-pointer text-neutral-600">Payment history</summary>
                <ul className="mt-3 space-y-2">
                  {o.payment_timeline.map((e) => (
                    <li key={`${e.status}-${e.created_at}`}>
                      <span>{e.label}</span> <span className="text-neutral-500">{fmtDate(e.created_at)}</span>
                      {e.note && <span className="block text-neutral-600">{e.note}</span>}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>

          <section aria-labelledby="deliver-title">
            <h2 id="deliver-title" className={`${h2} mb-4`}>{o.is_gift ? 'Gift delivery' : 'Delivery address'}</h2>
            <address className="not-italic leading-relaxed text-neutral-700">
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

          <section aria-labelledby="help-title">
            <h2 id="help-title" className={`${h2} mb-4`}>Cancel or return</h2>
            <div className="space-y-3">
              {o.can_cancel && (
                <OrderAction label="Cancel this order" confirmLabel="Yes, cancel order" url={`orders/${o.number}/cancel/`} onDone={updated}
                  doneText="Your order was cancelled."
                  hint="Your items go back into stock. If you already sent a payment, we will review it and refund any amount we received." />
              )}
              {o.can_return && (
                <OrderAction label="Request a return" confirmLabel="Send return request" url={`orders/${o.number}/return/`} onDone={updated}
                  doneText="Your return request was sent. We will contact you about the next steps."
                  hint="Tell us why you want to return the order. Our team will review it and get in touch." />
              )}
              {!o.can_cancel && !o.can_return && (
                <p className="max-w-xl text-sm text-neutral-500">
                  {inProgress && 'This order is already being prepared or is on its way, so it can no longer be cancelled.'}
                  {o.status === 'delivered' && 'The return window for this order has closed.'}
                  {o.status === 'return_requested' && 'Your return request is being reviewed.'}
                  {['cancelled', 'returned'].includes(o.status) && 'No further changes can be made to this order.'}
                </p>
              )}
            </div>
          </section>
        </div>

        <aside aria-label="Order summary" className="h-fit border border-[#1a1716]/15 p-6 md:p-8">
          <h2 className="mb-6 font-display text-2xl">Order summary</h2>
          <ul className="divide-y divide-[#1a1716]/10">
            {o.items.map((it, i) => (
              <li key={`${it.product_slug}-${it.size}-${it.color}`} className="flex gap-4 py-4 first:pt-0">
                <div className="aspect-[3/4] w-16 shrink-0 overflow-hidden"><Img src={it.thumbnail} alt={it.product_name} i={i} /></div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="uppercase tracking-[0.1em]">
                    {it.product_slug ? <Link to={`/product/${it.product_slug}`} className="hover:text-[#B08D57]">{it.product_name}</Link> : it.product_name}
                  </p>
                  <p className="mt-1 text-neutral-500">{[it.color, it.size && `Size ${it.size}`].filter(Boolean).join(' / ')}</p>
                  <p className="mt-1 text-neutral-500">Qty {it.quantity} x {formatPrice(it.unit_price)}</p>
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