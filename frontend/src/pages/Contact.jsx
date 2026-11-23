import { useState } from 'react'
import { Link } from 'react-router-dom'
import EditorialHero from '../components/editorial/EditorialHero.jsx'
import { Field } from '../components/checkout/AddressForm.jsx'
import { request, errorText, fieldErrors } from '../Api.jsx'
import { BUSINESS } from '../data/business.js'
import { useContactSettings, prettyPhone, telHref, waLink } from '../lib/contactSettings.js'
import { WhatsAppIcon } from '../components/FloatingWhatsApp.jsx'
import usePageMeta from '../lib/usePageMeta.js'

const TYPES = [
  ['order', 'My order'], ['delivery', 'Delivery'], ['return', 'Returns & exchange'],
  ['product', 'Product or sizing'], ['payment', 'Payment'], ['other', 'Something else'],
]
const EMPTY = { name: '', email: '', inquiry_type: 'order', order_number: '', subject: '', message: '' }
const LINKS = [['FAQ', '/faq'], ['Shipping & Delivery', '/shipping-delivery'], ['Returns & Exchange', '/returns-exchange'], ['Track an order', '/account/tracking']]
const linkCls = 'border-b border-current pb-0.5 transition-colors hover:text-[#B08D57] focus-visible:text-[#B08D57]'

const actionBtn = 'group flex w-full items-center gap-4 border px-5 py-4 text-left transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B08D57]'

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
    </svg>
  )
}

