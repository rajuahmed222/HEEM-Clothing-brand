import { Link } from 'react-router-dom'

const SIZES = { tall: 'min-h-[88svh]', default: 'min-h-[64svh]', compact: 'min-h-[42svh]' }

const btn =
  'mt-10 inline-block border border-white/70 px-8 py-3.5 text-sm uppercase tracking-[0.2em] text-white transition-colors ' +
  'hover:bg-white hover:text-[#1a1716] focus-visible:bg-white focus-visible:text-[#1a1716] motion-reduce:transition-none'

// Dark editorial header. `image` is optional: without a photo it shows a quiet tonal background.
// cta: { label, to } goes to a page, { label, target } scrolls to the element with that id.
export default function EditorialHero({ eyebrow, title, intro, image, imageAlt = '', cta, size = 'default' }) {
  const scroll = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(cta.target)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <header className={`relative isolate flex items-end overflow-hidden bg-[#1a1716] text-white ${SIZES[size] || SIZES.default}`}>
      {image
        ? <img src={image} alt={imageAlt} className="absolute inset-0 -z-20 h-full w-full object-cover" />
        : <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[linear-gradient(160deg,#3b3633,#141211)]" />}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />

      <div className="hero-in w-full px-[2.5vw] pb-14 pt-24 md:pb-20">
        {eyebrow && <p className="text-xs uppercase tracking-[0.35em] text-white/70">{eyebrow}</p>}
        <h1 className="mt-5 max-w-4xl break-words font-display text-5xl leading-[1.02] md:text-7xl lg:text-8xl">{title}</h1>
        {intro && <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">{intro}</p>}
        {cta?.to && <Link to={cta.to} className={btn}>{cta.label}</Link>}
        {cta?.target && <button type="button" onClick={scroll} className={btn}>{cta.label}</button>}
      </div>

      {cta?.target && (
        <span aria-hidden="true" className="absolute bottom-8 right-[2.5vw] hidden h-16 w-px bg-white/50 motion-safe:animate-pulse md:block" />
      )}
    </header>
  )
}