import { useEffect, useState } from 'react'
import { adm, btnCls, cardCls, inputCls, Msg, PageHead } from './ui.jsx'
import { errorText, fieldErrors } from '../Api.jsx'
import { prettyPhone, resetContactSettings, telHref, waLink } from '../lib/contactSettings.js'

// Same order the website uses (the week starts on Saturday). Numbers match the backend: 0 = Monday.
const DAYS = [[5, 'Sat'], [6, 'Sun'], [0, 'Mon'], [1, 'Tue'], [2, 'Wed'], [3, 'Thu'], [4, 'Fri']]

const toForm = (d) => ({
  phone: d.phone || '', call_enabled: !!d.call_enabled,
  whatsapp: d.whatsapp || '', whatsapp_enabled: !!d.whatsapp_enabled, floating_whatsapp: !!d.floating_whatsapp,
  whatsapp_message: d.whatsapp_message || '', email: d.email || '',
  opening_time: (d.opening_time || '').slice(0, 5), closing_time: (d.closing_time || '').slice(0, 5),
  open_days: d.open_days || [], hours_note: d.hours_note || '', after_hours_message: d.after_hours_message || '',
  support_paused: !!d.support_paused,
})

function Toggle({ checked, onChange, label, hint }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="text-sm"><p>{label}</p>{hint && <p className="text-xs text-neutral-500">{hint}</p>}</div>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-emerald-600' : 'bg-neutral-300'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  )
}

function Field({ label, hint, error, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-neutral-700">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-neutral-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-700">{error}</span>}
    </label>
  )
}

