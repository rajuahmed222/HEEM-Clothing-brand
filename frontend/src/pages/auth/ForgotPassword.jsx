import { useState } from 'react'
import { Link } from 'react-router-dom'
import { errorText, request } from '../../Api.jsx'
import AuthLayout, { Field, inputCls, primaryBtn } from './AuthLayout.jsx'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle') // idle | loading | sent | error
  const [message, setMessage] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setState('error'); setMessage('Enter a valid email address.'); return }
    setState('loading')
    try {
      const d = await request('account/password/forgot/', { method: 'POST', body: { email: email.trim() }, auth: false })
      setMessage(d.detail)
      setState('sent')
    } catch (err) {
      setMessage(errorText(err))
      setState('error')
    }
  }

  return (
    <AuthLayout image="/look6.jpg" title="Reset password" subtitle="We will email you a link to choose a new password."
      footer={<Link to="/login" className="text-[#F7F4EF] underline">Back to sign in</Link>}>
      {state === 'sent' ? (
        <p className="border border-[#353535] p-5 text-[#F7F4EF]" role="status">{message}</p>
      ) : (
        <form onSubmit={submit} noValidate className="grid gap-5">
          <Field label="Email address" htmlFor="email" error={state === 'error' ? message : ''}>
            <input id="email" type="email" autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </Field>
          <button type="submit" disabled={state === 'loading'} className={primaryBtn}>
            {state === 'loading' ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}