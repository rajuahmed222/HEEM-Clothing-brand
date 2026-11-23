import { useEffect, useRef, useState } from 'react'
import { API, request, errorText, fieldErrors } from '../Api.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { Field, PHONE, clean } from '../components/checkout/AddressForm.jsx'

const GENDERS = [['female', 'Female'], ['male', 'Male'], ['other', 'Other'], ['na', 'Prefer not to say']]
const genderLabel = (v) => GENDERS.find(([k]) => k === v)?.[1] || ''
const solid = 'bg-[#1a1716] px-8 py-3.5 text-sm uppercase tracking-[0.2em] text-[#F7F4EF] transition-colors hover:bg-[#B08D57] disabled:cursor-not-allowed disabled:opacity-40'
const textBtn = 'text-sm underline underline-offset-4 transition-colors hover:text-[#B08D57] disabled:opacity-40 disabled:no-underline'
const mediaUrl = (u) => (!u ? null : /^https?:/.test(u) ? u : `${API}${u}`)
const initials = (n) => (n || '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
const first = (m) => (Array.isArray(m) ? m[0] : m ? String(m) : '')
const fmtDob = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '')

export default function PersonalInformation() {
  const { setUser, replaceSession } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ full_name: '', phone: '', date_of_birth: '', gender: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const fileRef = useRef(null)

  // password
  const [pwOpen, setPwOpen] = useState(false)
  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm: '' })
  const [pwErrors, setPwErrors] = useState({})
  const [pwBusy, setPwBusy] = useState(false)

  useEffect(() => { document.title = 'Personal information - HEEM' }, [])
  useEffect(() => {
    let live = true
    request('account/me/').then((d) => { if (live) { setProfile(d); setUser(d) } }).catch(() => { if (live) setLoadError(true) })
    return () => { live = false }
  }, [setUser])

  const startEdit = () => {
    setForm({ full_name: profile.full_name, phone: profile.phone || '', date_of_birth: profile.date_of_birth || '', gender: profile.gender || '' })
    setErrors({}); setMessage(''); setEditing(true)
  }
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const save = async (ev) => {
    ev.preventDefault()
    if (busy) return
    const e = {}
    if (!form.full_name.trim()) e.full_name = 'Enter your name.'
    if (form.phone.trim() && !PHONE.test(clean(form.phone))) e.phone = 'Enter a valid mobile number, e.g. 01XXXXXXXXX.'
    if (form.date_of_birth) {
      const d = new Date(`${form.date_of_birth}T00:00:00`)
      const now = new Date()
      if (d > now) e.date_of_birth = 'Date of birth cannot be in the future.'
      else if (now.getFullYear() - d.getFullYear() > 120) e.date_of_birth = 'Enter a valid date of birth.'
    }
    setErrors(e)
    if (Object.keys(e).length) { document.getElementById(`pi-${Object.keys(e)[0]}`)?.focus(); return }
    setBusy(true)
    try {
      const data = await request('account/me/', {
        method: 'PATCH',
        body: { full_name: form.full_name.trim(), phone: clean(form.phone), date_of_birth: form.date_of_birth || null, gender: form.gender },
      })
      setProfile(data); setUser(data); setEditing(false); setMessage('Your information was saved.')
    } catch (err) {
      const fe = fieldErrors(err)
      if (fe.detail || !Object.keys(fe).length) setErrors({ _form: errorText(err) || err.message })
      else setErrors(fe)
    } finally {
      setBusy(false)
    }
  }

  const onPhoto = async (ev) => {
    const file = ev.target.files?.[0]
    ev.target.value = ''
    if (!file) return
    setPhotoError(''); setMessage('')
    if (!file.type.startsWith('image/')) return setPhotoError('Please choose an image file.')
    if (file.size > 5 * 1024 * 1024) return setPhotoError('The photo must be smaller than 5 MB.')
    setPhotoBusy(true)
    try {
      const fd = new FormData()
      fd.append('avatar', file)
      const data = await request('account/me/', { method: 'PATCH', body: fd })
      setProfile(data); setUser(data); setMessage('Your photo was updated.')
    } catch (err) {
      setPhotoError(first(fieldErrors(err).avatar) || errorText(err) || err.message)
    } finally {
      setPhotoBusy(false)
    }
  }
  const removePhoto = async () => {
    setPhotoError(''); setMessage('')
    setPhotoBusy(true)
    try {
      const data = await request('account/me/', { method: 'PATCH', body: { avatar: null } })
      setProfile(data); setUser(data); setMessage('Your photo was removed.')
    } catch (err) {
      setPhotoError(errorText(err) || err.message)
    } finally {
      setPhotoBusy(false)
    }
  }

  const changePassword = async (ev) => {
    ev.preventDefault()
    if (pwBusy) return
    const e = {}
    if (!pw.current_password) e.current_password = 'Enter your current password.'
    if (pw.new_password.length < 8) e.new_password = 'Use at least 8 characters.'
    else if (pw.new_password !== pw.confirm) e.confirm = 'The two passwords do not match.'
    setPwErrors(e)
    if (Object.keys(e).length) return
    setPwBusy(true)
    try {
      const data = await request('account/password/change/', { method: 'POST', body: { current_password: pw.current_password, new_password: pw.new_password } })
      replaceSession(data.token, data.user) // the server issues a fresh token and signs out other devices
      setPw({ current_password: '', new_password: '', confirm: '' })
      setPwOpen(false)
      setMessage('Your password was changed. Other devices have been signed out.')
    } catch (err) {
      const d = err.data || {}
      const mapped = {}
      if (d.current_password) mapped.current_password = first(d.current_password)
      if (d.new_password) mapped.new_password = Array.isArray(d.new_password) ? d.new_password.join(' ') : String(d.new_password)
      setPwErrors(Object.keys(mapped).length ? mapped : { _form: errorText(err) || err.message })
    } finally {
      setPwBusy(false)
    }
  }

  const avatar = mediaUrl(profile?.avatar)

  return (
    <section className="px-[2.5vw] pb-24">
      <header className="pb-8 pt-12 md:pt-20">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">My account</p>
        <h1 className="mt-4 font-display text-5xl uppercase leading-none md:text-7xl">Personal information</h1>
      </header>

      <p role="status" className="min-h-6 pb-4 text-sm text-neutral-700">{message}</p>

      {loadError ? (
        <p className="text-neutral-600">We could not load your information. Please refresh the page.</p>
      ) : !profile ? (
        <div aria-hidden="true" className="max-w-2xl space-y-4">
          <div className="h-24 w-24 animate-pulse bg-[#1a1716]/[0.06]" />
          <div className="h-48 animate-pulse bg-[#1a1716]/[0.06]" />
        </div>
      ) : (
        <div className="max-w-2xl space-y-14">
          <section aria-labelledby="photo-title" className="flex flex-wrap items-center gap-6">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#1a1716]/20 bg-[#1a1716]/[0.04]">
              {avatar ? <img src={avatar} alt="Your profile photo" className="h-full w-full object-cover" />
                : <span className="font-display text-3xl text-neutral-500" aria-hidden="true">{initials(profile.full_name)}</span>}
            </div>
            <div>
              <h2 id="photo-title" className="font-display text-xl">Profile photo</h2>
              <div className="mt-3 flex flex-wrap items-center gap-5">
                <input ref={fileRef} type="file" accept="image/*" onChange={onPhoto} className="sr-only" id="pi-photo" aria-label="Choose a profile photo" />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={photoBusy} className={textBtn}>{photoBusy ? 'Please wait…' : avatar ? 'Change photo' : 'Upload photo'}</button>
                {avatar && <button type="button" onClick={removePhoto} disabled={photoBusy} className={textBtn}>Remove</button>}
              </div>
              {photoError && <p role="alert" className="mt-2 text-sm text-[#8a6d3b]">{photoError}</p>}
            </div>
          </section>

          <section aria-labelledby="details-title">
            <div className="flex items-baseline justify-between">
              <h2 id="details-title" className="font-display text-2xl">Your details</h2>
              {!editing && <button type="button" onClick={startEdit} className={textBtn}>Edit</button>}
            </div>

            {!editing ? (
              <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-8 gap-y-4 text-[0.95rem]">
                <dt className="text-neutral-500">Full name</dt><dd>{profile.full_name}</dd>
                <dt className="text-neutral-500">Email</dt><dd className="break-all">{profile.email}</dd>
                <dt className="text-neutral-500">Mobile number</dt><dd>{profile.phone || <span className="text-neutral-400">Not added</span>}</dd>
                <dt className="text-neutral-500">Date of birth</dt><dd>{fmtDob(profile.date_of_birth) || <span className="text-neutral-400">Not added</span>}</dd>
                <dt className="text-neutral-500">Gender</dt><dd>{genderLabel(profile.gender) || <span className="text-neutral-400">Not added</span>}</dd>
              </dl>
            ) : (
              <form onSubmit={save} noValidate className="mt-6 grid gap-5 md:grid-cols-2">
                <Field id="pi-full_name" label="Full name" error={errors.full_name}>
                  {(p) => <input {...p} value={form.full_name} onChange={set('full_name')} autoComplete="name" />}
                </Field>
                <Field id="pi-email" label="Email" hint="Your email is your sign-in and cannot be changed here.">
                  {(p) => <input {...p} value={profile.email} readOnly className={`${p.className} cursor-not-allowed bg-[#1a1716]/[0.04] text-neutral-500`} />}
                </Field>
                <Field id="pi-phone" label="Mobile number" optional error={errors.phone}>
                  {(p) => <input {...p} type="tel" inputMode="tel" placeholder="01XXXXXXXXX" value={form.phone} onChange={set('phone')} autoComplete="tel" />}
                </Field>
                <Field id="pi-date_of_birth" label="Date of birth" optional error={errors.date_of_birth}>
                  {(p) => <input {...p} type="date" value={form.date_of_birth} onChange={set('date_of_birth')} autoComplete="bday" />}
                </Field>
                <Field id="pi-gender" label="Gender" optional error={errors.gender}>
                  {(p) => (
                    <select {...p} value={form.gender} onChange={set('gender')}>
                      <option value="">Not specified</option>
                      {GENDERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  )}
                </Field>
                {errors._form && <p role="alert" className="text-sm text-[#8a6d3b] md:col-span-2">{errors._form}</p>}
                <div className="flex flex-wrap items-center gap-6 md:col-span-2">
                  <button type="submit" disabled={busy} className={solid}>{busy ? 'Saving…' : 'Save changes'}</button>
                  <button type="button" onClick={() => setEditing(false)} disabled={busy} className={textBtn}>Cancel</button>
                </div>
              </form>
            )}
          </section>

          <section aria-labelledby="password-title">
            <div className="flex items-baseline justify-between">
              <h2 id="password-title" className="font-display text-2xl">Password</h2>
              {!pwOpen && <button type="button" onClick={() => { setPwOpen(true); setPwErrors({}); setMessage('') }} className={textBtn}>Change password</button>}
            </div>
            {!pwOpen ? (
              <p className="mt-4 text-sm text-neutral-600">Choose a strong password you do not use anywhere else.</p>
            ) : (
              <form onSubmit={changePassword} noValidate className="mt-6 grid max-w-md gap-5">
                <Field id="pw-current" label="Current password" error={pwErrors.current_password}>
                  {(p) => <input {...p} type="password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} autoComplete="current-password" />}
                </Field>
                <Field id="pw-new" label="New password" hint="At least 8 characters." error={pwErrors.new_password}>
                  {(p) => <input {...p} type="password" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} autoComplete="new-password" />}
                </Field>
                <Field id="pw-confirm" label="Confirm new password" error={pwErrors.confirm}>
                  {(p) => <input {...p} type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" />}
                </Field>
                {pwErrors._form && <p role="alert" className="text-sm text-[#8a6d3b]">{pwErrors._form}</p>}
                <div className="flex flex-wrap items-center gap-6">
                  <button type="submit" disabled={pwBusy} className={solid}>{pwBusy ? 'Saving…' : 'Update password'}</button>
                  <button type="button" onClick={() => setPwOpen(false)} disabled={pwBusy} className={textBtn}>Cancel</button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </section>
  )
}