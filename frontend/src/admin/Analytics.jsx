import { useEffect, useRef, useState } from 'react'
import { adm, btnCls, btnGhost, cardCls, Msg, money, PageHead } from './ui.jsx'
import { errorText } from '../Api.jsx'

const PERIODS = [['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly'], ['yearly', 'Yearly']]
const COMPARE = { daily: 'the 30 days before', weekly: 'the 12 weeks before', monthly: 'the 12 months before', yearly: 'the 5 years before' }
const BAR = '#B08D57' // one series, one colour: the HEEM gold
const INK = '#1a1716'

const compact = (n) => {
  n = Number(n) || 0
  if (n >= 10000000) return `৳${+(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000) return `৳${+(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `৳${+(n / 1000).toFixed(1)}k`
  return `৳${Math.round(n)}`
}
// "nice" upper bound and step for the y axis
function niceScale(max) {
  if (max <= 0) return { top: 1, step: 1 }
  const raw = max / 4
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw)
  return { top: Math.ceil(max / step) * step, step }
}

function BarChart({ series, period }) {
  const wrap = useRef(null)
  const [w, setW] = useState(640)
  const [hover, setHover] = useState(null)
  useEffect(() => {
    const el = wrap.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.floor(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const H = 260, L = 48, R = 8, T = 12, B = 28
  const iw = w - L - R, ih = H - T - B
  const { top, step } = niceScale(Math.max(...series.map((s) => Number(s.revenue))))
  const ticks = []
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v)
  const slot = iw / series.length
  const bw = Math.min(28, Math.max(3, slot * 0.6)) // thin bars
  const y = (v) => T + ih - (Number(v) / top) * ih
  const every = Math.ceil(series.length / Math.max(2, Math.floor(iw / 64))) // thin the x labels so they never collide
  const h = hover !== null ? series[hover] : null

  return (
    <div ref={wrap} className="relative">
      <svg width={w} height={H} role="img" aria-label="Sales by period, bar chart. A table with the same numbers is below.">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={w - R} y1={y(v)} y2={y(v)} stroke={INK} strokeOpacity={v === 0 ? 0.35 : 0.1} />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#6b6560">{compact(v)}</text>
          </g>
        ))}
        {series.map((s, i) => {
          const x = L + slot * i + (slot - bw) / 2
          const bh = Math.max(0, T + ih - y(s.revenue))
          const r = Math.min(4, bw / 2, bh)
          return (
            <g key={s.key}>
              {bh > 0 && (
                // rounded at the top (data end), flat on the baseline
                <path d={`M${x},${T + ih} V${y(s.revenue) + r} Q${x},${y(s.revenue)} ${x + r},${y(s.revenue)} H${x + bw - r} Q${x + bw},${y(s.revenue)} ${x + bw},${y(s.revenue) + r} V${T + ih} Z`}
                  fill={BAR} opacity={hover === null || hover === i ? 1 : 0.55} />
              )}
              {i % every === 0 && <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#6b6560">{s.label}</text>}
              {/* full-height hit target, larger than the bar */}
              <rect x={L + slot * i} y={T} width={slot} height={ih} fill="transparent" tabIndex={0}
                aria-label={`${s.label}: ${money(s.revenue)}, ${s.orders} orders`}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} />
            </g>
          )
        })}
      </svg>
      {h && (
        <div className="pointer-events-none absolute z-10 border border-[#1a1716]/20 bg-white px-3 py-2 text-xs shadow"
          style={{ left: Math.min(Math.max(L + slot * hover + slot / 2, 70), w - 70), top: 4, transform: 'translateX(-50%)' }}>
          <p className="font-medium">{period === 'weekly' ? `Week of ${h.label}` : h.label}</p>
          <p>{money(h.revenue)}</p>
          <p className="text-neutral-500">{h.orders} order{h.orders === 1 ? '' : 's'}</p>
        </div>
      )}
    </div>
  )
}

function Change({ value, vs }) {
  if (value === null || value === undefined) return <span className="text-xs text-neutral-500">No earlier sales to compare</span>
  const up = value > 0, flat = value === 0
  return <span className="text-xs text-neutral-600">{flat ? '■' : up ? '▲' : '▼'} {Math.abs(value)}% vs {vs}</span>
}

