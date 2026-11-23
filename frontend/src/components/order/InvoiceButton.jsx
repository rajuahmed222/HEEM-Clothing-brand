import { useState } from 'react'
import { errorText } from '../../Api.jsx'

// "Download invoice". `load` is an async function that returns { url } (a short-lived signed PDF link from the API).
// Usage (account order page):  <InvoiceButton load={() => request(`orders/${order.number}/invoice-link/`)} />
export default function InvoiceButton({ load, className = '' }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const go = async () => {
    setBusy(true); setErr('')
    try {
      const { url } = await load()
      window.location.assign(url) // the response is an attachment, so the page stays and the PDF downloads
    } catch (e) { setErr(errorText(e) || 'We could not prepare your invoice. Please try again.') }
    setBusy(false)
  }
  return (
    <div className={className}>
      <button type="button" onClick={go} disabled={busy} className="border-b border-current pb-1 text-xs uppercase tracking-[0.2em] hover:text-[#B08D57] disabled:opacity-50">{busy ? 'Preparing…' : 'Download invoice'}</button>
      {err && <p className="mt-2 text-sm text-[#8a6d3b]" role="alert">{err}</p>}
    </div>
  )
}