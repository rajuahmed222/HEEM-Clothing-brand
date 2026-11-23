import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import EditorialHero from '../components/editorial/EditorialHero.jsx'
import Reveal from '../components/editorial/Reveal.jsx'
import { Field } from '../components/checkout/AddressForm.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { request, errorText, fieldErrors } from '../Api.jsx'
import { usePolicy } from '../lib/policy.js'
import { RETURNS } from '../data/business.js'
import usePageMeta from '../lib/usePageMeta.js'

const REASONS = [
  ['wrong_size', 'Wrong size'], ['damaged', 'Damaged item'], ['incorrect', 'Incorrect item received'],
  ['not_as_described', 'Not as described'], ['changed_mind', 'Changed my mind'], ['other', 'Other'],
]
const MAX_BYTES = 5 * 1024 * 1024
const IMAGE_OK = ['image/jpeg', 'image/png', 'image/webp']
const linkCls = 'underline underline-offset-4 transition-colors hover:text-[#B08D57]'
const EMPTY = { order: '', item: '', type: 'return', reason: 'wrong_size', size: '', details: '' }

function Block({ id, title, children }) {
  return (
    <Reveal as="section" className="grid gap-5 py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] md:gap-20 md:py-16">
      <h2 id={id} className="font-display text-3xl leading-tight md:text-4xl">{title}</h2>
      <div className="max-w-xl space-y-4 leading-relaxed text-neutral-600">{children}</div>
    </Reveal>
  )
}

