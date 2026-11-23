import { Link } from 'react-router-dom'
import { Eyebrow, Frame, Reveal, pad } from './parts.jsx'

// Current and past campaigns. Quiet hover: slow zoom and a gold line.
export default function Campaigns({ items, srcFor }) {
  return (
    <section aria-labelledby="camp-title" className={`${pad} border-t border-white/10 py-24 md:py-40`}>
      <Reveal className="mb-14 flex flex-col gap-6 md:mb-24 md:flex-row md:items-end md:justify-between">
        <div>
          <Eyebrow>Campaigns</Eyebrow>
          <h2 id="camp-title" className="mt-8 font-display text-[clamp(2.4rem,7vw,6rem)] uppercase leading-none">The archive</h2>
        </div>
        <p className="max-w-xs text-sm leading-relaxed text-neutral-400">Every season, one idea. Revisit where HEEM has been.</p>
      </Reveal>

      <div className="grid grid-cols-2 gap-x-3 gap-y-12 md:grid-cols-4 md:gap-x-6">
        {items.map((c, i) => (
          <Reveal key={c.key} delay={(i % 4) * 100} className={i % 2 ? 'mt-10 md:mt-20' : ''}>
            <Link to={c.to} className="group block">
              <div className="relative">
                <Frame src={srcFor(c.key, i)} alt={`${c.title}, ${c.season} ${c.year}`} ratio="aspect-[4/5]" pos="object-top" tone={i} />
                {c.current && <span className="absolute left-3 top-3 bg-[#B08D57] px-2.5 py-1 text-[10px] uppercase tracking-[0.25em] text-[#080808]">Now</span>}
              </div>
              <h3 className="mt-5 font-display text-2xl uppercase md:text-3xl">{c.title}</h3>
              <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-neutral-500">{c.season} · {c.year}</p>
              <span className="mt-4 block h-px w-8 bg-[#B08D57] transition-all duration-500 group-hover:w-full" aria-hidden="true" />
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}