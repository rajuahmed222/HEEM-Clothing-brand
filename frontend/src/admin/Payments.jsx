import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adm, Badge, btnCls, btnGhost, cardCls, inputCls, Msg, money, PageHead, Pager, useConfirm, useDebounced, when } from './ui.jsx'
import { errorText } from '../Api.jsx'

const TABS = [['submitted', 'To verify'], ['verified', 'Verified'], ['rejected', 'Rejected'], ['all', 'All']]

export default function Payments() {
  const [tab, setTab] = useState('submitted')
  const [q, setQ] = useState('')
  const dq = useDebounced(q)
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const load = useCallback(() => {
    adm(`payments/?status=${tab}&page=${page}&q=${encodeURIComponent(dq)}`).then(setData).catch((e) => setError(errorText(e)))
  }, [tab, page, dq])
  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [tab, dq])

  return (
    <>
      <PageHead title="Payments" />
      <p className="mb-4 max-w-2xl text-sm text-neutral-600">A customer's entry is never proof of payment. Check the TrxID and amount in your real bKash, Nagad or Rocket account first, then verify. A reviewed payment is final.</p>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map(([v, l]) => <button key={v} type="button" onClick={() => setTab(v)} className={tab === v ? btnCls : btnGhost}>{l}</button>)}
        <input className={`${inputCls} ml-auto max-w-xs`} placeholder="TrxID, number or order…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search payments" />
      </div>
      <Msg error={error} ok={ok} />
      {!data ? <p className="text-neutral-600">Loading…</p> : data.results.length === 0 ? <p className="text-neutral-600">Nothing here.</p> : (
        <div className="space-y-4">
          {data.results.map((p) => <PaymentCard key={p.id} p={p} onDone={(msg) => { setOk(msg); setError(''); load() }} onError={(m) => { setError(m); setOk('') }} />)}
        </div>
      )}
      <Pager data={data} onPage={setPage} />
    </>
  )
}

function PaymentCard({ p, onDone, onError }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [ask, confirmBox] = useConfirm()
  const review = async (action) => {
    if (action === 'verify' && !(await ask({ title: 'Verify this payment?', message: `${p.provider_label} ${p.trx_id} for ${money(p.amount_sent)}. Confirm you have checked it in the real account.`, confirmLabel: 'Yes, verify' }))) return
    setBusy(true)
    try { await adm(`payments/${p.id}/review/`, { method: 'POST', body: { action, note } }); onDone(action === 'verify' ? 'Payment verified.' : 'Payment rejected.') }
    catch (e) { onError(errorText(e)) } finally { setBusy(false) }
  }
  const pending = p.status === 'submitted'
  return (
    <article className={cardCls}>
      {confirmBox}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg">{p.provider_label} · <span className="font-mono">{p.trx_id}</span></p>
          <p className="text-sm text-neutral-600">From {p.sender_number} · {when(p.created_at)}</p>
          <p className="mt-1 text-sm">Order <Link to={`/admin/orders/${p.order_id}`} className="underline">{p.order_number}</Link> ({p.customer}){p.order_status === 'cancelled' && <b className="text-red-700"> · order is cancelled</b>}</p>
        </div>
        <Badge value={p.status} label={p.status} />
      </div>
      <p className={`mt-3 text-sm ${p.amount_matches ? '' : 'font-medium text-red-700'}`}>
        Amount sent {money(p.amount_sent)} · order total {money(p.expected_amount)} {p.amount_matches ? '(matches)' : '(DIFFERENT)'}
      </p>
      {p.note && <p className="mt-1 text-sm text-neutral-600">Customer note: {p.note}</p>}
      {pending ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input className={`${inputCls} max-w-sm`} placeholder={p.amount_matches ? 'Note (required to reject)' : 'Note (required: amount differs)'} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
          <button type="button" className={btnCls} disabled={busy} onClick={() => review('verify')}>Verify</button>
          <button type="button" className={btnGhost} disabled={busy} onClick={() => review('reject')}>Reject</button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-neutral-600">Reviewed {when(p.reviewed_at)} by {p.reviewed_by || 'staff'}{p.review_note ? ` · "${p.review_note}"` : ''}</p>
      )}
    </article>
  )
}