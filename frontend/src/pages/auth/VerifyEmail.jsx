import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { errorText, request, setToken } from '../../Api.jsx'
import AuthLayout, { primaryBtn } from './AuthLayout.jsx'

const KEY = 'heem_verify_email'
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// Step 2 of 2: the 6-digit code from the email. Reached from sign-up, or from sign-in with an unverified account.
export default function VerifyEmail() {
  const location = useLocation()
  let email = location.state?.email
  if (!email) { try { email = sessionStorage.getItem(KEY) } catch { /* ignore */ } }

  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [resendIn, setResendIn] = useState(location.state?.resend_in ?? 60) // seconds until "Resend" unlocks
  const [expiresIn, setExpiresIn] = useState(location.state?.expires_in ?? 300) // seconds until the code dies
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    const t = setInterval(() => {
      setResendIn((s) => Math.max(0, s - 1))
      setExpiresIn((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const verify = useCallback(async (value) => {
    if (busy) return
    setBusy(true); setError(''); setInfo('')
    try {
      const d = await request('account/verify-email/', { method: 'POST', auth: false, body: { email, code: value } })
      setToken(d.token, true)
      try { sessionStorage.removeItem(KEY) } catch { /* ignore */ }
      window.location.replace('/account') // a fresh load makes the app pick up the new sign-in
    } catch (err) {
      setError(errorText(err))
      if (err.data?.code === 'invalid') setCode('')
      setBusy(false)
      inputRef.current?.focus()
    }
  }, [busy, email])

  if (!email) return <Navigate to="/signup" replace />

  const onChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(v)
    if (v.length === 6) verify(v)
  }

  const submit = (e) => {
    e.preventDefault()
    if (code.length !== 6) return setError('Enter the 6-digit code from your email.')
    verify(code)
  }

  const resend = async () => {
    setError(''); setInfo('')
    try {
      const d = await request('account/resend-code/', { method: 'POST', auth: false, body: { email } })
      setResendIn(d?.resend_in ?? 60)
      setExpiresIn(d?.expires_in ?? 300)
      setCode('')
      setInfo('A new code is on its way.')
      inputRef.current?.focus()
    } catch (err) {
      if (err.data?.retry_after) setResendIn(Math.min(err.data.retry_after, 3600))
      setError(errorText(err))
    }
  }

  return (
    <AuthLayout image="/look4.jpg" title="Check your email" subtitle={`We sent a 6-digit code to ${email}.`}
      footer={<>Wrong address? <Link to="/signup" className="text-[#F7F4EF] underline">Start again</Link></>}>
      <form onSubmit={submit} noValidate className="grid gap-5">
        <div>
          <label htmlFor="otp" className="mb-2 block text-xs uppercase tracking-[0.2em] text-[#A5A29D]">Verification code</label>
          <input ref={inputRef} id="otp" value={code} onChange={onChange} inputMode="numeric" pattern="[0-9]*" maxLength={6}
            autoComplete="one-time-code" placeholder="••••••" disabled={busy} aria-describedby="otp-help"
            className="w-full border border-[#353535] bg-transparent px-4 py-4 text-center font-display text-3xl tracking-[0.5em] text-[#F7F4EF] outline-none transition-colors placeholder:text-[#4a4743] focus:border-[#B08D57] disabled:opacity-60" />
          <p id="otp-help" className="mt-3 text-sm text-[#A5A29D]" aria-live="polite">
            {expiresIn > 0 ? <>This code expires in <span className="text-[#F7F4EF]">{mmss(expiresIn)}</span>.</> : 'This code has expired. Request a new one below.'}
          </p>
        </div>
        {error && <p className="text-sm text-[#e0a39a]" role="alert">{error}</p>}
        {info && <p className="text-sm text-[#B08D57]" role="status">{info}</p>}
        <button type="submit" disabled={busy || code.length !== 6} className={primaryBtn}>{busy ? 'Verifying…' : 'Verify and continue'}</button>
        <div className="text-center text-sm text-[#A5A29D]">
          Did not get it?{' '}
          {resendIn > 0
            ? <span>Resend in {resendIn}s</span>
            : <button type="button" onClick={resend} className="text-[#F7F4EF] underline hover:text-[#B08D57]">Resend code</button>}
          <p className="mt-2 text-xs">Check your spam folder too.</p>
        </div>
      </form>
    </AuthLayout>
  )
}