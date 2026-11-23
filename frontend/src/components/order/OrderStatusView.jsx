import { useState } from 'react'
import { errorText, formatPrice } from '../../Api.jsx'
import InvoiceButton from './InvoiceButton.jsx'
import { mediaUrl } from '../ProductCard.jsx'

const when = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '')

// Read-only order card used by the guest pages: status, timeline, items, totals, delivery details.
// Everything shown comes from the order record in the database.
export default function OrderStatusView({ order, onCancel, onInvoice }) {
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const cancel = async () => {
    setBusy(true); setErr('')
    try { await onCancel(reason.trim()); setConfirming(false) } catch (e) { setErr(errorText(e) || 'We could not cancel this order. Please try again.') }
    setBusy(false)
  }
  const events = order.timeline?.events || []
  const upcoming = order.timeline?.upcoming || []
  const bad = ['cancelled', 'returned'].includes(order.status)

  return (
    <div className="grid gap-10 md:gap-14 nav:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-12">
        <section aria-labelledby="ov-status">
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">Order {order.number}</p>
          <h2 id="ov-status" className={`mt-3 font-display text-3xl md:text-4xl ${bad ? 'text-[#8a6d3b]' : ''}`}>{order.status_label}</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Placed {when(order.created_at)} · {order.payment_method_label} · <span className="text-[#1a1716]">{order.payment_status_label}</span>
          </p>
          {(order.courier || order.tracking_code) && (
            <p className="mt-4 border border-[#1a1716]/15 p-4 text-sm">
              {order.courier && <>Courier: <strong>{order.courier}</strong> </>}
              {order.tracking_code && <>· Tracking code: <strong>{order.tracking_code}</strong></>}
            </p>
          )}
        </section>

        <section aria-label="Order progress">
          <ol className="relative ml-2 border-l border-[#1a1716]/20">
            {events.map((e, i) => (
              <li key={`${e.status}-${i}`} className="relative pb-7 pl-7 last:pb-0">
                <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#1a1716]" aria-hidden="true" />
                <p className="font-display text-lg">{e.label}</p>
                <p className="text-xs text-neutral-500">{when(e.created_at)}</p>
                {e.note && <p className="mt-1 text-sm text-neutral-600">{e.note}</p>}
              </li>
            ))}
            {upcoming.map((u) => (
              <li key={u.status} className="relative pb-7 pl-7 last:pb-0 text-neutral-400">
                <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border border-[#1a1716]/30 bg-[#F7F4EF]" aria-hidden="true" />
                <p className="font-display text-lg">{u.label}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-label="Items">
          <h3 className="font-display text-2xl">Items</h3>
          <ul className="mt-5 divide-y divide-[#1a1716]/10 border-y border-[#1a1716]/10">
            {order.items.map((it, i) => (
              <li key={i} className="flex gap-4 py-5">
                <div className="h-24 w-[4.5rem] shrink-0 overflow-hidden bg-[#1a1716]/[0.05]">
                  {it.thumbnail && <img src={mediaUrl(it.thumbnail)} alt="" loading="lazy" className="h-full w-full object-cover object-top" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg leading-snug">{it.product_name}</p>
                  <p className="mt-1 text-sm text-neutral-500">{[it.size, it.color].filter(Boolean).join(' · ')} · Qty {it.quantity}</p>
                </div>
                <p className="shrink-0 text-sm">{formatPrice(it.line_total)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="h-fit space-y-8 border border-[#1a1716]/15 p-6 md:p-8" aria-label="Order details">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between"><dt className="text-neutral-600">Subtotal</dt><dd>{formatPrice(order.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-neutral-600">Delivery</dt><dd>{Number(order.delivery_charge) ? formatPrice(order.delivery_charge) : 'Free'}</dd></div>
          {Number(order.discount) > 0 && <div className="flex justify-between"><dt className="text-neutral-600">Discount</dt><dd>-{formatPrice(order.discount)}</dd></div>}
          <div className="flex justify-between border-t border-[#1a1716]/15 pt-3 font-display text-xl"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
        </dl>
        <div className="text-sm">
          <h3 className="font-display text-lg">Delivering to</h3>
          <p className="mt-2 text-neutral-700">{order.recipient_name}</p>
          <p className="text-neutral-600">{order.address_summary}</p>
          <p className="text-neutral-600">{order.phone}</p>
        </div>
        {onInvoice && order.can_invoice && <InvoiceButton load={onInvoice} className="border-t border-[#1a1716]/15 pt-6" />}
        {onCancel && order.can_cancel && (
          <div className="border-t border-[#1a1716]/15 pt-6 text-sm">
            {!confirming ? (
              <button type="button" onClick={() => setConfirming(true)} className="border-b border-current pb-1 text-xs uppercase tracking-[0.2em] text-neutral-600 hover:text-[#8a6d3b]">Cancel order</button>
            ) : (
              <div role="group" aria-label="Cancel this order">
                <p className="font-display text-lg">Cancel this order?</p>
                <p className="mt-1 text-neutral-600">This cannot be undone. Any payment already received will be refunded.</p>
                <label className="mt-4 block text-xs uppercase tracking-[0.15em] text-neutral-500" htmlFor="cancel-reason">Reason (optional)</label>
                <input id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} className="mt-1 w-full border border-[#1a1716]/25 bg-transparent px-3 py-2 text-sm outline-none focus:border-[#1a1716]" />
                {err && <p className="mt-3 text-[#8a6d3b]" role="alert">{err}</p>}
                <div className="mt-4 flex gap-3">
                  <button type="button" disabled={busy} onClick={cancel} className="bg-[#1a1716] px-5 py-3 text-xs uppercase tracking-[0.18em] text-[#F7F4EF] hover:bg-[#8a6d3b] disabled:opacity-50">{busy ? 'Cancelling…' : 'Yes, cancel'}</button>
                  <button type="button" disabled={busy} onClick={() => { setConfirming(false); setErr('') }} className="border border-[#1a1716]/30 px-5 py-3 text-xs uppercase tracking-[0.18em] hover:border-[#1a1716]">Keep order</button>
                </div>
              </div>
            )}
          </div>
        )}
        {order.payment?.status === 'rejected' && order.payment.review_note && (
          <p className="border border-[#8a6d3b] p-3 text-sm text-[#8a6d3b]" role="alert">Payment problem: {order.payment.review_note}. Please contact us with your order number.</p>
        )}
      </aside>
    </div>
  )
}