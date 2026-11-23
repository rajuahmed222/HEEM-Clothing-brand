import { useEffect, useState } from 'react'
import { adm, Badge, btnGhost, cardCls, Msg, when } from './ui.jsx'
import { errorText } from '../Api.jsx'

// Panel for the admin order page: who the customer is (guest or account), emails sent about this order, and the invoice.
// Usage in OrderView.jsx:  <OrderNotifications id={order.id} />
export default function OrderNotifications({ id }) {
  const [info, setInfo] = useState(null)
  const [error, setError] = useState('')
  const load = () => adm(`orders/${id}/notifications/`).then(setInfo).catch((e) => setError(errorText(e)))
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id])

  const retry = async (logId) => {
    setError('')
    try { await adm(`emails/${logId}/retry/`, { method: 'POST' }); await load() } catch (e) { setError(errorText(e)) }
  }
  const invoice = async () => {
    setError('')
    try { const { url } = await adm(`orders/${id}/invoice-link/`); window.location.assign(url); setTimeout(load, 1500) } catch (e) { setError(errorText(e)) }
  }
  if (!info) return error ? <Msg error={error} /> : null
  return (
    <section className={cardCls} aria-label="Notifications">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl">Emails and invoice</h2>
        {info.can_invoice
          ? <button type="button" className={btnGhost} onClick={invoice}>{info.invoice ? `Download ${info.invoice.number}` : 'Create and download invoice'}</button>
          : <span className="text-xs text-neutral-500">Invoice is available once the order is confirmed.</span>}
      </div>
      <p className="mt-2 text-sm text-neutral-600">{info.is_guest ? 'Guest order' : 'Account order'} · {info.customer_email || 'no email'}</p>
      <Msg error={error} />
      {info.emails.length === 0 ? <p className="mt-4 text-sm text-neutral-500">No emails sent for this order yet.</p> : (
        <ul className="mt-4 divide-y divide-[#1a1716]/10 text-sm">
          {info.emails.map((l) => (
            <li key={l.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="min-w-0"><p>{l.subject || l.kind}</p><p className="text-xs text-neutral-500">{when(l.created_at)} · {l.to_email}</p>
                {l.error && <p className="mt-1 break-words text-xs text-red-800">{l.error}</p>}</div>
              <div className="flex items-center gap-2"><Badge value={l.status === 'sent' ? 'paid' : l.status === 'failed' ? 'failed' : 'pending'} label={l.status} />
                {l.status !== 'sent' && l.retryable && <button type="button" className={btnGhost} onClick={() => retry(l.id)}>Retry</button>}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}