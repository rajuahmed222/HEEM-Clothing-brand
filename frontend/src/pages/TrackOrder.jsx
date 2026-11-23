import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { errorText, request } from '../Api.jsx'
import OrderStatusView from '../components/order/OrderStatusView.jsx'

const field = 'w-full border border-[#1a1716]/25 bg-transparent px-4 py-3.5 text-[0.95rem] outline-none transition-colors focus:border-[#1a1716]'

// Track an order without an account: order number + the email used at checkout.
export default function TrackOrder() {
  const [number, setNumber] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [order, setOrder] = useState(null)

  useEffect(() => { document.title = 'Track your order - HEEM' }, [])

  const cancelOrder = async (reason) => {
    setOrder(await request('orders/guest/cancel/', { method: 'POST', auth: false, body: { number: number.trim(), email: email.trim(), reason } }))
  }

  const invoiceLink = () => request('orders/guest/invoice-link/', { method: 'POST', auth: false, body: { number: number.trim(), email: email.trim() } })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!number.trim()) return setError('Enter your order number.')
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter the email address you used for the order.')
    setBusy(true)
    try {
      setOrder(await request('orders/track/', { method: 'POST', auth: false, body: { number: number.trim(), email: email.trim() } }))
    } catch (err) {
      setOrder(null)
      setError(err.status === 404 ? 'We could not find an order with those details. Check the order number and email, then try again.' : errorText(err))
    } finally { setBusy(false) }
  }

  return (
    <section className="px-[2.5vw] pb-24">
      <header className="pb-8 pt-12 md:pt-16">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Order tracking</p>
        <h1 className="mt-4 font-display text-5xl uppercase leading-none md:text-6xl">Track your order</h1>
        <p className="mt-4 max-w-xl text-neutral-600">No account needed. Enter the order number from your confirmation email and the email address you used.</p>
      </header>

      <form onSubmit={submit} noValidate className="grid max-w-3xl gap-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div>
          <label htmlFor="trk-number" className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-500">Order number</label>
          <input id="trk-number" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="HEEM-20260101-AB12" autoCapitalize="characters" autoComplete="off" className={field} />
        </div>
        <div>
          <label htmlFor="trk-email" className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-500">Email address</label>
          <input id="trk-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={field} />
        </div>
        <button type="submit" disabled={busy} className="bg-[#1a1716] px-8 py-4 text-sm uppercase tracking-[0.2em] text-[#F7F4EF] transition-colors hover:bg-[#B08D57] disabled:opacity-50">{busy ? 'Checking…' : 'Track'}</button>
      </form>
      {error && <p className="mt-5 max-w-3xl text-sm text-[#8a6d3b]" role="alert">{error}</p>}
      <p className="mt-6 text-sm text-neutral-500">Have an account? <Link to="/account/orders" className="underline underline-offset-4 hover:text-[#B08D57]">See all your orders</Link>.</p>

      {order && <div className="mt-14 border-t border-[#1a1716]/15 pt-12"><OrderStatusView order={order} onCancel={cancelOrder} onInvoice={invoiceLink} /></div>}
    </section>
  )
}