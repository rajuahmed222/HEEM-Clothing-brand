import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { adm, Badge, inputCls, Msg, money, PageHead, Pager, useDebounced, when } from './ui.jsx'
import { errorText } from '../Api.jsx'

export default function Orders() {
  const [params, setParams] = useSearchParams()
  const [opts, setOpts] = useState({ order_statuses: [], payment_statuses: [] })
  const [q, setQ] = useState(params.get('q') || '')
  const dq = useDebounced(q)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const status = params.get('status') || ''
  const pay = params.get('payment_status') || ''
  const page = params.get('page') || '1'

  const set = (k, v) => {
    const next = new URLSearchParams(params)
    v ? next.set(k, v) : next.delete(k)
    if (k !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }

  useEffect(() => { adm('options/').then(setOpts).catch(() => {}) }, [])
  useEffect(() => {
    if (dq !== (params.get('q') || '')) set('q', dq)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq])
  useEffect(() => {
    setError('')
    const qs = new URLSearchParams({ page })
    if (status) qs.set('status', status)
    if (pay) qs.set('payment_status', pay)
    if (params.get('q')) qs.set('q', params.get('q'))
    adm(`orders/?${qs}`).then(setData).catch((e) => setError(errorText(e)))
  }, [status, pay, page, params])

  return (
    <>
      <PageHead title="Orders" />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <input className={inputCls} placeholder="Search order no., email, phone, TrxID…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search orders" />
        <select className={inputCls} value={status} onChange={(e) => set('status', e.target.value)} aria-label="Order status">
          <option value="">All order statuses</option>
          {opts.order_statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className={inputCls} value={pay} onChange={(e) => set('payment_status', e.target.value)} aria-label="Payment status">
          <option value="">All payment statuses</option>
          {opts.payment_statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <Msg error={error} />
      <div className="overflow-x-auto border border-[#1a1716]/15 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-[#1a1716]/15 text-xs uppercase tracking-wider text-neutral-500">
            <tr><th className="p-3">Order</th><th className="p-3">Date</th><th className="p-3">Customer</th><th className="p-3">Items</th><th className="p-3">Payment</th><th className="p-3">Status</th><th className="p-3 text-right">Total</th></tr>
          </thead>
          <tbody>
            {!data ? <tr><td className="p-4 text-neutral-500" colSpan={7}>Loading…</td></tr>
              : data.results.length === 0 ? <tr><td className="p-4 text-neutral-500" colSpan={7}>No orders match.</td></tr>
              : data.results.map((o) => (
                <tr key={o.id} className="border-b border-[#1a1716]/10 last:border-0 hover:bg-[#F7F4EF]">
                  <td className="p-3"><Link to={`/admin/orders/${o.id}`} className="underline underline-offset-2">{o.number}</Link></td>
                  <td className="p-3 text-neutral-600">{when(o.created_at)}</td>
                  <td className="p-3">{o.recipient_name}<div className="text-xs text-neutral-500">{o.phone}</div></td>
                  <td className="p-3">{o.item_count}</td>
                  <td className="p-3"><div className="text-xs text-neutral-500">{o.payment_method_label}</div><Badge value={o.payment_status} label={o.payment_status_label} /></td>
                  <td className="p-3"><Badge value={o.status} label={o.status_label} /></td>
                  <td className="p-3 text-right">{money(o.total)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Pager data={data} onPage={(p) => set('page', String(p))} />
    </>
  )
}