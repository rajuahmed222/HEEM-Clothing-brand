import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { adm, Badge, btnCls, btnGhost, cardCls, inputCls, Msg, money, PageHead, useConfirm, when } from './ui.jsx'
import { errorText } from '../Api.jsx'
import { mediaUrl } from '../components/ProductCard.jsx'
import OrderNotifications from './OrderNotifications.jsx'

export default function OrderView() {
  const { id } = useParams()
  const [o, setO] = useState(null)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)
  const [next, setNext] = useState('')
  const [note, setNote] = useState('')
  const [ask, confirmBox] = useConfirm()
  const [courier, setCourier] = useState('')
  const [tracking, setTracking] = useState('')

  const load = useCallback(() => adm(`orders/${id}/`).then((d) => {
    setO(d); setCourier(d.courier || ''); setTracking(d.tracking_code || ''); setNext('')
  }).catch((e) => setError(errorText(e))), [id])
  useEffect(() => { load() }, [load])

  const run = async (fn, done) => {
    setBusy(true); setError(''); setOk('')
    try { const d = await fn(); setO(d); setCourier(d.courier || ''); setTracking(d.tracking_code || ''); setNext(''); setNote(''); setOk(done) }
    catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }

  if (!o) return error ? <Msg error={error} /> : <p className="text-neutral-600">Loading…</p>

  return (
    <>
      {confirmBox}
      <PageHead title={o.number}>
        <Link to="/admin/orders" className={btnGhost}>← All orders</Link>
      </PageHead>
      <Msg error={error} ok={ok} />
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        <Badge value={o.status} label={o.status_label} />
        <Badge value={o.payment_status} label={`${o.payment_method_label}: ${o.payment_status_label}`} />
        <span className="text-neutral-600">Placed {when(o.created_at)} · {o.customer || 'Guest'}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className={cardCls}>
            <h2 className="mb-3 font-display text-xl">Items</h2>
            <ul className="divide-y divide-[#1a1716]/10 text-sm">
              {o.items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-3">
                  {i.thumbnail ? <img src={mediaUrl(i.thumbnail)} alt="" className="h-14 w-11 object-cover" /> : <div className="h-14 w-11 bg-neutral-200" />}
                  <div className="min-w-0 flex-1">
                    <p>{i.product_name}</p>
                    <p className="text-xs text-neutral-500">{[i.color, i.size].filter(Boolean).join(' / ') || 'One size'} · {money(i.unit_price)} × {i.quantity}</p>
                  </div>
                  <span>{money(i.line_total)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-[#1a1716]/10 pt-3 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(o.subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Delivery</dt><dd>{money(o.delivery_charge)}</dd></div>
              {Number(o.discount) > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>−{money(o.discount)}</dd></div>}
              <div className="flex justify-between font-medium"><dt>Total</dt><dd>{money(o.total)}</dd></div>
            </dl>
          </section>

          {o.payments.length > 0 && (
            <section className={cardCls}>
              <h2 className="mb-3 font-display text-xl">Mobile payments</h2>
              <ul className="space-y-3 text-sm">
                {o.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 border border-[#1a1716]/10 p-3">
                    <span>{p.provider_label} · {p.trx_id} · {money(p.amount_sent)} {!p.amount_matches && <b className="text-red-700">(order total {money(p.expected_amount)})</b>}</span>
                    <span className="flex items-center gap-2"><Badge value={p.status} label={p.status} />{p.status === 'submitted' && <Link to="/admin/payments" className="underline">Review</Link>}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <Timeline title="Order history" rows={o.events} />
            <Timeline title="Payment history" rows={o.payment_events} />
          </div>

          <OrderNotifications id={o.id} />
        </div>

        <div className="space-y-6">
          <section className={cardCls}>
            <h2 className="mb-3 font-display text-xl">Update status</h2>
            {o.next_statuses.length === 0 ? <p className="text-sm text-neutral-600">This order is final. No further status change is possible.</p> : (
              <div className="space-y-3">
                <select className={inputCls} value={next} onChange={(e) => setNext(e.target.value)} aria-label="New status">
                  <option value="">Choose next status…</option>
                  {o.next_statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <input className={inputCls} placeholder="Note (the customer sees it)" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
                <button type="button" className={btnCls} disabled={!next || busy}
                  onClick={async () => {
                    if (['cancelled', 'returned'].includes(next) && !(await ask({ title: 'This is final', message: 'The order cannot be changed after this, and the stock is put back. Continue?', confirmLabel: 'Yes, update status', danger: true }))) return
                    run(() => adm(`orders/${id}/status/`, { method: 'POST', body: { status: next, note } }), 'Status updated.')
                  }}>Update status</button>
              </div>
            )}
            {o.can_collect_cod && <button type="button" className={`${btnGhost} mt-4`} disabled={busy}
              onClick={() => run(() => adm(`orders/${id}/action/`, { method: 'POST', body: { action: 'cod_collected' } }), 'Marked as paid.')}>Cash collected (mark paid)</button>}
            {o.can_mark_refunded && <button type="button" className={`${btnGhost} mt-4`} disabled={busy}
              onClick={async () => (await ask({ title: 'Refund sent?', message: 'Only do this after the refund has really been sent to the customer.', confirmLabel: 'Yes, it was sent' })) && run(() => adm(`orders/${id}/action/`, { method: 'POST', body: { action: 'refund_done' } }), 'Marked as refunded.')}>Refund has been sent</button>}
          </section>

          <section className={cardCls}>
            <h2 className="mb-3 font-display text-xl">Courier</h2>
            <div className="space-y-3">
              <input className={inputCls} placeholder="Courier name" maxLength={80} value={courier} onChange={(e) => setCourier(e.target.value)} />
              <input className={inputCls} placeholder="Tracking code" maxLength={80} value={tracking} onChange={(e) => setTracking(e.target.value)} />
              <button type="button" className={btnGhost} disabled={busy}
                onClick={() => run(() => adm(`orders/${id}/`, { method: 'PATCH', body: { courier, tracking_code: tracking } }), 'Courier saved.')}>Save courier</button>
            </div>
          </section>

          <section className={cardCls}>
            <h2 className="mb-3 font-display text-xl">Delivery</h2>
            <p className="text-sm">{o.recipient_name}<br />{o.phone}<br />{o.address}{o.landmark ? ` (${o.landmark})` : ''}</p>
            {o.is_gift && <p className="mt-2 text-sm text-neutral-600">Gift from {o.buyer_name} ({o.buyer_phone}){o.gift_message ? `: "${o.gift_message}"` : ''}</p>}
            {o.note && <p className="mt-2 text-sm text-neutral-600">Customer note: {o.note}</p>}
          </section>
        </div>
      </div>
    </>
  )
}

function Timeline({ title, rows }) {
  return (
    <section className={cardCls}>
      <h2 className="mb-3 font-display text-xl">{title}</h2>
      {rows.length === 0 ? <p className="text-sm text-neutral-600">Nothing yet.</p> : (
        <ol className="space-y-3 text-sm">
          {[...rows].reverse().map((e, i) => (
            <li key={i}><Badge value={e.status} label={e.status_label} /><p className="mt-1 text-neutral-600">{e.note}</p><p className="text-xs text-neutral-400">{when(e.created_at)} · {e.by}</p></li>
          ))}
        </ol>
      )}
    </section>
  )
}