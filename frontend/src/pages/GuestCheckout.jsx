import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { request, formatPrice } from '../Api.jsx'
import { useShop } from '../context/ShopContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import AddressForm, { BD_MOBILE, EMPTY_ADDRESS, Field, clean, toPayload, validateAddress } from '../components/checkout/AddressForm.jsx'
import PaymentPanel from '../components/checkout/PaymentPanel.jsx'
import OrderSummary from '../components/checkout/OrderSummary.jsx'

const EMPTY_PAY = { sender_number: '', trx_id: '', amount_sent: '', note: '' }
const GUEST_CART_KEY = 'heem_guest_cart' // same key ShopContext uses
const h2 = 'font-display text-2xl md:text-3xl'
const submitCls = 'w-full bg-[#1a1716] py-4 text-sm uppercase tracking-[0.2em] text-[#F7F4EF] transition-colors hover:bg-[#B08D57] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#1a1716]'
const EMAIL = /^\S+@\S+\.\S+$/
const newKey = () => (globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`)

// DRF error body -> { 'addr.phone': 'message', 'pay.trx_id': 'message', email: 'message' }
function flatten(data) {
  const out = {}
  const first = (m) => (Array.isArray(m) ? first(m[0]) : m && typeof m === 'object' ? first(Object.values(m)[0]) : String(m ?? ''))
  for (const [k, v] of Object.entries(data || {})) {
    if ((k === 'address' || k === 'payment') && v && typeof v === 'object' && !Array.isArray(v)) {
      for (const [f, m] of Object.entries(v)) out[`${k === 'address' ? 'addr' : 'pay'}.${f}`] = first(m)
    } else if (k !== 'detail' && k !== 'items') {
      out[k] = first(v)
    }
  }
  return out
}

function focusFirst(errors) {
  const key = Object.keys(errors)[0]
  if (!key) return
  const id = key === 'email' ? 'guest-email' : key.replace('.', '-').replace(/-street$/, '-road')
  ;(document.getElementById(id) || document.getElementById('payment-method'))?.focus()
}

// Buying without an account: contact email + delivery address + payment. Nothing is saved to an account.
export default function GuestCheckout() {
  const navigate = useNavigate()
  const { user, ready } = useAuth()
  const { cart, loaded, refresh } = useShop()
  const [state, setState] = useState('loading') // loading | ok | error
  const [attempt, setAttempt] = useState(0)
  const [opts, setOpts] = useState(null)

  const [email, setEmail] = useState('')
  const [addr, setAddr] = useState(EMPTY_ADDRESS)
  const [note, setNote] = useState('')
  const [method, setMethod] = useState('')
  const [pay, setPay] = useState(EMPTY_PAY)
  const [amountEdited, setAmountEdited] = useState(false)
  const [quote, setQuote] = useState(null)

  const [errors, setErrors] = useState({})
  const [banner, setBanner] = useState('')
  const [problems, setProblems] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const inFlight = useRef(false)
  const keyRef = useRef(newKey()) // one key per visit: a double click or retry can never create a second order

  useEffect(() => { document.title = 'Guest checkout - HEEM' }, [])

  useEffect(() => {
    let live = true
    setState('loading')
    request('checkout/guest/options/', { auth: false }).then((o) => {
      if (!live) return
      setOpts(o)
      setMethod(o.payment_methods[0]?.code || '')
      setState('ok')
    }).catch(() => { if (live) setState('error') })
    return () => { live = false }
  }, [attempt])

  const items = cart.items
  const lines = items.map((i) => ({ variant_id: i.variant_id, quantity: i.quantity }))
  const linesKey = JSON.stringify(lines)

  // live delivery charge for the chosen district (the server calculates it again when the order is placed)
  useEffect(() => {
    if (!opts || !addr.district || !lines.length) { setQuote(null); return }
    const ctl = new AbortController()
    const t = setTimeout(() => {
      request('checkout/guest/quote/', { method: 'POST', auth: false, signal: ctl.signal, body: { items: lines, district: addr.district } })
        .then(setQuote).catch(() => {})
    }, 200)
    return () => { clearTimeout(t); ctl.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts, addr.district, linesKey])

  useEffect(() => {
    if (quote && !amountEdited) setPay((p) => ({ ...p, amount_sent: String(Number(quote.total)) }))
  }, [quote, amountEdited])

  if (ready && user) return <Navigate to="/checkout" replace />

  if (state === 'loading' || !loaded) {
    return (
      <section className="px-[2.5vw] py-24" aria-busy="true" aria-label="Loading checkout">
        <div className="h-10 w-48 animate-pulse bg-[#1a1716]/[0.06]" />
        <div className="mt-10 h-64 animate-pulse bg-[#1a1716]/[0.06]" />
      </section>
    )
  }
  if (state === 'error') {
    return (
      <section className="px-[2.5vw] py-32 text-center">
        <h1 className="font-display text-3xl md:text-4xl">We could not load checkout</h1>
        <p className="mt-4 text-neutral-600">Check your connection and try again.</p>
        <button type="button" onClick={() => setAttempt((a) => a + 1)} className="mt-8 border-b border-current pb-1 text-sm uppercase tracking-[0.18em] hover:text-[#B08D57]">Try again</button>
      </section>
    )
  }
  if (items.length === 0) {
    return (
      <section className="px-[2.5vw] py-32 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Checkout</p>
        <h1 className="mt-4 font-display text-3xl md:text-4xl">Your bag is empty</h1>
        <Link to="/search" className="mt-10 inline-block bg-[#1a1716] px-10 py-4 text-sm uppercase tracking-[0.2em] text-[#F7F4EF] transition-colors hover:bg-[#B08D57]">Discover the Collection</Link>
      </section>
    )
  }

  const subtotal = Number(cart.subtotal)
  const charge = quote ? Number(quote.delivery_charge) : null
  const total = quote ? Number(quote.total) : subtotal
  const methods = opts.payment_methods
  const current = methods.find((m) => m.code === method)
  const isMobile = current?.kind === 'mobile'
  const unavailable = items.filter((i) => !i.in_stock || i.quantity_exceeds_stock)
  const policy = opts.policy

  const validate = () => {
    const e = {}
    if (!EMAIL.test(email.trim())) e.email = 'Enter a valid email address. Your confirmation is sent here.'
    Object.assign(e, validateAddress(addr, 'addr'))
    if (!method) e.payment_method = 'Choose a payment method.'
    if (isMobile) {
      if (!BD_MOBILE.test(clean(pay.sender_number))) e['pay.sender_number'] = 'Enter the mobile number you paid from (01XXXXXXXXX).'
      if (!/^[A-Za-z0-9]{6,20}$/.test(pay.trx_id.trim())) e['pay.trx_id'] = 'Enter the TrxID exactly as in your payment message.'
      if (!(Number(pay.amount_sent) > 0)) e['pay.amount_sent'] = 'Enter the amount you sent.'
    }
    return e
  }

  const buildBody = () => {
    const body = { idempotency_key: keyRef.current, email: email.trim().toLowerCase(), address: toPayload(addr), items: lines, payment_method: method }
    if (note.trim()) body.note = note.trim()
    if (isMobile) {
      body.payment = { sender_number: clean(pay.sender_number), trx_id: pay.trx_id.trim(), amount_sent: String(pay.amount_sent).trim(), note: pay.note.trim() }
    }
    return body
  }

  const submit = async (ev) => {
    ev.preventDefault()
    if (inFlight.current) return
    setBanner(''); setProblems([])
    const e = validate()
    if (Object.keys(e).length) {
      setErrors(e); setBanner('Please check the highlighted fields.'); focusFirst(e)
      return
    }
    setErrors({})
    inFlight.current = true
    setSubmitting(true)
    try {
      const order = await request('checkout/guest/', { method: 'POST', auth: false, body: buildBody() })
      try { localStorage.setItem(GUEST_CART_KEY, '[]') } catch { /* ignore */ }
      await refresh() // the bag is empty now
      navigate(`/track/${encodeURIComponent(order.track_token)}?placed=1`, { replace: true })
    } catch (err) {
      const data = err.data
      if (data && typeof data === 'object') {
        const flat = flatten(data)
        setErrors(flat)
        if (Array.isArray(data.items) && data.items.every((x) => typeof x === 'string')) setProblems(data.items)
        setBanner(data.detail || (Object.keys(flat).length ? 'Please check the highlighted fields.' : err.message))
        focusFirst(flat)
      } else {
        setBanner(err.message || 'Something went wrong. Please try again.')
      }
      inFlight.current = false
      setSubmitting(false)
    }
  }

  const summary = <OrderSummary items={items} subtotal={subtotal} charge={charge} total={total} />
  const placeLabel = submitting ? 'Placing order…' : isMobile ? 'Place order' : 'Place order (pay on delivery)'

  return (
    <section className="px-[2.5vw] pb-24">
      <header className="pb-8 pt-12 md:pt-16">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Secure checkout</p>
        <h1 className="mt-4 font-display text-5xl uppercase leading-none md:text-6xl">Guest checkout</h1>
        <p className="mt-4 text-sm text-neutral-600">No account needed. Have one? <Link to="/login" state={{ from: '/checkout' }} className="underline underline-offset-4 hover:text-[#B08D57]">Sign in</Link></p>
      </header>

      <form onSubmit={submit} noValidate className="grid gap-12 nav:grid-cols-[minmax(0,1fr)_26rem] nav:gap-16">
        <div className="space-y-14">
          {(banner || unavailable.length > 0) && (
            <div role="alert" className="border border-[#8a6d3b] p-5 text-sm text-[#8a6d3b]">
              {banner && <p>{banner}</p>}
              {problems.length > 0 && <ul className="mt-2 list-disc pl-5">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
              {unavailable.length > 0 && (
                <p className={banner ? 'mt-2' : ''}>Some items in your bag are unavailable. <Link to="/cart" className="underline underline-offset-4">Update your bag</Link> to continue.</p>
              )}
              {problems.length > 0 && <p className="mt-2"><Link to="/cart" className="underline underline-offset-4">Go to your bag</Link></p>}
            </div>
          )}

          <details className="border border-[#1a1716]/15 p-5 nav:hidden">
            <summary className="flex cursor-pointer items-center justify-between font-display text-lg">
              <span>Order summary ({cart.count})</span><span>{formatPrice(total)}</span>
            </summary>
            <div className="mt-5">{summary}</div>
          </details>

          {/* 1. Contact */}
          <section aria-labelledby="contact-title">
            <h2 id="contact-title" className={h2}>1. Contact</h2>
            <div className="mt-6 max-w-xl">
              <Field id="guest-email" label="Email address" error={errors.email} hint="We send your order confirmation and a private tracking link here.">
                {(p) => <input {...p} type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />}
              </Field>
            </div>
          </section>

          {/* 2. Delivery */}
          <section aria-labelledby="delivery-title">
            <h2 id="delivery-title" className={h2}>2. Delivery</h2>
            <div className="mt-6">
              <AddressForm prefix="addr" value={addr} onChange={setAddr} errors={errors} />
              {errors.address && <p role="alert" className="mt-3 text-sm text-[#8a6d3b]">{errors.address}</p>}
              <div className="mt-5">
                <Field id="guest-note" label="Order notes" optional hint={`${note.length}/300`}>
                  {(p) => <textarea {...p} rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />}
                </Field>
              </div>
            </div>
            <p className="mt-8 text-sm text-neutral-600">
              Standard delivery: {charge === null ? `${formatPrice(policy.delivery_dhaka)} inside Dhaka, ${formatPrice(policy.delivery_outside)} elsewhere` : charge === 0 ? 'free' : formatPrice(charge)}
              {' '}(free on orders over {formatPrice(policy.free_over)}).
            </p>
          </section>

          {/* 3. Payment */}
          <section aria-labelledby="payment-title">
            <h2 id="payment-title" className={`${h2} mb-6`}>3. Payment</h2>
            <PaymentPanel methods={methods} method={method} setMethod={setMethod}
              total={quote ? total : null} pay={pay} setPay={setPay}
              onAmountEdit={() => setAmountEdited(true)} errors={errors} />
          </section>

          <div className="nav:hidden">
            <button type="submit" disabled={submitting || unavailable.length > 0} className={submitCls}>{placeLabel}</button>
            <p className="mt-3 text-center text-xs text-neutral-500">The final amount is confirmed by our system when you place the order.</p>
          </div>
        </div>

        <aside aria-label="Order summary" className="hidden h-fit border border-[#1a1716]/15 p-8 nav:sticky nav:top-24 nav:block">
          <h2 className="mb-6 font-display text-2xl">Order summary</h2>
          {summary}
          <button type="submit" disabled={submitting || unavailable.length > 0} className={`mt-6 ${submitCls}`}>{placeLabel}</button>
          <p className="mt-3 text-center text-xs text-neutral-500">The final amount is confirmed by our system when you place the order.</p>
          <p className="mt-4 text-center text-xs text-neutral-500">Wear your identity</p>
        </aside>
      </form>
    </section>
  )
}