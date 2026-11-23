import { useCallback, useEffect, useState } from 'react'
import { request, errorText } from '../Api.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import AddressForm, { EMPTY_ADDRESS, fromSaved, toPayload, validateAddress } from '../components/checkout/AddressForm.jsx'
import { Badge } from '../components/orders/orderUi.jsx'

const LABELS = [['home', 'Home'], ['office', 'Office'], ['other', 'Other']]
const textBtn = 'text-sm underline underline-offset-4 transition-colors hover:text-[#B08D57] disabled:opacity-40 disabled:no-underline'
const solid = 'bg-[#1a1716] px-8 py-3.5 text-sm uppercase tracking-[0.2em] text-[#F7F4EF] transition-colors hover:bg-[#B08D57] disabled:cursor-not-allowed disabled:opacity-40'
const first = (m) => (Array.isArray(m) ? m[0] : String(m))

export default function Addresses() {
  const { user } = useAuth()
  const [list, setList] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [editing, setEditing] = useState(null) // null | 'new' | address id
  const [form, setForm] = useState(EMPTY_ADDRESS)
  const [label, setLabel] = useState('home')
  const [makeDefault, setMakeDefault] = useState(false)
  const [errors, setErrors] = useState({})
  const [banner, setBanner] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [confirming, setConfirming] = useState(null)

  const load = useCallback(async () => {
    try {
      setList(await request('account/addresses/'))
      setLoadError(false)
    } catch {
      setLoadError(true)
    }
  }, [])

  useEffect(() => { document.title = 'My addresses - HEEM'; load() }, [load])
  useEffect(() => {
    if (editing !== null) document.getElementById('address-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [editing])

  const editingAddress = typeof editing === 'number' ? list?.find((a) => a.id === editing) : null

  const startNew = () => {
    setEditing('new'); setErrors({}); setBanner(''); setMessage('')
    setForm({ ...EMPTY_ADDRESS, recipient_name: user.full_name || '' })
    setLabel('home')
    setMakeDefault(!list || list.length === 0)
  }
  const startEdit = (a) => {
    setEditing(a.id); setErrors({}); setBanner(''); setMessage('')
    setForm(fromSaved(a)); setLabel(a.label); setMakeDefault(a.is_default)
  }
  const cancel = () => { setEditing(null); setErrors({}); setBanner('') }

  const save = async (ev) => {
    ev.preventDefault()
    if (busy) return
    const e = validateAddress(form, 'addr')
    setErrors(e)
    setBanner('')
    if (Object.keys(e).length) {
      setBanner('Please check the highlighted fields.')
      const key = Object.keys(e)[0]
      document.getElementById(key.replace('.', '-'))?.focus()
      return
    }
    setBusy(true)
    const body = { ...toPayload(form), label, is_default: makeDefault }
    try {
      if (editing === 'new') await request('account/addresses/', { method: 'POST', body })
      else await request(`account/addresses/${editing}/`, { method: 'PATCH', body })
      setMessage(editing === 'new' ? 'Address saved.' : 'Address updated.')
      setEditing(null)
      await load()
    } catch (err) {
      const d = err.data
      if (d && typeof d === 'object' && !d.detail) {
        const mapped = {}
        for (const [k, v] of Object.entries(d)) mapped[`addr.${k}`] = first(v)
        setErrors(mapped)
        setBanner(mapped['addr.non_field_errors'] || 'Please check the highlighted fields.')
      } else {
        setBanner(errorText(err) || err.message)
      }
    } finally {
      setBusy(false)
    }
  }

  const act = async (fn, doneText) => {
    if (busy) return
    setBusy(true)
    setMessage('')
    try {
      await fn()
      setMessage(doneText)
      await load()
    } catch (err) {
      setMessage(errorText(err) || err.message)
    } finally {
      setBusy(false)
      setConfirming(null)
    }
  }
  const makeDefaultNow = (a) => act(() => request(`account/addresses/${a.id}/default/`, { method: 'POST' }), 'Default address updated.')
  const remove = (a) => act(() => request(`account/addresses/${a.id}/`, { method: 'DELETE' }), 'Address deleted.')

  return (
    <section className="px-[2.5vw] pb-24">
      <header className="pb-8 pt-12 md:pt-20">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">My account</p>
        <h1 className="mt-4 font-display text-5xl uppercase leading-none md:text-7xl">Addresses</h1>
      </header>

      <p role="status" className="min-h-6 pt-6 text-sm text-neutral-700">{message}</p>

      {editing !== null && (
        <form id="address-form" onSubmit={save} noValidate className="mb-12 mt-4 border border-[#1a1716]/15 p-5 md:p-8">
          <h2 className="font-display text-2xl">{editing === 'new' ? 'Add a new address' : 'Edit address'}</h2>
          <fieldset className="mt-6">
            <legend className="mb-2 text-sm">Save as</legend>
            <div className="flex flex-wrap gap-3">
              {LABELS.map(([v, l]) => (
                <label key={v} className={`cursor-pointer border px-5 py-2 text-sm ${label === v ? 'border-[#1a1716] bg-[#1a1716] text-[#F7F4EF]' : 'border-[#1a1716]/20 hover:border-[#1a1716]'}`}>
                  <input type="radio" name="label" value={v} checked={label === v} onChange={() => setLabel(v)} className="sr-only" />{l}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-6"><AddressForm prefix="addr" value={form} onChange={setForm} errors={errors} /></div>
          <label className="mt-6 flex cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" checked={makeDefault} disabled={!!editingAddress?.is_default}
              onChange={(e) => setMakeDefault(e.target.checked)} className="h-4 w-4 accent-[#1a1716]" />
            <span>Make this my default address{editingAddress?.is_default && ' (it already is)'}</span>
          </label>
          {banner && <p role="alert" className="mt-5 text-sm text-[#8a6d3b]">{banner}</p>}
          <div className="mt-6 flex flex-wrap items-center gap-6">
            <button type="submit" disabled={busy} className={solid}>{busy ? 'Saving…' : 'Save address'}</button>
            <button type="button" onClick={cancel} disabled={busy} className={textBtn}>Cancel</button>
          </div>
        </form>
      )}

      {loadError ? (
        <div className="mt-6">
          <p className="text-neutral-600">We could not load your addresses.</p>
          <button type="button" onClick={load} className={`mt-4 ${textBtn}`}>Try again</button>
        </div>
      ) : !list ? (
        <div aria-hidden="true" className="mt-6 grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => <div key={i} className="h-40 animate-pulse bg-[#1a1716]/[0.06]" />)}
        </div>
      ) : (
        <>
          {editing === null && (
            <div className="mb-8 mt-2">
              <button type="button" onClick={startNew} className={solid}>Add new address</button>
            </div>
          )}
          {list.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">No saved addresses</p>
              <h2 className="mx-auto mt-4 max-w-xl font-display text-3xl md:text-4xl">Save an address for a faster checkout</h2>
            </div>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {list.map((a) => (
                <li key={a.id} className="flex flex-col border border-[#1a1716]/15 p-5 md:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{a.label}</Badge>
                    {a.is_default && <Badge tone="done">Default</Badge>}
                  </div>
                  <address className="mt-4 not-italic leading-relaxed text-neutral-700">
                    <span className="text-[#1a1716]">{a.recipient_name}</span><br />
                    {a.phone}<br />
                    {[a.street, a.area, a.upazila, a.district, a.division].filter(Boolean).join(', ')}
                    {a.landmark && <><br />{a.landmark}</>}
                    {a.postal_code && <><br />{a.postal_code}</>}
                  </address>
                  <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
                    <button type="button" onClick={() => startEdit(a)} disabled={busy} className={textBtn}>Edit</button>
                    {!a.is_default && <button type="button" onClick={() => makeDefaultNow(a)} disabled={busy} className={textBtn}>Make default</button>}
                    {confirming === a.id ? (
                      <span className="flex items-center gap-4 text-sm">
                        Delete this address?
                        <button type="button" onClick={() => remove(a)} disabled={busy} className={textBtn}>Yes, delete</button>
                        <button type="button" onClick={() => setConfirming(null)} disabled={busy} className={textBtn}>Keep</button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => setConfirming(a.id)} disabled={busy} className={textBtn}>Delete</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}