function RequestForm({ orders, onSent }) {
  const [f, setF] = useState(() => ({ ...EMPTY, order: orders.length === 1 ? orders[0].number : '' }))
  const [file, setFile] = useState(null)
  const [errors, setErrors] = useState({})
  const [banner, setBanner] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const order = orders.find((o) => o.number === f.order)
  const items = (order?.items || []).filter((i) => !i.has_open_request)
  const item = items.find((i) => String(i.id) === f.item)

  const submit = async (ev) => {
    ev.preventDefault()
    if (busy) return
    const err = {}
    if (!order) err.order = 'Choose the order.'
    if (!item) err.item = 'Choose the item.'
    if (f.type === 'exchange' && !f.size) err.size = 'Choose the size you would like instead.'
    if (file && file.size > MAX_BYTES) err.image = 'The photo must be 5 MB or smaller.'
    if (file && !IMAGE_OK.includes(file.type)) err.image = 'Upload a JPG, PNG or WebP photo.'
    setErrors(err)
    setBanner('')
    if (Object.keys(err).length) { setBanner('Please check the highlighted fields.'); return }

    const body = new FormData()
    body.append('order_number', f.order)
    body.append('item_id', f.item)
    body.append('request_type', f.type)
    body.append('reason', f.reason)
    if (f.type === 'exchange') body.append('replacement_size', f.size)
    if (f.details.trim()) body.append('details', f.details.trim())
    if (file) body.append('image', file)

    setBusy(true)
    try {
      await request('returns/', { method: 'POST', body })
      onSent()
    } catch (e) {
      const m = fieldErrors(e)
      const mapped = {
        order: m.order_number, item: m.item_id, size: m.replacement_size, image: m.image, details: m.details,
      }
      const known = Object.fromEntries(Object.entries(mapped).filter(([, v]) => v))
      setErrors(known)
      setBanner(Object.keys(known).length ? 'Please check the highlighted fields.' : (errorText(e) || e.message))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-8 grid gap-6 md:grid-cols-2">
      <Field id="r-order" label="Order" error={errors.order}>
        {(p) => (
          <select {...p} value={f.order} onChange={(e) => setF({ ...f, order: e.target.value, item: '', size: '' })}>
            <option value="">Choose an order</option>
            {orders.map((o) => <option key={o.number} value={o.number}>{o.number}</option>)}
          </select>
        )}
      </Field>
      <Field id="r-item" label="Item" error={errors.item}>
        {(p) => (
          <select {...p} value={f.item} onChange={(e) => setF({ ...f, item: e.target.value, size: '' })} disabled={!order}>
            <option value="">{order ? (items.length ? 'Choose an item' : 'No items available') : 'Choose an order first'}</option>
            {items.map((i) => <option key={i.id} value={i.id}>{[i.product_name, i.color, i.size && `Size ${i.size}`].filter(Boolean).join(' / ')}</option>)}
          </select>
        )}
      </Field>

      <fieldset className="md:col-span-2">
        <legend className="text-sm">What would you like?</legend>
        <div className="mt-3 flex flex-wrap gap-6">
          {[['return', 'Return'], ['exchange', 'Exchange for another size']].map(([v, l]) => (
            <label key={v} className="flex items-center gap-2">
              <input type="radio" name="type" value={v} checked={f.type === v} onChange={set('type')} className="accent-[#1a1716]" /> {l}
            </label>
          ))}
        </div>
      </fieldset>

      {f.type === 'exchange' && (
        <Field id="r-size" label="Size you would like instead" error={errors.size}>
          {(p) => (
            <select {...p} value={f.size} onChange={set('size')} disabled={!item}>
              <option value="">{item ? (item.exchange_sizes.length ? 'Choose a size' : 'No other size in stock') : 'Choose an item first'}</option>
              {(item?.exchange_sizes || []).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </Field>
      )}

      <Field id="r-reason" label="Reason" error={errors.reason}>
        {(p) => <select {...p} value={f.reason} onChange={set('reason')}>{REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>}
      </Field>

      <div className="md:col-span-2">
        <Field id="r-details" label="Anything else we should know?" optional error={errors.details}>
          {(p) => <textarea {...p} rows={4} maxLength={1000} value={f.details} onChange={set('details')} />}
        </Field>
      </div>

      <div className="md:col-span-2">
        <Field id="r-image" label="Photo (for a damaged or incorrect item)" optional error={errors.image}>
          {(p) => <input {...p} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} />}
        </Field>
        <p className="mt-2 text-xs text-neutral-500">JPG, PNG or WebP, up to 5 MB.</p>
      </div>

      <div className="md:col-span-2">
        {banner && <p role="alert" className="mb-4 text-sm text-[#8a6d3b]">{banner}</p>}
        <button type="submit" disabled={busy}
          className="bg-[#1a1716] px-8 py-3.5 text-sm uppercase tracking-[0.2em] text-[#F7F4EF] transition-colors hover:bg-[#B08D57] disabled:cursor-not-allowed disabled:opacity-40">
          {busy ? 'Sending…' : 'Send request'}
        </button>
      </div>
    </form>
  )
}

export default function ReturnsExchange() {
  usePageMeta('Returns & Exchange', 'How returns and exchanges work at HEEM, and a form to request one for a delivered order.')
  const { user, ready } = useAuth()
  const { returnDays } = usePolicy()
  const [orders, setOrders] = useState(null)
  const [mine, setMine] = useState([])
  const [state, setState] = useState('idle') // idle | loading | ok | error
  const [message, setMessage] = useState('')
  const [formKey, setFormKey] = useState(0)

  const load = useCallback(async () => {
    setState('loading')
    try {
      const [o, m] = await Promise.all([request('returns/eligible/'), request('returns/')])
      setOrders(o); setMine(m); setState('ok')
    } catch { setState('error') }
  }, [])

  useEffect(() => { if (user) load() }, [user, load])

  const sent = async () => {
    setMessage('Your request was sent. Our team will review it and get in touch.')
    setFormKey((k) => k + 1)
    await load()
  }

  return (
    <>
      <EditorialHero size="compact" eyebrow="CLIENT SERVICES" title="Returns & Exchange"
        intro="If something is not right, here is how to ask us to put it right." />

      <div className="divide-y divide-[#1a1716]/15 px-[2.5vw] py-8 md:py-16">
        <Block id="ret-eligibility" title="Return eligibility">
          <p>Returns can be requested for items from a delivered order. Open the form below, choose the order and the item, and tell us why.</p>
        </Block>
        <Block id="ret-exchange" title="Exchange eligibility">
          <p>If an item does not fit, you can ask to exchange it for another size. The form only offers sizes that are currently in stock for that item and colour.</p>
        </Block>
        <Block id="ret-time" title="Time limits">
          <p>{returnDays !== null ? `You can ask for a return or exchange within ${returnDays} days of delivery.` : 'Your order page shows whether the return window is still open.'}</p>
        </Block>
        {RETURNS.conditions.length > 0 && (
          <Block id="ret-condition" title="Product condition">
            <ul className="list-disc space-y-2 pl-5">{RETURNS.conditions.map((c) => <li key={c}>{c}</li>)}</ul>
          </Block>
        )}
        <Block id="ret-damaged" title="Damaged or incorrect items">
          <p>If an item arrived damaged or is not what you ordered, choose that reason in the form and attach a photo. It helps us resolve it faster.</p>
        </Block>
        <Block id="ret-refund" title="Refunds">
          <p>Once a return has been received, the payment status on your order moves to Refund pending and then to Refunded. You can follow this on your order page.</p>
        </Block>
      </div>

      <section aria-labelledby="ret-form-title" className="border-t border-[#1a1716]/15 px-[2.5vw] py-16 md:py-24">
        <h2 id="ret-form-title" className="font-display text-3xl md:text-5xl">Request a return or exchange</h2>

        {!ready ? null : !user ? (
          <div className="mt-8 max-w-xl border border-[#1a1716]/15 p-8">
            <p className="leading-relaxed text-neutral-600">Please sign in so we can show your delivered orders and keep your request linked to your account.</p>
            <div className="mt-6 flex flex-wrap gap-6">
              <Link to="/login" className="bg-[#1a1716] px-8 py-3.5 text-sm uppercase tracking-[0.2em] text-[#F7F4EF] transition-colors hover:bg-[#B08D57]">Sign in</Link>
              <Link to="/signup" className={`self-center text-sm ${linkCls}`}>Create an account</Link>
            </div>
          </div>
        ) : (
          <div className="mt-2 max-w-3xl">
            <p role="status" className="mt-4 min-h-6 text-sm text-neutral-700">{message}</p>

            {state === 'loading' && <div aria-busy="true" className="mt-4 h-40 animate-pulse bg-[#1a1716]/[0.06]" />}
            {state === 'error' && (
              <p className="mt-4 text-neutral-600">We could not load your orders. <button type="button" onClick={load} className={linkCls}>Try again</button></p>
            )}
            {state === 'ok' && (orders.length === 0 ? (
              <p className="mt-4 max-w-xl leading-relaxed text-neutral-600">You have no delivered orders that can be returned right now. If you think this is a mistake, <Link to="/contact" className={linkCls}>contact us</Link>.</p>
            ) : <RequestForm key={formKey} orders={orders} onSent={sent} />)}

            {mine.length > 0 && (
              <div className="mt-16">
                <h3 className="font-display text-2xl md:text-3xl">Your requests</h3>
                <ul className="mt-6 divide-y divide-[#1a1716]/15 border-y border-[#1a1716]/15">
                  {mine.map((r) => (
                    <li key={r.id} className="py-5 text-[0.95rem]">
                      <p className="flex flex-wrap justify-between gap-2">
                        <span>{r.request_type_label}: {r.product_name}{r.size && ` / Size ${r.size}`}{r.replacement_size && ` to ${r.replacement_size}`}</span>
                        <span className="border border-[#1a1716]/30 px-3 py-0.5 text-xs uppercase tracking-[0.15em]">{r.status_label}</span>
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">Order {r.order_number} / {r.reason_label}</p>
                      {r.staff_note && <p className="mt-2 text-sm text-neutral-700">{r.staff_note}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="ret-help" className="bg-[#1a1716] px-[2.5vw] py-20 text-center text-[#F7F4EF] md:py-28">
        <h2 id="ret-help" className="font-display text-3xl md:text-5xl">Need a hand?</h2>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link to="/contact" className="border border-white/70 px-8 py-3.5 text-sm uppercase tracking-[0.2em] transition-colors hover:bg-white hover:text-[#1a1716]">Contact us</Link>
          <Link to="/faq" className="border border-white/70 px-8 py-3.5 text-sm uppercase tracking-[0.2em] transition-colors hover:bg-white hover:text-[#1a1716]">FAQ</Link>
        </div>
      </section>
    </>
  )
}