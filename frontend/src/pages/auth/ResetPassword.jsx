import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { errorText, request } from '../../Api.jsx'
import AuthLayout, { Field, PasswordInput, StrengthMeter, primaryBtn } from './AuthLayout.jsx'

// Opened from the email link: /reset-password?uid=...&token=...
export default function ResetPassword() {
  const [params] = useSearchParams()
  const uid = params.get('uid'), token = params.get('token')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (pw.length < 8) return setError('Use at least 8 characters.')
    if (pw !== pw2) return setError('The two passwords do not match.')
    setBusy(true); setError('')
    try {
      await request('account/password/reset/', { method: 'POST', body: { uid, token, new_password: pw }, auth: false })
      setDone(true)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  const invalid = !uid || !token
  return (
    <AuthLayout image="/look6.jpg" title="New password" subtitle="Choose a new password for your account."
      footer={<Link to="/login" className="text-[#F7F4EF] underline">Back to sign in</Link>}>
      {invalid ? (
        <p className="text-[#e0a39a]" role="alert">This reset link is incomplete. <Link to="/forgot-password" className="underline">Request a new one</Link>.</p>
      ) : done ? (
        <p className="border border-[#353535] p-5" role="status">Password updated. <Link to="/login" className="underline">Sign in</Link> with your new password.</p>
      ) : (
        <form onSubmit={submit} noValidate className="grid gap-5">
          <Field label="New password" htmlFor="pw">
            <PasswordInput id="pw" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            <StrengthMeter password={pw} />
          </Field>
          <Field label="Confirm password" htmlFor="pw2">
            <PasswordInput id="pw2" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </Field>
          {error && <p className="text-sm text-[#e0a39a]" role="alert">{error}</p>}
          <button type="submit" disabled={busy} className={primaryBtn}>{busy ? 'Saving…' : 'Update password'}</button>
        </form>
      )}
    </AuthLayout>
  )
}