export default function ContactSettings() {
  const [f, setF] = useState(null)
  const [saved, setSaved] = useState(null) // what the server has right now (numbers already normalised)
  const [errs, setErrs] = useState({})
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    adm('contact-settings/').then((d) => { setSaved(d); setF(toForm(d)) }).catch((e) => setError(errorText(e)))
  }, [])

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const flip = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const toggleDay = (d) => setF((s) => ({ ...s, open_days: s.open_days.includes(d) ? s.open_days.filter((x) => x !== d) : [...s.open_days, d] }))

  const save = async (e) => {
    e.preventDefault()
    setError(''); setOk(''); setErrs({})
    setBusy(true)
    try {
      const body = { ...f, opening_time: f.opening_time || null, closing_time: f.closing_time || null }
      const d = await adm('contact-settings/', { method: 'PATCH', body })
      setSaved(d); setF(toForm(d))
      resetContactSettings()
      setOk('Saved. Customers see the new details within a minute.')
    } catch (err) {
      setErrs(fieldErrors(err))
      setError(Object.keys(fieldErrors(err)).length ? 'Please fix the highlighted fields.' : errorText(err))
    } finally { setBusy(false) }
  }

  if (!f) return error ? <Msg error={error} /> : <p className="text-neutral-600">Loading…</p>

  const st = saved.is_open
  return (
    <form onSubmit={save} noValidate>
      <PageHead title="Contact settings"><button type="submit" className={btnCls} disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button></PageHead>
      <Msg error={error} ok={ok} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className={`${cardCls} space-y-4`}>
            <h2 className="font-display text-xl">Phone call</h2>
            <Field label="Customer support phone number" hint="Write it any way you like, for example 01712345678. It is saved as +8801712345678." error={errs.phone}>
              <input className={inputCls} inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="01XXXXXXXXX" autoComplete="off" />
            </Field>
            <Toggle checked={f.call_enabled} onChange={flip('call_enabled')} label="Show the &quot;Call us&quot; button" hint="Customers tap it to open the phone dialer." />
            {errs.call_enabled && <p className="text-xs text-red-700">{errs.call_enabled}</p>}
          </section>

          <section className={`${cardCls} space-y-4`}>
            <h2 className="font-display text-xl">WhatsApp</h2>
            <Field label="WhatsApp number" hint="A mobile number registered on WhatsApp." error={errs.whatsapp}>
              <input className={inputCls} inputMode="tel" value={f.whatsapp} onChange={set('whatsapp')} placeholder="01XXXXXXXXX" autoComplete="off" />
            </Field>
            <Field label="Welcome message" hint="Already typed in the chat when the customer opens WhatsApp. They can still change it." error={errs.whatsapp_message}>
              <textarea className={inputCls} rows={2} maxLength={300} value={f.whatsapp_message} onChange={set('whatsapp_message')} />
            </Field>
            <Toggle checked={f.whatsapp_enabled} onChange={flip('whatsapp_enabled')} label="Show the &quot;Chat on WhatsApp&quot; button" />
            {errs.whatsapp_enabled && <p className="text-xs text-red-700">{errs.whatsapp_enabled}</p>}
            <Toggle checked={f.floating_whatsapp} onChange={flip('floating_whatsapp')} label="Floating WhatsApp button on every page" hint="The round button in the corner of the website." />
            {errs.floating_whatsapp && <p className="text-xs text-red-700">{errs.floating_whatsapp}</p>}
          </section>

          <section className={`${cardCls} space-y-4`}>
            <h2 className="font-display text-xl">Support email</h2>
            <Field label="Email address" hint="Shown on the Contact page. Leave empty to hide it." error={errs.email}>
              <input className={inputCls} type="email" value={f.email} onChange={set('email')} autoComplete="off" />
            </Field>
          </section>

          <section className={`${cardCls} space-y-4`}>
            <h2 className="font-display text-xl">Business hours</h2>
            <fieldset>
              <legend className="mb-2 text-sm text-neutral-700">Open days</legend>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(([d, label]) => (
                  <button key={d} type="button" aria-pressed={f.open_days.includes(d)} onClick={() => toggleDay(d)}
                    className={`min-w-14 border px-3 py-2 text-sm transition-colors ${f.open_days.includes(d) ? 'border-[#1a1716] bg-[#1a1716] text-[#F7F4EF]' : 'border-[#1a1716]/25 hover:border-[#1a1716]'}`}>{label}</button>
                ))}
              </div>
              {errs.open_days && <p className="mt-1 text-xs text-red-700">{errs.open_days}</p>}
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Opening time" error={errs.opening_time}><input className={inputCls} type="time" value={f.opening_time} onChange={set('opening_time')} /></Field>
              <Field label="Closing time" hint="Leave both empty if you do not want a schedule." error={errs.closing_time}><input className={inputCls} type="time" value={f.closing_time} onChange={set('closing_time')} /></Field>
            </div>
            <p className="text-xs text-neutral-500">Times are in Bangladesh time. Customers see the hours written automatically, for example "Sat–Thu, 10:00 AM – 8:00 PM".</p>
            <Field label="Custom hours text (optional)" hint="If you fill this, customers see it instead of the automatic text." error={errs.hours_note}>
              <input className={inputCls} maxLength={200} value={f.hours_note} onChange={set('hours_note')} />
            </Field>
            <Field label="After-hours message" hint="Shown when you are closed." error={errs.after_hours_message}>
              <textarea className={inputCls} rows={2} maxLength={300} value={f.after_hours_message} onChange={set('after_hours_message')} />
            </Field>
            <Toggle checked={f.support_paused} onChange={flip('support_paused')} label="Pause support now" hint="Shows &quot;currently closed&quot; whatever the schedule says. Use it for holidays or when nobody can answer." />
          </section>
        </div>

        <aside className="space-y-6">
          <section className={cardCls}>
            <h2 className="mb-3 font-display text-xl">What customers see now</h2>
            <p className="mb-3 flex items-center gap-2 text-sm">
              <span className={`h-2 w-2 rounded-full ${st === true ? 'bg-emerald-600' : st === false ? 'bg-neutral-400' : 'bg-amber-500'}`} aria-hidden="true" />
              {st === true ? 'Open now' : st === false ? 'Closed now' : 'No schedule set'}
            </p>
            <ul className="space-y-2 text-sm text-neutral-700">
              <li>Hours: {saved.hours_label || 'not shown'}</li>
              <li>Call button: {saved.call_enabled && saved.phone ? `on (${prettyPhone(saved.phone)})` : 'off'}</li>
              <li>WhatsApp button: {saved.whatsapp_enabled && saved.whatsapp ? `on (${prettyPhone(saved.whatsapp)})` : 'off'}</li>
              <li>Floating button: {saved.whatsapp_enabled && saved.floating_whatsapp ? 'on' : 'off'}</li>
            </ul>
            <p className="mt-4 text-xs text-neutral-500">This shows what is saved, not unsaved changes. Test the saved links:</p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              {saved.phone && <a className="underline underline-offset-4" href={telHref(saved.phone)}>Test call</a>}
              {saved.whatsapp && <a className="underline underline-offset-4" target="_blank" rel="noopener noreferrer" href={waLink(saved.whatsapp.replace('+', ''), saved.whatsapp_message)}>Test WhatsApp</a>}
            </div>
          </section>
        </aside>
      </div>

      <div className="mt-6 flex justify-end"><button type="submit" className={btnCls} disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button></div>
    </form>
  )
}