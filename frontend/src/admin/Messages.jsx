import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { adm, Badge, btnCls, btnGhost, inputCls, Msg, PageHead, Pager, useDebounced, when } from './ui.jsx'
import { errorText } from '../Api.jsx'

const TABS = [['new', 'New'], ['replied', 'Replied'], ['closed', 'Closed'], ['all', 'All']]
const TYPES = [['', 'Any topic'], ['order', 'My order'], ['delivery', 'Delivery'], ['return', 'Returns & exchange'], ['product', 'Product or sizing'], ['payment', 'Payment'], ['other', 'Something else']]

export default function Messages() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || 'new'
  const type = params.get('type') || ''
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
  useEffect(() => {
    if (dq !== (params.get('q') || '')) set('q', dq)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq])
  useEffect(() => {
    setError('')
    const qs = new URLSearchParams({ status, page })
    if (type) qs.set('type', type)
    if (params.get('q')) qs.set('q', params.get('q'))
    adm(`messages/?${qs}`).then(setData).catch((e) => setError(errorText(e)))
  }, [status, type, page, params])

  return (
    <>
      <PageHead title="Messages" />
      <p className="mb-4 max-w-2xl text-sm text-neutral-600">Messages customers send from the Contact page. Reply from your own email, then mark the message as replied.</p>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map(([v, l]) => (
          <button key={v} type="button" onClick={() => set('status', v === 'new' ? '' : v)} className={status === v ? btnCls : btnGhost} aria-pressed={status === v}>
            {l}{v !== 'all' && data?.counts ? ` (${data.counts[v]})` : ''}
          </button>
        ))}
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <input className={inputCls} placeholder="Search name, email, subject, order number, message…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search messages" />
        <select className={inputCls} value={type} onChange={(e) => set('type', e.target.value)} aria-label="Topic">
          {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <Msg error={error} />
      <div className="overflow-x-auto border border-[#1a1716]/15 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[#1a1716]/15 text-xs uppercase tracking-wider text-neutral-500">
            <tr><th className="p-3">Received</th><th className="p-3">From</th><th className="p-3">Topic</th><th className="p-3">Subject</th><th className="p-3">Status</th></tr>
          </thead>
          <tbody>
            {!data ? <tr><td className="p-4 text-neutral-500" colSpan={5}>Loading…</td></tr>
              : data.results.length === 0 ? <tr><td className="p-4 text-neutral-500" colSpan={5}>{status === 'new' ? 'No new messages.' : 'No messages here.'}</td></tr>
              : data.results.map((m) => (
                <tr key={m.id} className="border-b border-[#1a1716]/10 last:border-0 hover:bg-[#F7F4EF]">
                  <td className="whitespace-nowrap p-3 text-neutral-600">{when(m.created_at)}</td>
                  <td className="p-3">{m.name}<div className="text-xs text-neutral-500">{m.email}</div></td>
                  <td className="p-3">{m.inquiry_label}{m.order_number && <div className="text-xs text-neutral-500">{m.order_number}</div>}</td>
                  <td className="p-3"><Link to={`/admin/messages/${m.id}`} className={`underline underline-offset-2 ${m.status === 'new' ? 'font-medium' : ''}`}>{m.subject}</Link></td>
                  <td className="p-3"><Badge value={m.status} label={m.status_label} /></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Pager data={data} onPage={(p) => set('page', String(p))} />
    </>
  )
}