import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { adm, Badge, btnCls, btnGhost, cardCls, Msg, PageHead, when } from './ui.jsx'
import { errorText } from '../Api.jsx'

export default function MessageView() {
  const { id } = useParams()
  const [m, setM] = useState(null)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { adm(`messages/${id}/`).then(setM).catch((e) => setError(errorText(e))) }, [id])

  const setStatus = async (status, done) => {
    setBusy(true); setError(''); setOk('')
    try { setM(await adm(`messages/${id}/`, { method: 'PATCH', body: { status } })); setOk(done) }
    catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }

  if (!m) return error ? <Msg error={error} /> : <p className="text-neutral-600">Loading…</p>

  const reply = `mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}&body=${encodeURIComponent(`Dear ${m.name},\n\n\n\nBest regards,\nHEEM`)}`
  return (
    <>
      <PageHead title="Message"><Link to="/admin/messages" className={btnGhost}>← All messages</Link></PageHead>
      <Msg error={error} ok={ok} />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className={`${cardCls} lg:col-span-2`}>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Badge value={m.status} label={m.status_label} />
            <span className="text-sm text-neutral-500">{when(m.created_at)}</span>
          </div>
          <h2 className="font-display text-2xl">{m.subject}</h2>
          <p className="mt-4 whitespace-pre-wrap break-words text-[0.95rem] leading-relaxed">{m.message}</p>
        </section>

        <div className="space-y-6">
          <section className={cardCls}>
            <h2 className="mb-3 font-display text-xl">Customer</h2>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-neutral-500">Name</dt><dd>{m.name}</dd></div>
              <div><dt className="text-neutral-500">Email</dt><dd className="break-all"><a className="underline underline-offset-2" href={`mailto:${m.email}`}>{m.email}</a></dd></div>
              <div><dt className="text-neutral-500">Topic</dt><dd>{m.inquiry_label}</dd></div>
              {m.order_number && (
                <div><dt className="text-neutral-500">Order number (typed by the customer)</dt>
                  <dd>{m.order_id ? <Link className="underline underline-offset-2" to={`/admin/orders/${m.order_id}`}>{m.order_number}</Link> : <>{m.order_number} <span className="text-neutral-500">(no order with this number)</span></>}</dd></div>
              )}
            </dl>
          </section>

          <section className={`${cardCls} space-y-3`}>
            <h2 className="font-display text-xl">Reply</h2>
            <a href={reply} className={`${btnCls} block text-center`}>Reply by email</a>
            <p className="text-xs text-neutral-500">Opens your email app with the customer's address filled in. Come back and mark it as replied.</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {m.status !== 'replied' && <button type="button" className={btnGhost} disabled={busy} onClick={() => setStatus('replied', 'Marked as replied.')}>Mark as replied</button>}
              {m.status !== 'closed' && <button type="button" className={btnGhost} disabled={busy} onClick={() => setStatus('closed', 'Message closed.')}>Close</button>}
              {m.status !== 'new' && <button type="button" className={btnGhost} disabled={busy} onClick={() => setStatus('new', 'Marked as new again.')}>Mark as new</button>}
            </div>
          </section>
        </div>
      </div>
    </>
  )
}