export default function Analytics() {
  const [period, setPeriod] = useState('daily')
  const [d, setD] = useState(null)
  const [error, setError] = useState('')
  const [table, setTable] = useState(false)

  useEffect(() => {
    setD(null); setError('')
    adm(`analytics/?period=${period}`).then(setD).catch((e) => setError(errorText(e)))
  }, [period])

  const t = d?.totals
  const methodsTotal = d ? d.payment_methods.reduce((a, m) => a + Number(m.revenue), 0) : 0

  return (
    <>
      <PageHead title="Sales analytics">
        {PERIODS.map(([v, l]) => <button key={v} type="button" onClick={() => setPeriod(v)} className={period === v ? btnCls : btnGhost} aria-pressed={period === v}>{l}</button>)}
      </PageHead>
      <Msg error={error} />
      {!d ? (!error && <p className="text-neutral-600">Loading…</p>) : (
        <>
          <p className="mb-4 max-w-2xl text-sm text-neutral-600">
            {d.heading}. Sales are orders that were not cancelled or returned, counted on the day they were placed. Revenue is the order total including delivery.
          </p>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className={cardCls}><b className="block text-2xl font-normal">{money(t.revenue)}</b><span className="block text-xs text-neutral-600">Revenue</span><Change value={d.change.revenue} vs={COMPARE[period]} /></div>
            <div className={cardCls}><b className="block text-2xl font-normal">{t.orders}</b><span className="block text-xs text-neutral-600">Orders</span><Change value={d.change.orders} vs={COMPARE[period]} /></div>
            <div className={cardCls}><b className="block text-2xl font-normal">{t.units}</b><span className="block text-xs text-neutral-600">Items sold</span></div>
            <div className={cardCls}><b className="block text-2xl font-normal">{money(t.average_order)}</b><span className="block text-xs text-neutral-600">Average order</span></div>
            <div className={cardCls}><b className="block text-2xl font-normal">{money(t.collected)}</b><span className="block text-xs text-neutral-600">Already paid (collected)</span></div>
            <div className={cardCls}><b className="block text-2xl font-normal">{money(Number(t.revenue) - Number(t.collected))}</b><span className="block text-xs text-neutral-600">Still to collect</span></div>
            <div className={cardCls}><b className="block text-2xl font-normal">{t.cancelled_orders}</b><span className="block text-xs text-neutral-600">Cancelled or returned · {money(t.cancelled_amount)}</span></div>
            <div className={cardCls}><b className="block text-2xl font-normal">{d.best ? d.best.label : '—'}</b><span className="block text-xs text-neutral-600">Best {period === 'daily' ? 'day' : period === 'weekly' ? 'week' : period === 'monthly' ? 'month' : 'year'}{d.best ? ` · ${money(d.best.revenue)}` : ''}</span></div>
          </div>

          <section className={`${cardCls} mb-6`}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl">Revenue</h2>
              <button type="button" className="text-xs underline" onClick={() => setTable((x) => !x)}>{table ? 'Show chart' : 'Show as table'}</button>
            </div>
            {t.orders === 0 && <p className="mb-3 text-sm text-neutral-600">No sales in this period yet.</p>}
            {!table ? <BarChart series={d.series} period={period} /> : (
              <div className="max-h-80 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wider text-neutral-500"><tr><th className="py-2">{period === 'weekly' ? 'Week of' : 'Period'}</th><th className="py-2">Orders</th><th className="py-2 text-right">Revenue</th></tr></thead>
                  <tbody>{d.series.map((s) => <tr key={s.key} className="border-t border-[#1a1716]/10"><td className="py-1.5">{s.label}</td><td>{s.orders}</td><td className="text-right">{money(s.revenue)}</td></tr>)}</tbody>
                </table>
              </div>
            )}
            {!table && <p className="mt-2 text-xs text-neutral-500">Hover or focus a bar for the exact figures.</p>}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className={cardCls}>
              <h2 className="mb-3 font-display text-xl">Top products</h2>
              {d.top_products.length === 0 ? <p className="text-sm text-neutral-600">No sales in this period yet.</p> : (
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wider text-neutral-500"><tr><th className="py-2">Product</th><th className="py-2">Sold</th><th className="py-2 text-right">Revenue</th></tr></thead>
                  <tbody>{d.top_products.map((p) => <tr key={p.name} className="border-t border-[#1a1716]/10"><td className="py-1.5 pr-2">{p.name}</td><td>{p.units}</td><td className="text-right">{money(p.revenue)}</td></tr>)}</tbody>
                </table>
              )}
            </section>
            <section className={cardCls}>
              <h2 className="mb-3 font-display text-xl">Payment methods</h2>
              {d.payment_methods.length === 0 ? <p className="text-sm text-neutral-600">No sales in this period yet.</p> : (
                <ul className="space-y-3 text-sm">
                  {d.payment_methods.map((m) => {
                    const share = methodsTotal ? Math.round((Number(m.revenue) / methodsTotal) * 100) : 0
                    return (
                      <li key={m.method}>
                        <div className="flex justify-between"><span>{m.label}</span><span>{money(m.revenue)} · {m.orders} order{m.orders === 1 ? '' : 's'} · {share}%</span></div>
                        <div className="mt-1 h-1.5 bg-[#1a1716]/10"><div className="h-full" style={{ width: `${share}%`, background: BAR }} /></div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </>
  )
}