// Call / WhatsApp buttons and availability, all read from the backend settings
function DirectContact() {
  const { data, loading, error } = useContactSettings()
  const [copied, setCopied] = useState(false)

  if (loading) {
    return (
      <div aria-busy="true" aria-label="Loading contact options" className="mt-6 space-y-3">
        <div className="h-16 animate-pulse bg-[#1a1716]/[0.06]" />
        <div className="h-16 animate-pulse bg-[#1a1716]/[0.06]" />
      </div>
    )
  }
  if (error && !data) {
    return <p role="status" className="mt-4 max-w-sm leading-relaxed text-neutral-600">Our contact details could not be loaded right now. Please use the form and we will get back to you.</p>
  }

  const email = data.email || BUSINESS.email
  const hours = data.hours || BUSINESS.hours
  const direct = data.call_enabled || data.whatsapp_enabled
  const rows = [
    email && ['Email', <a key="e" href={`mailto:${email}`} className={linkCls}>{email}</a>],
    hours && ['Support hours', hours],
  ].filter(Boolean)

  const copy = async () => {
    try { await navigator.clipboard.writeText(data.phone); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* the number is shown on the button anyway */ }
  }

  return (
    <div className="mt-6">
      {data.is_open !== null && (
        <p className="mb-4 flex items-start gap-2 text-sm" role="status">
          <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${data.is_open ? 'bg-[#B08D57]' : 'bg-neutral-400'}`} />
          <span>
            <span className="text-[#1a1716]">{data.is_open ? 'Our team is available now.' : 'We are currently closed.'}</span>
            {!data.is_open && <span className="block text-neutral-600">{data.after_hours_message || 'Send us a message and we will reply when we are back.'}</span>}
          </span>
        </p>
      )}

      {direct && (
        <div className="space-y-3">
          {data.call_enabled && (
            <a href={telHref(data.phone)} className={`${actionBtn} border-[#1a1716] bg-[#1a1716] text-[#F7F4EF] hover:border-[#B08D57] hover:bg-[#B08D57]`}>
              <PhoneIcon />
              <span className="flex-1">
                <span className="block text-sm uppercase tracking-[0.18em]">Call us</span>
                <span className="block text-sm opacity-80">{prettyPhone(data.phone)}</span>
              </span>
              <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </a>
          )}
          {data.whatsapp_enabled && (
            <a href={waLink(data.whatsapp, data.whatsapp_message)} target="_blank" rel="noopener noreferrer"
              className={`${actionBtn} border-[#1a1716]/30 hover:border-[#1a1716] hover:bg-[#1a1716] hover:text-[#F7F4EF]`}>
              <WhatsAppIcon className="h-5 w-5 shrink-0" />
              <span className="flex-1">
                <span className="block text-sm uppercase tracking-[0.18em]">Chat on WhatsApp</span>
                <span className="block text-sm opacity-70">Opens WhatsApp<span className="sr-only"> in a new tab</span></span>
              </span>
              <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">↗</span>
            </a>
          )}
          {data.call_enabled && (
            <p className="text-sm text-neutral-500">
              On a computer the call button may not open anything.{' '}
              <button type="button" onClick={copy} className="underline underline-offset-4 hover:text-[#B08D57]">{copied ? 'Number copied' : 'Copy the number'}</button>
            </p>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <dl className={`grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 text-[0.95rem] ${direct ? 'mt-8' : ''}`}>
          {rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-neutral-500">{k}</dt><dd>{v}</dd></div>)}
        </dl>
      )}
      {!direct && rows.length === 0 && <p className="max-w-sm leading-relaxed text-neutral-600">Send us a message with the form and our team will get back to you.</p>}
      {BUSINESS.responseTime && <p className="mt-5 max-w-sm text-sm text-neutral-500">{BUSINESS.responseTime}</p>}
    </div>
  )
}

export default function Contact() {
  usePageMeta('Contact Us', 'Get in touch with the HEEM team about an order, delivery, returns, sizing or anything else.')
  const [f, setF] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [banner, setBanner] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = async (ev) => {
    ev.preventDefault()
    if (busy) return
    const err = {}
    if (!f.name.trim()) err.name = 'Please enter your name.'
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) err.email = 'Enter a valid email address.'
    if (!f.subject.trim()) err.subject = 'Please add a subject.'
    if (f.message.trim().length < 10) err.message = 'Please tell us a little more (at least 10 characters).'
    setErrors(err)
    setBanner('')
    if (Object.keys(err).length) { setBanner('Please check the highlighted fields.'); return }

    setBusy(true)
    try {
      await request('contact/', {
        method: 'POST', auth: false,
        body: { ...f, name: f.name.trim(), email: f.email.trim(), subject: f.subject.trim(), message: f.message.trim(), website: '' },
      })
      setSent(true)
      setF(EMPTY)
    } catch (e) {
      if (e.status === 429) setBanner('You have sent several messages recently. Please try again a little later.')
      else {
        const mapped = fieldErrors(e)
        const known = Object.fromEntries(Object.entries(mapped).filter(([k]) => k in EMPTY))
        setErrors(known)
        setBanner(Object.keys(known).length ? 'Please check the highlighted fields.' : (errorText(e) || e.message))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <EditorialHero size="compact" eyebrow="CLIENT SERVICES" title="How Can We Help?"
        intro="Questions about an order, a fit or a delivery? Write to us and we will help." />

      <div className="grid gap-16 px-[2.5vw] py-16 md:py-24 nav:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] nav:gap-24">
        <aside aria-label="Ways to reach us" className="space-y-12">
          <div>
            <h2 className="font-display text-2xl md:text-3xl">Get in touch</h2>
            <DirectContact />
          </div>

          <div>
            <h2 className="font-display text-2xl md:text-3xl">Quick answers</h2>
            <ul className="mt-5 space-y-3 text-[0.95rem]">
              {LINKS.map(([label, to]) => <li key={to}><Link to={to} className={linkCls}>{label}</Link></li>)}
            </ul>
          </div>
        </aside>

        <section aria-labelledby="contact-form-title">
          <h2 id="contact-form-title" className="font-display text-2xl md:text-3xl">Send us a message</h2>

          {sent ? (
            <div role="status" className="mt-8 border border-[#1a1716]/15 p-8">
              <p className="font-display text-2xl">Thank you. Your message has been sent.</p>
              <p className="mt-3 max-w-md text-neutral-600">We will reply to the email address you gave us.</p>
              <button type="button" onClick={() => setSent(false)} className="mt-6 text-sm underline underline-offset-4 hover:text-[#B08D57]">Send another message</button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="mt-8 grid gap-6 md:grid-cols-2">
              <Field id="c-name" label="Full name" error={errors.name}>
                {(p) => <input {...p} value={f.name} onChange={set('name')} autoComplete="name" maxLength={120} />}
              </Field>
              <Field id="c-email" label="Email address" error={errors.email}>
                {(p) => <input {...p} type="email" value={f.email} onChange={set('email')} autoComplete="email" />}
              </Field>
              <Field id="c-type" label="What is this about?" error={errors.inquiry_type}>
                {(p) => <select {...p} value={f.inquiry_type} onChange={set('inquiry_type')}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>}
              </Field>
              <Field id="c-order" label="Order number" optional error={errors.order_number}>
                {(p) => <input {...p} value={f.order_number} onChange={set('order_number')} placeholder="HEEM-20261023-AB2C" maxLength={20} autoComplete="off" />}
              </Field>
              <div className="md:col-span-2">
                <Field id="c-subject" label="Subject" error={errors.subject}>
                  {(p) => <input {...p} value={f.subject} onChange={set('subject')} maxLength={160} autoComplete="off" />}
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field id="c-message" label="Message" error={errors.message}>
                  {(p) => <textarea {...p} rows={6} value={f.message} onChange={set('message')} maxLength={3000} />}
                </Field>
              </div>

              {/* Hidden from people; a bot that fills it is ignored by the server */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>Website<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
              </div>

              <div className="md:col-span-2">
                {banner && <p role="alert" className="mb-4 text-sm text-[#8a6d3b]">{banner}</p>}
                <button type="submit" disabled={busy}
                  className="bg-[#1a1716] px-8 py-3.5 text-sm uppercase tracking-[0.2em] text-[#F7F4EF] transition-colors hover:bg-[#B08D57] disabled:cursor-not-allowed disabled:opacity-40">
                  {busy ? 'Sending…' : 'Send message'}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </>
  )
}