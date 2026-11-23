import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adm, Badge, cardCls, Msg, money, PageHead, when } from './ui.jsx'
import { errorText } from '../Api.jsx'

export default function Dashboard() {
  const [d, setD] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { adm('dashboard/').then(setD).catch((e) => setError(errorText(e))) }, [])
  if (error) return <Msg error={error} />
  if (!d) return <p className="text-neutral-600">Loading…</p>

  const Card = ({ c }) => {
    const body = (<><b className="block text-3xl font-normal">{c.value}</b><span className="text-xs text-neutral-600">{c.label}</span></>)
    const cls = `${cardCls} block ${c.value && c.to ? 'border-l-4 border-l-[#B08D57]' : ''}`
    return c.to ? <Link to={c.to} className={cls}>{body}</Link> : <div className={cls}>{body}</div>
  }

  return (
    <>
      <PageHead title="Overview" />
      <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-neutral-500">Needs your attention</h2>
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">{d.attention.map((c) => <Card key={c.key} c={c} />)}</div>

      <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-neutral-500">Sales (paid orders)</h2>
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className={cardCls}><b className="block text-2xl font-normal">{money(d.sales.today.amount)}</b><span className="text-xs text-neutral-600">Paid today · {d.sales.today.orders} orders</span></div>
        <div className={cardCls}><b className="block text-2xl font-normal">{money(d.sales.last_30_days.amount)}</b><span className="text-xs text-neutral-600">Last 30 days · {d.sales.last_30_days.orders} orders</span></div>
        <div className={cardCls}><b className="block text-2xl font-normal">{d.sales.orders_today}</b><span className="text-xs text-neutral-600">Orders placed today</span></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={cardCls}>
          <h2 className="mb-3 font-display text-xl">Recent orders</h2>
          {d.recent_orders.length === 0 ? <p className="text-sm text-neutral-600">No orders yet.</p> : (
            <ul className="divide-y divide-[#1a1716]/10 text-sm">
              {d.recent_orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2">
                  <Link to={`/admin/orders/${o.id}`} className="underline underline-offset-2">{o.number}</Link>
                  <span className="hidden text-neutral-500 sm:inline">{when(o.created_at)}</span>
                  <Badge value={o.status} label={o.status_label} />
                  <span>{money(o.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={cardCls}>
          <h2 className="mb-3 font-display text-xl">Low or sold-out stock</h2>
          {d.low_stock.length === 0 ? <p className="text-sm text-neutral-600">Nothing is running low.</p> : (
            <ul className="divide-y divide-[#1a1716]/10 text-sm">
              {d.low_stock.map((v, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2">
                  <Link to={`/admin/products/${v.product_id}`} className="underline underline-offset-2">{v.product}</Link>
                  <span className="text-neutral-500">{[v.color, v.size].filter(Boolean).join(' / ') || 'One size'}</span>
                  <span className={v.stock === 0 ? 'text-red-700' : ''}>{v.stock === 0 ? 'Sold out' : `${v.stock} left`}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${cardCls} lg:col-span-2`}>
          <h2 className="mb-3 font-display text-xl">Orders by status</h2>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {d.by_status.length === 0 ? <span className="text-neutral-600">No orders yet.</span> : d.by_status.map((s) => (
              <Link key={s.status} to={`/admin/orders?status=${s.status}`} className="hover:underline">{s.label}: <b>{s.count}</b></Link>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}