import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { errorText } from '../../Api.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import AuthLayout, { Divider, Field, PasswordInput, SocialButtons, inputCls, primaryBtn } from './AuthLayout.jsx'

const EMAIL = /^\S+@\S+\.\S+$/

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/account'
  const [f, setF] = useState({ email: '', password: '', remember: true })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={from} replace />

  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!EMAIL.test(f.email.trim())) next.email = 'Enter a valid email address.'
    if (!f.password) next.password = 'Enter your password.'
    setErrors(next)
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      await login({ email: f.email.trim(), password: f.password, remember: f.remember })
      navigate(from, { replace: true })
    } catch (err) {
      if (err?.data?.code === 'email_not_verified') {
        // signed up but never entered the code: the server just emailed a fresh one
        const email = (err.data.email || f.email).trim().toLowerCase()
        try { sessionStorage.setItem('heem_verify_email', email) } catch { /* ignore */ }
        navigate('/verify-email', { state: { email } })
        return
      }
      setErrors({ form: errorText(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout image="/look2.jpg" title="Welcome back" subtitle="Sign in to your HEEM account."
      footer={<>New to HEEM? <Link to="/signup" className="text-[#F7F4EF] underline">Create an account</Link></>}>
      <form onSubmit={submit} noValidate className="grid gap-5">
        <Field label="Email address" htmlFor="email" error={errors.email}>
          <input id="email" type="email" autoComplete="email" value={f.email}
            onChange={(e) => setF({ ...f, email: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password}>
          <PasswordInput id="password" autoComplete="current-password" value={f.password}
            onChange={(e) => setF({ ...f, password: e.target.value })} />
        </Field>
        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-[#A5A29D]">
            <input type="checkbox" checked={f.remember} onChange={(e) => setF({ ...f, remember: e.target.checked })}
              className="h-4 w-4 accent-[#F7F4EF]" />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-[#A5A29D] underline hover:text-[#F7F4EF]">Forgot password?</Link>
        </div>
        {errors.form && <p className="text-sm text-[#e0a39a]" role="alert">{errors.form}</p>}
        <button type="submit" disabled={busy} className={primaryBtn}>{busy ? 'Loging in…' : 'Login'}</button>
      </form>
      <Divider>Or sign in with</Divider>
      <SocialButtons />
    </AuthLayout>
  )
}