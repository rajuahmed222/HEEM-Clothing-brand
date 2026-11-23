import { useEffect, useRef, useState } from 'react'
import { mediaUrl } from '../ProductCard.jsx'

// Shared building blocks for the Lookbook page.

export const gold = '#B08D57'
export const pad = 'px-[2.5vw]'

const tones = [
  'linear-gradient(160deg,#2a2521,#0d0c0b)',
  'linear-gradient(160deg,#3a322a,#120f0d)',
  'linear-gradient(160deg,#1c1917,#070707)',
  'linear-gradient(160deg,#4a3f33,#15110e)',
]

export const isVideo = (src) => /\.(mp4|webm)(\?|$)/i.test(src || '')

// Fades and lifts its children in once they scroll into view. Shows them at once if the browser cannot observe.
export function Reveal({ children, className = '', delay = 0, as: Tag = 'div' }) {
  const ref = useRef(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) { setOn(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect() } }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <Tag ref={ref} style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-[1200ms] ease-out motion-reduce:transition-none ${on ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100'} ${className}`}>
      {children}
    </Tag>
  )
}

export function Eyebrow({ children, className = '' }) {
  return (
    <p className={`flex items-center gap-4 text-[11px] uppercase tracking-[0.32em] text-[#B08D57] ${className}`}>
      <span className="h-px w-10 bg-[#B08D57]" aria-hidden="true" />{children}
    </p>
  )
}

// A picture slot. No picture yet = a dark tonal block, so the layout never collapses.
// `zoom` adds a slow, quiet scale on hover of the parent `.group`.
export function Frame({ src, alt = '', ratio = 'aspect-[4/5]', pos = 'object-center', tone = 0, zoom = true, eager = false, className = '' }) {
  const url = mediaUrl(src)
  return (
    <div className={`relative overflow-hidden bg-[#121110] ${ratio} ${className}`}>
      {url ? (
        <img src={url} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" fetchPriority={eager ? 'high' : 'auto'}
          className={`absolute inset-0 h-full w-full object-cover ${pos} ${zoom ? 'transition-transform duration-[1600ms] ease-out group-hover:scale-[1.04]' : ''}`} />
      ) : (
        <div className="absolute inset-0" style={{ background: tones[tone % tones.length] }} aria-hidden="true" />
      )}
    </div>
  )
}