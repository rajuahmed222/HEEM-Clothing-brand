import { useState } from 'react'
import { Link } from 'react-router-dom'

// Shared look for Login / Signup / Forgot / Reset: dark editorial split-screen.
export const inputCls =
  'w-full border border-[#353535] bg-[#111111] px-4 py-3.5 text-[0.95rem] text-[#F7F4EF] placeholder:text-[#6f6c68] transition-colors focus:border-[#F7F4EF] focus:outline-none'
export const primaryBtn =
  'w-full bg-[#F7F4EF] py-4 text-sm font-medium uppercase tracking-[0.2em] text-[#090909] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50'

function Photo({ src }) {
  const [ok, setOk] = useState(true)
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#2a2420] via-[#14110f] to-[#090909]">
      {src && ok && <img src={src} alt="" onError={() => setOk(false)} className="h-full w-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />
    </div>
  )
}

export default function AuthLayout({ image, title, subtitle, children, footer }) {
  return (
    <div className="min-h-svh bg-[#090909] font-body text-[#F7F4EF] md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Phone / small tablet: compact campaign banner */}
      <div className="relative h-36 md:hidden">
        <Photo src={image} />
        <Link to="/" className="absolute inset-0 flex items-center justify-center font-display text-2xl tracking-[0.32em] pl-[0.32em] text-[#F7F4EF]">HEEM</Link>
      </div>

      <section className="flex flex-col px-6 py-10 sm:px-12 md:min-h-svh md:py-12 lg:px-20">
        <Link to="/" className="hidden font-display text-2xl tracking-[0.32em] text-[#F7F4EF] md:block">HEEM</Link>
        <div className="mx-auto w-full max-w-md md:my-auto md:mx-0 md:py-12">
          <h1 className="font-display text-4xl leading-tight md:text-5xl">{title}</h1>
          {subtitle && <p className="mt-3 text-[#A5A29D]">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-sm text-[#A5A29D]">{footer}</div>}
        </div>
        <p className="mt-10 text-xs text-[#6f6c68] md:mt-0">
          By continuing you agree to our <Link to="/terms" className="underline hover:text-[#F7F4EF]">Terms of Service</Link> and <Link to="/privacy" className="underline hover:text-[#F7F4EF]">Privacy Policy</Link>.
        </p>
      </section>

      {/* Desktop: full-height campaign photo */}
      <aside className="relative hidden md:block">
        <Photo src={image} />
        <p className="absolute bottom-10 left-10 font-display text-3xl italic text-[#F7F4EF]">Wear your identity.</p>
      </aside>
    </div>
  )
}

export function Field({ label, error, children, htmlFor }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#A5A29D]">{label}</label>
      {children}
      {error && <p className="mt-2 text-sm text-[#e0a39a]" role="alert">{error}</p>}
    </div>
  )
}

export function PasswordInput({ id, value, onChange, autoComplete, placeholder }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input id={id} type={show ? 'text' : 'password'} value={value} onChange={onChange}
        autoComplete={autoComplete} placeholder={placeholder} className={`${inputCls} pr-16`} />
      <button type="button" onClick={() => setShow(!show)} aria-pressed={show}
        className="absolute inset-y-0 right-0 px-4 text-xs uppercase tracking-[0.15em] text-[#A5A29D] hover:text-[#F7F4EF]">
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}

// Weak / Fair / Good / Strong, only a hint: the backend has the final say
export function strength(pw) {
  let s = 0
  if (pw.length >= 8) s++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) s++
  return s
}

export function StrengthMeter({ password }) {
  if (!password) return null
  const s = strength(password)
  const label = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][s]
  return (
    <div className="mt-3" aria-live="polite">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={`h-0.5 flex-1 ${n <= s ? 'bg-[#F7F4EF]' : 'bg-[#353535]'}`} />
        ))}
      </div>
      <p className="mt-2 text-xs text-[#A5A29D]">Password strength: {label}</p>
    </div>
  )
}

// Google and Facebook sign-in live in their own file; imported here so Login and Signup keep their imports.
export { default as SocialButtons } from './SocialButtons.jsx'

export function Divider({ children }) {
  return (
    <div className="my-8 flex items-center gap-4 text-xs uppercase tracking-[0.2em] text-[#6f6c68]">
      <span className="h-px flex-1 bg-[#353535]" />{children}<span className="h-px flex-1 bg-[#353535]" />
    </div>
  )
}