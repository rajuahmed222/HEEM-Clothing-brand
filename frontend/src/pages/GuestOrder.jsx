import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { request } from '../Api.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import OrderStatusView from '../components/order/OrderStatusView.jsx'

// /track/:token : the private link from the confirmation email. Also the page a guest lands on right after ordering (?placed=1).
export default function GuestOrder() {
  const { token } = useParams()
  const [params] = useSearchParams()
  const placed = params.get('placed') === '1'
  const { user } = useAuth()
  const [order, setOrder] = useState(null)
  const [state, setState] = useState('loading') // loading | ok | missing | error
  const [copied, setCopied] = useState(false)

  useEffect(() => { document.title = placed ? 'Thank you - HEEM' : 'Your order - HEEM' }, [placed])
  useEffect(() => {
    let live = true
    request(`orders/guest/${encodeURIComponent(token)}/`, { auth: false })
      .then((o) => { if (live) { setOrder(o); setState('ok') } })
      .catch((e) => { if (live) setState(e.status === 404 ? 'missing' : 'error') })
    return () => { live = false }
  }, [token])

  const cancelOrder = async (reason) => {
    const o = await request('orders/guest/cancel/', { method: 'POST', auth: false, body: { token, reason } })
    setOrder(o)
  }

  const invoiceLink = () => request('orders/guest/invoice-link/', { method: 'POST', auth: false, body: { token } })

  const copy = async () => {
    const url = `${window.location.origin}/track/${token}`
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { window.prompt('Copy your tracking link', url) }
  }

  if (state === 'loading') return <section className="px-[2.5vw] py-24" aria-busy="true"><div className="h-10 w-56 animate-pulse bg-[#1a1716]/[0.06]" /><div className="mt-10 h-64 animate-pulse bg-[#1a1716]/[0.06]" /></section>
  if (state !== 'ok') {
    return (
      <section className="px-[2.5vw] py-32 text-center">
        <h1 className="font-display text-3xl md:text-4xl">{state === 'missing' ? 'We could not find this order' : 'We could not load this order'}</h1>
        <p className="mx-auto mt-4 max-w-md text-neutral-600">{state === 'missing' ? 'This link may be incomplete. You can look up your order with its number and email instead.' : 'Check your connection and try again.'}</p>
        <Link to="/track" className="mt-8 inline-block border-b border-current pb-1 text-sm uppercase tracking-[0.18em] hover:text-[#B08D57]">Track with order number</Link>
      </section>
    )
  }

  return (
    <section className="px-[2.5vw] pb-24">
      <header className="pb-10 pt-12 md:pt-16">
        {placed ? (
          <>
            <p className="text-xs uppercase tracking-[0.3em] text-[#B08D57]">Order received</p>
            <h1 className="mt-4 font-display text-5xl uppercase leading-none md:text-6xl">Thank you</h1>
            <p className="mt-4 max-w-xl text-neutral-600">Your order <strong className="text-[#1a1716]">{order.number}</strong> is in. We are sending a confirmation to your email with a private link to follow it.</p>
          </>
        ) : (
          <>
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Order tracking</p>
            <h1 className="mt-4 font-display text-5xl uppercase leading-none md:text-6xl">Your order</h1>
          </>
        )}
        <button type="button" onClick={copy} className="mt-6 border-b border-current pb-1 text-xs uppercase tracking-[0.2em] hover:text-[#B08D57]">{copied ? 'Link copied' : 'Copy your tracking link'}</button>
      </header>

      <OrderStatusView order={order} onCancel={cancelOrder} onInvoice={invoiceLink} />

      {!user && (
        <aside className="mt-16 border border-[#1a1716]/15 p-8 text-center md:p-12">
          <h2 className="font-display text-2xl md:text-3xl">Create an HEEM account</h2>
          <p className="mx-auto mt-3 max-w-xl text-neutral-600">Create an HEEM Account to manage your orders, save your addresses, and enjoy a personalized shopping experience. Use the same email as this order and it will appear in your account.</p>
          <Link to="/signup" className="mt-8 inline-block bg-[#1a1716] px-10 py-4 text-sm uppercase tracking-[0.2em] text-[#F7F4EF] transition-colors hover:bg-[#B08D57]">Create account</Link>
          <p className="mt-4 text-xs text-neutral-500">Optional. You never need an account to order from HEEM.</p>
        </aside>
      )}
    </section>
  )
}