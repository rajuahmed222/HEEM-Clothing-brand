import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { adm, Badge, btnGhost, inputCls, Msg, PageHead, Pager, useDebounced, when } from './ui.jsx'
import { errorText } from '../Api.jsx'

// Every email HEEM tried to send, with the outcome. Failed ones can be sent again (not OTP / reset-link emails).
export default function Emails() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const dq = useDebounced(q)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const status = params.get('status') || ''
  const kind = params.get('kind') || ''
  const page = params.get('page') || '1'

  const set = (k, v) => {
    const next = new URLSearchParams(params)
    v ? next.set(k, v) : next.delete(k)
    if (k !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }
  useEffect(() => { if (dq !== (params.get('q') || '')) set('q', dq) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [dq])
  const load = () => {
    setError('')
    const qs = new URLSearchParams({ page })
    if (status) qs.set('status', status)
    if (kind) qs.set('kind', kind)
    if (params.get('q')) qs.set('q', params.get('q'))
    adm(`emails/?${qs}`).then(setData).catch((e) => setError(errorText(e)))
  }
  useEffect(load, [status, kind, page, params]) // eslint-disable-line react-hooks/exhaustive-deps

  const retry = async (id) => {
    setNote(''); setError('')
    try {
      const row = await adm(`emails/${id}/retry/`, { method: 'POST' })
      setNote(row.status === 'sent' ? 'Email sent.' : row.error || 'Still failing.')
      load()
    } catch (e) { setError(errorText(e)) }
  }

  return (
    <>
      <PageHead title="Emails" />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <input className={inputCls} placeholder="Search email, order no., subject…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search emails" />
        <select className={inputCls} value={status} onChange={(e) => set('status', e.target.value)} aria-label="Status">
          <option value="">All statuses</option><option value="sent">Sent</option><option value="failed">Failed</option><option value="queued">Queued</option>
        </select>
        <select className={inputCls} value={kind} onChange={(e) => set('kind', e.target.value)} aria-label="Type">
          <option value="">All types</option>
          {(data?.kinds || []).map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>
      <Msg error={error} ok={note} />
      <div className="overflow-x-auto border border-[#1a1716]/15 bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-[#1a1716]/15 text-xs uppercase tracking-wider text-neutral-500">
            <tr><th className="p-3">When</th><th className="p-3">Type</th><th className="p-3">To</th><th className="p-3">Order</th><th className="p-3">Status</th><th className="p-3" /></tr>
          </thead>
          <tbody>
            {!data ? <tr><td className="p-4 text-neutral-500" colSpan={6}>Loading…</td></tr>
              : data.results.length === 0 ? <tr><td className="p-4 text-neutral-500" colSpan={6}>No emails.</td></tr>
              : data.results.map((l) => (
                <tr key={l.id} className="border-b border-[#1a1716]/10 align-top last:border-0">
                  <td className="p-3 text-neutral-600">{when(l.created_at)}</td>
                  <td className="p-3">{l.kind}<div className="max-w-[16rem] truncate text-xs text-neutral-500" title={l.subject}>{l.subject}</div></td>
                  <td className="p-3">{l.to_email}</td>
                  <td className="p-3">{l.reference || '·'}</td>
                  <td className="p-3"><Badge value={l.status === 'sent' ? 'paid' : l.status === 'failed' ? 'failed' : 'pending'} label={l.status} />
                    {l.error && <div className="mt-1 max-w-[18rem] break-words text-xs text-red-800">{l.error}</div>}</td>
                  <td className="p-3 text-right">{l.status !== 'sent' && l.retryable && <button type="button" className={btnGhost} onClick={() => retry(l.id)}>Retry</button>}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Pager data={data} onPage={(p) => set('page', String(p))} />
      <p className="mt-4 text-xs text-neutral-500">Verification codes and password-reset emails cannot be re-sent; the customer asks for a new one. <Link to="/admin/orders" className="underline">Orders</Link></p>
    </>
  )
}