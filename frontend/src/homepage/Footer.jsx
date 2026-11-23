import { useState } from 'react'
import { Link } from 'react-router-dom'

// Add the real links in frontend/.env (VITE_INSTAGRAM_URL=https://...). A network without a URL still shows in the
// footer, but as plain text, so there is never a dead link.
const SOCIAL = [
  ['Instagram', import.meta.env.VITE_INSTAGRAM_URL],
  ['Facebook', import.meta.env.VITE_FACEBOOK_URL],
  ['TikTok', import.meta.env.VITE_TIKTOK_URL],
  ['Pinterest', import.meta.env.VITE_PINTEREST_URL],
].map(([label, href]) => ({ label, href: href || '' }))

const COLS = [
  ['Shop', [
    { label: 'New Arrivals', to: '/new' },
    { label: 'Men', to: '/men' },
    { label: 'Women', to: '/women' },
    { label: 'Kids', to: '/kids' },
    { label: 'Lifestyle', to: '/lifestyle' },
    { label: 'Sale', to: '/sale' },
  ]],
  ['Discover', [
    { label: 'Our Story', to: '/our-story' },
    { label: 'Collections', to: '/collections' },
    { label: 'Lookbook', to: '/lookbook' },
    { label: 'The HEEM Standard', to: '/heem-standard' },
  ]],
  ['Client Services', [
    { label: 'Contact Us', to: '/contact' },
    { label: 'Shipping & Delivery', to: '/shipping-delivery' },
    { label: 'Returns & Exchange', to: '/returns-exchange' },
    { label: 'Size Guide', to: '/size-guide' },
    { label: 'FAQ', to: '/faq' },
  ]],
  ['Follow', SOCIAL],
]

// Soft white link with a thin underline that draws left to right on hover
const lk =
  'relative inline-block text-[0.95rem] text-white/60 transition-[color,transform] duration-300 hover:translate-x-0.5 hover:text-white focus-visible:text-white ' +
  'after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-white after:transition-transform after:duration-300 hover:after:scale-x-100 focus-visible:after:scale-x-100 motion-reduce:transition-none'

const head = 'text-xs font-medium uppercase tracking-[0.25em] text-white'

function FooterLink({ item }) {
  if (item.label && 'href' in item && !item.href) {
    return <span className="inline-block text-[0.95rem] text-white/35">{item.label}</span>
  }
  if (item.href) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={lk}>
        {item.label}<span className="sr-only"> (opens in a new tab)</span>
      </a>
    )
  }
  return <Link to={item.to} className={lk}>{item.label}</Link>
}

function Column({ title, items }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-white/15 sm:border-0">
      {/* Mobile: accordion button. Tablet and up: plain heading. */}
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}
        className={`${head} flex w-full items-center justify-between py-5 sm:hidden`}>
        {title}<span aria-hidden="true" className="text-base">{open ? '−' : '+'}</span>
      </button>
      <p className={`${head} mb-5 hidden sm:block`}>{title}</p>
      <div className={`grid transition-[grid-template-rows] duration-300 motion-reduce:transition-none sm:grid-rows-[1fr] ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <ul className="space-y-3 overflow-hidden pl-px max-sm:[&>li:last-child]:mb-5">
          {items.map((i) => <li key={i.label}><FooterLink item={i} /></li>)}
        </ul>
      </div>
    </div>
  )
}

export default function Footer() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const join = () => setMsg(/^\S+@\S+\.\S+$/.test(email.trim()) ? 'Welcome to the world of HEEM.' : 'Enter a valid email address.')

  return (
    <footer className="overflow-hidden bg-[#0a0a0a] px-[2.5vw] text-white">
      {/* Brand */}
      <div className="py-16 text-center md:py-24">
        <p className="font-display text-5xl font-normal tracking-[0.35em] pl-[0.35em] md:text-6xl">HEEM</p>
        <p className="mt-5 text-xs uppercase tracking-[0.4em] pl-[0.4em] text-white/60">Wear your identity.</p>
      </div>

      {/* Newsletter */}
      <div className="border-t border-white/10 py-16 text-center md:py-24">
        <h2 className="font-display text-3xl uppercase tracking-[0.12em] md:text-5xl">Enter the world of HEEM</h2>
        <p className="mx-auto mt-5 max-w-md text-white/60">Be the first to discover new collections, exclusive releases and HEEM stories.</p>
        <div className="group mx-auto mt-10 flex max-w-lg items-center border-b border-white/30 transition-colors duration-300 focus-within:border-white hover:border-white">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="YOUR EMAIL ADDRESS" aria-label="Your email address"
            className="min-w-0 flex-1 bg-transparent py-4 text-sm uppercase tracking-[0.18em] outline-none placeholder:text-white/40" />
          <button type="button" onClick={join}
            className="flex items-center gap-2 py-4 pl-4 text-sm uppercase tracking-[0.2em] text-white/80 transition-all duration-300 hover:translate-x-0.5 hover:text-white motion-reduce:transition-none">
            Join <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </button>
        </div>
        <p className="mt-4 min-h-6 text-sm text-[#c9b48a]" role="status">{msg}</p>
      </div>

      {/* Navigation */}
      <nav aria-label="Footer" className="border-t border-white/10 py-12 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-x-10 gap-y-12 sm:grid-cols-2 max-sm:gap-y-0 lg:grid-cols-4">
          {COLS.map(([t, items]) => <Column key={t} title={t} items={items} />)}
        </div>
      </nav>

      {/* Bottom bar */}
      <div className="grid gap-4 border-t border-white/10 py-8 text-xs tracking-wide text-white/50 sm:grid-cols-3 sm:items-center">
        <p>© 2026 HEEM</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center sm:gap-8">
          <Link to="/privacy" className="transition-colors hover:text-white">Privacy Policy</Link>
          <Link to="/terms" className="transition-colors hover:text-white">Terms &amp; Conditions</Link>
        </div>
        <p className="sm:text-right">BANGLADESH / BDT</p>
      </div>

      {/* Signature */}
      <p aria-hidden="true" className="mt-10 select-none whitespace-nowrap text-center font-display text-[28vw] font-normal leading-[0.8] tracking-[0.02em] text-white/[0.06]">
        HEEM
      </p>
    </footer>
  )
}