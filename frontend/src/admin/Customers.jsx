import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adm, Badge, inputCls, money, Msg, PageHead, Pager, useDebounced, when } from './ui.jsx'
import { errorText } from '../Api.jsx'

const TABS = [['registered', 'Customers'], ['unverified', 'Unverified'], ['guest', 'Guests']]

// Registered customers (with verification state and login methods), accounts that never verified their email, and guest buyers.
export default function Customers() {
  const [params, setParams] = useSearchParams()
  const type = params.get('type') || 'registered'
  const page = params.get('page') || '1'
  const [q, setQ] = useState(params.get('q') || '')
  const dq = useDebounced(q)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const set = (k, v) => {
    const next = new URLSearchParams(params)
    v ? next.set(k, v) : next.delete(k)
    if (k !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }
  useEffect(() => { if (dq !== (params.get('q') || '')) set('q', dq) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [dq])
  useEffect(() => {
    setError(''); setData(null)
    const qs = new URLSearchParams({ type, page })
    if (params.get('q')) qs.set('q', params.get('q'))
    adm(`customers/?${qs}`).then((d) => setData({ ...d, forType: type })).catch((e) => setError(errorText(e)))
  }, [type, page, params])

  const guest = type === 'guest'
  // never draw rows from the previous tab under the new tab's columns
  const rows = data && data.forType === type ? data : null
  return (
    <>
      <PageHead title="Customers" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map(([v, label]) => (
          <button key={v} type="button" onClick={() => set('type', v === 'registered' ? '' : v)} aria-pressed={type === v}
            className={`border px-4 py-2 text-sm ${type === v ? 'border-[#1a1716] bg-[#1a1716] text-[#F7F4EF]' : 'border-[#1a1716]/30'}`}>{label}</button>
        ))}
        <input className={`${inputCls} sm:ml-auto sm:max-w-xs`} placeholder="Search email or name…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search customers" />
      </div>
      <Msg error={error} />
      <div className="overflow-x-auto border border-[#1a1716]/15 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-[#1a1716]/15 text-xs uppercase tracking-wider text-neutral-500">
            <tr><th className="p-3">Customer</th><th className="p-3">Phone</th>{!guest && <th className="p-3">Email</th>}{!guest && <th className="p-3">Login</th>}<th className="p-3">Orders</th><th className="p-3 text-right">Spent</th><th className="p-3">Last order</th></tr>
          </thead>
          <tbody>
            {!rows ? <tr><td className="p-4 text-neutral-500" colSpan={7}>Loading…</td></tr>
              : rows.results.length === 0 ? <tr><td className="p-4 text-neutral-500" colSpan={7}>Nobody here yet.</td></tr>
              : rows.results.map((c) => (
                <tr key={c.key} className="border-b border-[#1a1716]/10 last:border-0">
                  <td className="p-3">{c.name || '·'}<div className="text-xs text-neutral-500">{c.email}</div>{!guest && !c.active && <span className="text-xs text-red-800">disabled</span>}</td>
                  <td className="p-3">{c.phone || '·'}</td>
                  {!guest && <td className="p-3"><Badge value={c.verified ? 'verified' : 'pending'} label={c.verified ? 'Verified' : 'Not verified'} /></td>}
                  {!guest && <td className="p-3 capitalize">{(c.logins || []).join(', ')}</td>}
                  <td className="p-3">{c.orders}</td>
                  <td className="p-3 text-right">{money(c.spent)}</td>
                  <td className="p-3 text-neutral-600">{when(c.last_order) || '·'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Pager data={rows} onPage={(p) => set('page', String(p))} />
    </>
  )
}