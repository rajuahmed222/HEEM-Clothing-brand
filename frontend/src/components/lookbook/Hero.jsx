import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { mediaUrl } from '../ProductCard.jsx'
import { Eyebrow, isVideo, pad } from './parts.jsx'

// Full-width cover. Everything eases in once on load (and not at all for people who prefer reduced motion).
export default function Hero({ campaign, src }) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 60)
    return () => clearTimeout(t)
  }, [])
  const url = mediaUrl(src)
  const line = (delay) => ({ transitionDelay: `${delay}ms` })
  const rise = `block transition-transform duration-[1400ms] ease-[cubic-bezier(.2,.7,.1,1)] motion-reduce:transition-none ${on ? 'translate-y-0' : 'translate-y-[110%] motion-reduce:translate-y-0'}`
  const fade = `transition-opacity duration-[1600ms] motion-reduce:transition-none ${on ? 'opacity-100' : 'opacity-0 motion-reduce:opacity-100'}`

  return (
    <section className="relative flex min-h-[calc(100svh-3.5rem)] items-end overflow-hidden nav:min-h-[calc(100svh-4rem)]">
      <div className={`absolute inset-0 transition-transform duration-[2800ms] ease-out motion-reduce:transition-none ${on ? 'scale-100' : 'scale-[1.12] motion-reduce:scale-100'}`}>
        {url && isVideo(url) ? (
          <video className="h-full w-full object-cover object-top" src={url} autoPlay muted loop playsInline />
        ) : url ? (
          <img className="h-full w-full object-cover object-top" src={url} alt="" fetchPriority="high" decoding="async" />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(ellipse_at_70%_30%,#3a2f22,#0d0b09_60%,#080808)]" aria-hidden="true" />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/25 to-black/30" aria-hidden="true" />

      <div className={`relative w-full ${pad} pb-10 pt-32 md:pb-16`}>
        <div className={fade} style={line(300)}><Eyebrow>Lookbook</Eyebrow></div>

        <h1 className="mt-5 font-display uppercase leading-[0.86] tracking-tight text-[clamp(3.6rem,17vw,15rem)]">
          <span className="block overflow-hidden pb-[0.06em]"><span className={rise} style={line(450)}>{campaign.name}</span></span>
        </h1>

        <div className="mt-6 flex flex-col gap-8 md:mt-10 md:flex-row md:items-end md:justify-between">
          <div className={fade} style={line(900)}>
            <p className="font-display text-xl italic text-white/90 md:text-3xl">{campaign.line}</p>
            <p className="mt-3 text-[11px] uppercase tracking-[0.32em] text-neutral-400 md:text-xs">{campaign.season} · {campaign.year}</p>
          </div>
          <div className={fade} style={line(1200)}>
            <Link to={campaign.to} className="group inline-flex items-center gap-4 text-xs uppercase tracking-[0.3em] text-white">
              Explore collection
              <span className="h-px w-12 bg-white/60 transition-all duration-500 group-hover:w-20 group-hover:bg-[#B08D57]" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}