import { useEffect, useRef, useState } from 'react'
import { errorText, request, setToken } from '../../Api.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

// Real Google and Facebook sign-in. The browser opens the provider's own window and gets a token;
// our Django server checks that token with the provider before anyone is signed in.
// Apple is intentionally not here (planned for a later update).

let cfgPromise = null
const loadConfig = () => (cfgPromise ||= request('account/social/config/', { auth: false }).catch(() => { cfgPromise = null; return {} }))

const scripts = {}
const loadScript = (src) => (scripts[src] ||= new Promise((resolve, reject) => {
  const el = document.createElement('script')
  el.src = src; el.async = true
  el.onload = resolve
  el.onerror = () => { delete scripts[src]; reject(new Error('blocked')) }
  document.head.appendChild(el)
}))

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
)
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.88v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
  </svg>
)

// same look as the form fields in AuthLayout (kept local so the two files do not import each other)
const inputCls = 'w-full border border-[#353535] bg-[#111111] px-4 py-3.5 text-[0.95rem] text-[#F7F4EF] placeholder:text-[#6f6c68] transition-colors focus:border-[#F7F4EF] focus:outline-none'
const primaryBtn = 'w-full bg-[#F7F4EF] py-4 text-sm font-medium uppercase tracking-[0.2em] text-[#090909] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50'
const btn = 'flex w-full items-center justify-center gap-3 border border-[#353535] py-3.5 text-sm tracking-wide text-[#F7F4EF] transition-colors hover:border-[#F7F4EF] disabled:cursor-wait disabled:opacity-60'

export default function SocialButtons({ verb = 'Continue' }) {
  const { setUser } = useAuth()
  const [cfg, setCfg] = useState(null)          // null while loading, then { google, facebook } (empty string = not configured)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState('')
  const [link, setLink] = useState(null)         // { token, email, provider } when the email already has an HEEM account
  const [pw, setPw] = useState('')
  const googleClient = useRef(null)
  const finishRef = useRef(null)

  const signedIn = (d) => { setToken(d.token, true); setUser(d.user) }

  // the pages redirect on their own as soon as `user` is set
  finishRef.current = async (provider, accessToken) => {
    setBusy(provider); setMsg('')
    try {
      signedIn(await request(`account/social/${provider}/`, { method: 'POST', auth: false, body: { access_token: accessToken } }))
    } catch (err) {
      if (err.data?.code === 'link_required') { setLink({ token: err.data.link_token, email: err.data.email, provider }); setPw('') }
      else setMsg(errorText(err))
    } finally { setBusy('') }
  }

  useEffect(() => {
    let live = true
    loadConfig().then(async (c) => {
      if (!live) return
      setCfg(c)
      // load the provider scripts now, so the click itself can open the window straight away (popup blockers)
      if (c.google) {
        try {
          await loadScript('https://accounts.google.com/gsi/client')
          googleClient.current = window.google.accounts.oauth2.initTokenClient({
            client_id: c.google, scope: 'openid email profile',
            callback: (r) => (r.access_token ? finishRef.current('google', r.access_token) : setMsg('Google sign-in was cancelled.')),
            error_callback: () => setMsg('Google sign-in was cancelled.'),
          })
        } catch { /* ad blocker or offline: the click explains it */ }
      }
      if (c.facebook) {
        try {
          await loadScript('https://connect.facebook.net/en_US/sdk.js')
          window.FB.init({ appId: c.facebook, cookie: false, xfbml: false, version: 'v21.0' })
        } catch { /* same */ }
      }
    })
    return () => { live = false }
  }, [])

  const google = () => {
    setMsg('')
    if (cfg && !cfg.google) return setMsg('Google sign-in is not configured yet. Please use your email for now.')
    if (!googleClient.current) return setMsg('Google is still loading, or is blocked by your browser. Try again in a moment.')
    googleClient.current.requestAccessToken()
  }

  const facebook = () => {
    setMsg('')
    if (cfg && !cfg.facebook) return setMsg('Facebook sign-in is not configured yet. Please use your email for now.')
    if (!window.FB) return setMsg('Facebook is still loading, or is blocked by your browser. Try again in a moment.')
    window.FB.login((r) => {
      if (r.authResponse?.accessToken) finishRef.current('facebook', r.authResponse.accessToken)
      else setMsg('Facebook sign-in was cancelled.')
    }, { scope: 'email,public_profile' })
  }

  const confirmLink = async (e) => {
    e.preventDefault()
    setBusy('link'); setMsg('')
    try {
      signedIn(await request('account/social/link/', { method: 'POST', auth: false, body: { link_token: link.token, password: pw } }))
    } catch (err) { setMsg(errorText(err)) } finally { setBusy('') }
  }

  if (link) {
    const name = link.provider === 'google' ? 'Google' : 'Facebook'
    return (
      <form onSubmit={confirmLink} className="grid gap-4 border border-[#353535] p-5">
        <p className="text-sm text-[#F7F4EF]">An HEEM account already exists for <span className="text-[#B08D57]">{link.email}</span>.</p>
        <p className="text-sm text-[#A5A29D]">To connect {name} to it, enter your HEEM password. We never link accounts without this check.</p>
        <label htmlFor="link-pw" className="sr-only">HEEM password</label>
        <input id="link-pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="HEEM password" className={inputCls} />
        {msg && <p className="text-sm text-[#e0a39a]" role="alert">{msg}</p>}
        <button type="submit" disabled={busy === 'link' || !pw} className={primaryBtn}>{busy === 'link' ? 'Connecting…' : `Connect ${name} and sign in`}</button>
        <button type="button" onClick={() => { setLink(null); setMsg('') }} className="text-sm text-[#A5A29D] underline hover:text-[#F7F4EF]">Cancel</button>
      </form>
    )
  }

  return (
    <div>
      <div className="grid gap-3">
        <button type="button" onClick={google} disabled={!!busy} className={btn}><GoogleIcon />{busy === 'google' ? 'Signing in…' : `${verb} with Google`}</button>
        <button type="button" onClick={facebook} disabled={!!busy} className={btn}><FacebookIcon />{busy === 'facebook' ? 'Signing in…' : `${verb} with Facebook`}</button>
      </div>
      <p className="mt-3 min-h-5 text-sm text-[#d9c28f]" role="status">{msg}</p>
    </div>
  )
}