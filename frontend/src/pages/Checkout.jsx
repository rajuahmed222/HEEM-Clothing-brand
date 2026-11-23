import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { request, formatPrice } from '../Api.jsx'
import { useShop } from '../context/ShopContext.jsx'
import AddressForm, {
  BD_MOBILE, EMPTY_ADDRESS, Field, PHONE, clean, fromSaved, toPayload, validateAddress,
} from '../components/checkout/AddressForm.jsx'
import PaymentPanel from '../components/checkout/PaymentPanel.jsx'
import OrderSummary from '../components/checkout/OrderSummary.jsx'

const EMPTY_PAY = { sender_number: '', trx_id: '', amount_sent: '', note: '' }
const SECTION = { address: 'addr', recipient: 'rec', buyer: 'buyer', payment: 'pay' }
const h2 = 'font-display text-2xl md:text-3xl'
const submitCls = 'w-full bg-[#1a1716] py-4 text-sm uppercase tracking-[0.2em] text-[#F7F4EF] transition-colors hover:bg-[#B08D57] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#1a1716]'

const newKey = () => (globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`)

// DRF error body -> { 'addr.phone': 'message', 'payment_method': 'message' }
function flatten(data) {
  const out = {}
  const first = (m) => (Array.isArray(m) ? m[0] : String(m))
  for (const [k, v] of Object.entries(data || {})) {
    if (SECTION[k] && v && typeof v === 'object' && !Array.isArray(v)) {
      for (const [f, m] of Object.entries(v)) out[`${SECTION[k]}.${f}`] = first(m)
    } else if (k !== 'detail' && k !== 'items') {
      out[k] = first(v)
    }
  }
  return out
}

function focusFirst(errors) {
  const key = Object.keys(errors)[0]
  if (!key) return
  const id = key.replace('.', '-').replace(/-street$/, '-road').replace('buyer-recipient_name', 'buyer-name')
  const el = document.getElementById(id) || document.getElementById('payment-method')
  el?.focus()
}

export default function Checkout() {
  const navigate = useNavigate()
  const { refresh } = useShop()
  const [state, setState] = useState('loading') // loading | ok | error
  const [attempt, setAttempt] = useState(0)
  const [opts, setOpts] = useState(null)

  const [selectedId, setSelectedId] = useState(null) // null = a new address
  const [addr, setAddr] = useState(EMPTY_ADDRESS)
  const [saveAddr, setSaveAddr] = useState(false)
  const [isGift, setIsGift] = useState(false)
  const [buyer, setBuyer] = useState({ name: '', phone: '' })
  const [rec, setRec] = useState(EMPTY_ADDRESS)
  const [giftMessage, setGiftMessage] = useState('')
  const [method, setMethod] = useState('')
  const [pay, setPay] = useState(EMPTY_PAY)
  const [amountEdited, setAmountEdited] = useState(false)
  const [quote, setQuote] = useState(null)

  const [errors, setErrors] = useState({})
  const [banner, setBanner] = useState('')
  const [problems, setProblems] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const inFlight = useRef(false)
  const keyRef = useRef(newKey()) // one key per checkout visit: a double click or retry cannot create a second order

  useEffect(() => { document.title = 'Checkout - HEEM' }, [])

  useEffect(() => {
    let live = true
    setState('loading')
    request('checkout/options/').then((o) => {
      if (!live) return
      setOpts(o)
      const saved = o.addresses.find((a) => a.id === o.default_address_id)
      if (saved) { setAddr(fromSaved(saved)); setSelectedId(saved.id) }
      else setAddr({ ...EMPTY_ADDRESS, recipient_name: o.buyer.name || '', phone: o.buyer.phone || '' })
      setBuyer({ name: o.buyer.name || '', phone: o.buyer.phone || '' })
      setMethod(o.payment_methods[0]?.code || '')
      setState('ok')
    }).catch(() => { if (live) setState('error') })
    return () => { live = false }
  }, [attempt])

  // Live delivery charge for the chosen district. The final amount is recalculated again by the server when the order is placed.
  const district = isGift ? rec.district : addr.district
  useEffect(() => {
    if (!opts || !district) { setQuote(null); return }
    const ctl = new AbortController()
    const t = setTimeout(() => {
      request(`checkout/quote/?district=${encodeURIComponent(district)}`, { signal: ctl.signal }).then(setQuote).catch(() => {})
    }, 200)
    return () => { clearTimeout(t); ctl.abort() }
  }, [opts, district])

  // Pre-fill "amount sent" with the order total until the customer edits it
  useEffect(() => {
    if (quote && !amountEdited) setPay((p) => ({ ...p, amount_sent: String(Number(quote.total)) }))
  }, [quote, amountEdited])

  if (state === 'loading') {
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

  const items = opts.cart.items
  if (items.length === 0) {
    return (
      <section className="px-[2.5vw] py-32 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Checkout</p>
        <h1 className="mt-4 font-display text-3xl md:text-4xl">Your bag is empty</h1>
        <Link to="/search" className="mt-10 inline-block bg-[#1a1716] px-10 py-4 text-sm uppercase tracking-[0.2em] text-[#F7F4EF] transition-colors hover:bg-[#B08D57]">Discover the Collection</Link>
      </section>
    )
  }

  const subtotal = Number(opts.cart.subtotal)
  const charge = quote ? Number(quote.delivery_charge) : null
  const total = quote ? Number(quote.total) : subtotal
  const methods = opts.payment_methods
  const current = methods.find((m) => m.code === method)
  const isMobile = current?.kind === 'mobile'
  const unavailable = items.filter((i) => !i.in_stock || i.quantity_exceeds_stock)
  const saved = opts.addresses.find((a) => a.id === selectedId)
  const edited = !saved || JSON.stringify(toPayload(addr)) !== JSON.stringify(toPayload(fromSaved(saved)))
  const policy = opts.policy

  const pickSaved = (value) => {
    setSaveAddr(false)
    if (value === 'new') {
      setSelectedId(null)
      setAddr({ ...EMPTY_ADDRESS, recipient_name: buyer.name, phone: buyer.phone })
    } else {
      const a = opts.addresses.find((x) => String(x.id) === value)
      setSelectedId(a.id)
      setAddr(fromSaved(a))
    }
  }

  const validate = () => {
    const e = {}
    if (isGift) {
      if (!buyer.name.trim()) e['buyer.name'] = 'Enter your name.'
      if (!PHONE.test(clean(buyer.phone))) e['buyer.phone'] = 'Enter your mobile number.'
      Object.assign(e, validateAddress(rec, 'rec'))
    } else {
      Object.assign(e, validateAddress(addr, 'addr'))
    }
    if (!method) e.payment_method = 'Choose a payment method.'
    if (isMobile) {
      if (!BD_MOBILE.test(clean(pay.sender_number))) e['pay.sender_number'] = 'Enter the mobile number you paid from (01XXXXXXXXX).'
      if (!/^[A-Za-z0-9]{6,20}$/.test(pay.trx_id.trim())) e['pay.trx_id'] = 'Enter the TrxID exactly as in your payment message.'
      if (!(Number(pay.amount_sent) > 0)) e['pay.amount_sent'] = 'Enter the amount you sent.'
    }
    return e
  }

  const buildBody = () => {
    const body = { idempotency_key: keyRef.current, payment_method: method }
    if (isGift) {
      body.is_gift = true
      body.buyer = { name: buyer.name.trim(), phone: clean(buyer.phone) }
      body.recipient = toPayload(rec)
      body.gift_message = giftMessage.trim()
    } else {
      body.address = { ...toPayload(addr), save_address: edited && saveAddr }
    }
    if (isMobile) {
      body.payment = {
        sender_number: clean(pay.sender_number), trx_id: pay.trx_id.trim(),
        amount_sent: String(pay.amount_sent).trim(), note: pay.note.trim(),
      }
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
      const order = await request('checkout/', { method: 'POST', body: buildBody() })
      await refresh() // the bag is empty now
      navigate(`/order-confirmation/${order.number}`, { replace: true })
    } catch (err) {
      const data = err.data
      if (data && typeof data === 'object') {
        const flat = flatten(data)
        setErrors(flat)
        if (Array.isArray(data.items)) setProblems(data.items)
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
        <h1 className="mt-4 font-display text-5xl uppercase leading-none md:text-6xl">Checkout</h1>
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
              <span>Order summary ({opts.cart.count})</span><span>{formatPrice(total)}</span>
            </summary>
            <div className="mt-5">{summary}</div>
          </details>

          {/* 1. Delivery */}
          <section aria-labelledby="delivery-title">
            <h2 id="delivery-title" className={h2}>1. Delivery</h2>
            <label className="mt-6 flex cursor-pointer items-center gap-3">
              <input type="checkbox" checked={isGift} onChange={(e) => { setIsGift(e.target.checked); setErrors({}) }} className="h-4 w-4 accent-[#1a1716]" />
              <span>Send as a gift</span>
            </label>

            {!isGift ? (
              <div className="mt-6">
                {opts.addresses.length > 0 && (
                  <fieldset className="mb-8">
                    <legend className="mb-3 text-sm text-neutral-500">Deliver to</legend>
                    <div className="grid gap-3">
                      {opts.addresses.map((a) => (
                        <label key={a.id} className={`flex cursor-pointer items-start gap-3 border p-4 text-sm ${selectedId === a.id ? 'border-[#1a1716]' : 'border-[#1a1716]/20 hover:border-[#1a1716]/50'}`}>
                          <input type="radio" name="saved_address" checked={selectedId === a.id} onChange={() => pickSaved(String(a.id))} className="mt-1 h-4 w-4 accent-[#1a1716]" />
                          <span><span className="block">{a.recipient_name} <span className="text-neutral-500">({a.label})</span></span>
                            <span className="block text-neutral-600">{[a.street, a.area, a.upazila, a.district].filter(Boolean).join(', ')}</span></span>
                        </label>
                      ))}
                      <label className={`flex cursor-pointer items-center gap-3 border p-4 text-sm ${selectedId === null ? 'border-[#1a1716]' : 'border-[#1a1716]/20 hover:border-[#1a1716]/50'}`}>
                        <input type="radio" name="saved_address" checked={selectedId === null} onChange={() => pickSaved('new')} className="h-4 w-4 accent-[#1a1716]" />
                        <span>Use a different address</span>
                      </label>
                    </div>
                    {saved && <p className="mt-3 text-xs text-neutral-500">You can edit the details below for this order. Your saved address is not changed.</p>}
                  </fieldset>
                )}
                <AddressForm prefix="addr" value={addr} onChange={setAddr} errors={errors} />
                {errors.address && <p role="alert" className="mt-3 text-sm text-[#8a6d3b]">{errors.address}</p>}
                {edited && (
                  <label className="mt-6 flex cursor-pointer items-center gap-3 text-sm">
                    <input type="checkbox" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} className="h-4 w-4 accent-[#1a1716]" />
                    <span>Also save this address to my account</span>
                  </label>
                )}
              </div>
            ) : (
              <div className="mt-6 space-y-10">
                <div>
                  <h3 className="font-display text-xl">Your details</h3>
                  <p className="mt-1 text-sm text-neutral-500">You place and pay for the order. Your account address is not used.</p>
                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <Field id="buyer-name" label="Your name" error={errors['buyer.name']}>
                      {(p) => <input {...p} value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} autoComplete="name" />}
                    </Field>
                    <Field id="buyer-phone" label="Your mobile number" error={errors['buyer.phone']}>
                      {(p) => <input {...p} type="tel" inputMode="tel" placeholder="01XXXXXXXXX" value={buyer.phone} onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })} autoComplete="tel" />}
                    </Field>
                  </div>
                </div>
                <div>
                  <h3 className="font-display text-xl">Gift recipient&rsquo;s address</h3>
                  <p className="mt-1 text-sm text-neutral-500">The order is delivered here. We do not create an account for the recipient.</p>
                  <div className="mt-5">
                    <AddressForm prefix="rec" value={rec} onChange={setRec} errors={errors} nameLabel="Recipient's full name" autoFill={false} />
                    {errors.recipient && <p role="alert" className="mt-3 text-sm text-[#8a6d3b]">{errors.recipient}</p>}
                  </div>
                </div>
                <Field id="gift-message" label="Gift message" optional hint={`${giftMessage.length}/300`}>
                  {(p) => <textarea {...p} rows={3} maxLength={300} value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} />}
                </Field>
              </div>
            )}

            <p className="mt-8 text-sm text-neutral-600">
              Standard delivery: {charge === null ? `${formatPrice(policy.delivery_dhaka)} inside Dhaka, ${formatPrice(policy.delivery_outside)} elsewhere` : charge === 0 ? 'free' : formatPrice(charge)}
              {' '}(free on orders over {formatPrice(policy.free_over)}).
            </p>
          </section>

          {/* 2. Payment */}
          <section aria-labelledby="payment-title">
            <h2 id="payment-title" className={`${h2} mb-6`}>2. Payment</h2>
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