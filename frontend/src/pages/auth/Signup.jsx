import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { errorText, fieldErrors, request } from '../../Api.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import AuthLayout, { Divider, Field, PasswordInput, SocialButtons, StrengthMeter, inputCls, primaryBtn } from './AuthLayout.jsx'

const EMAIL = /^\S+@\S+\.\S+$/

// Step 1 of 2: details. The account is created inactive and a 6-digit code is emailed; step 2 is /verify-email.
export default function Signup() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [f, setF] = useState({ full_name: '', email: '', password: '', confirm_password: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/account" replace />

  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    if (f.full_name.trim().length < 2) next.full_name = 'Enter your full name.'
    if (!EMAIL.test(f.email.trim())) next.email = 'Enter a valid email address.'
    if (f.password.length < 8) next.password = 'Use at least 8 characters.'
    if (f.confirm_password !== f.password) next.confirm_password = 'The two passwords do not match.'
    setErrors(next)
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      const email = f.email.trim().toLowerCase()
      const d = await request('account/register/', {
        method: 'POST', auth: false,
        body: { full_name: f.full_name.trim(), email, password: f.password, confirm_password: f.confirm_password },
      })
      try { sessionStorage.setItem('heem_verify_email', email) } catch { /* private mode: the router state still carries it */ }
      navigate('/verify-email', { state: { email, resend_in: d?.resend_in, expires_in: d?.expires_in } })
    } catch (err) {
      const fe = fieldErrors(err)
      const known = ['full_name', 'email', 'password', 'confirm_password']
      setErrors({
        full_name: fe.full_name, email: fe.email, password: fe.password, confirm_password: fe.confirm_password,
        form: Object.keys(fe).some((k) => known.includes(k)) ? '' : errorText(err),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout image="/look4.jpg" title="Create account" subtitle="Join HEEM. We will email you a code to confirm your address."
      footer={<>Already have an account? <Link to="/login" className="text-[#F7F4EF] underline">Login in</Link></>}>
      <form onSubmit={submit} noValidate className="grid gap-5">
        <Field label="Full name" htmlFor="full_name" error={errors.full_name}>
          <input id="full_name" autoComplete="name" value={f.full_name}
            onChange={(e) => setF({ ...f, full_name: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Email address" htmlFor="email" error={errors.email}>
          <input id="email" type="email" autoComplete="email" value={f.email}
            onChange={(e) => setF({ ...f, email: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password}>
          <PasswordInput id="password" autoComplete="new-password" value={f.password}
            onChange={(e) => setF({ ...f, password: e.target.value })} />
          <StrengthMeter password={f.password} />
        </Field>
        <Field label="Confirm password" htmlFor="confirm_password" error={errors.confirm_password}>
          <PasswordInput id="confirm_password" autoComplete="new-password" value={f.confirm_password}
            onChange={(e) => setF({ ...f, confirm_password: e.target.value })} />
        </Field>
        {errors.form && <p className="text-sm text-[#e0a39a]" role="alert">{errors.form}</p>}
        <button type="submit" disabled={busy} className={primaryBtn}>{busy ? 'Sending code…' : 'Create account'}</button>
      </form>
      <Divider>Or sign up with</Divider>
      <SocialButtons />
    </AuthLayout>
  )
}