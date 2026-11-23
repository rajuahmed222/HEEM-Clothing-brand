import { Frame, Reveal, pad } from './parts.jsx'

// Asymmetric magazine grid. 2 columns on phones (full-width frames mixed with pairs),
// 12 columns from `md` up with offsets and staggered heights. One entry per GALLERY item, same order.
const LAYOUT = [
  { wrap: 'col-span-2 md:col-span-5', ratio: 'aspect-[4/5]', pos: 'object-top' },
  { wrap: 'col-span-2 md:col-span-6 md:col-start-7 md:self-end', ratio: 'aspect-[4/3] md:aspect-[3/2]', pos: 'object-center' },
  { wrap: 'col-span-1 md:col-span-3 md:col-start-2 md:mt-28', ratio: 'aspect-[3/4]', pos: 'object-top' },
  { wrap: 'col-span-1 mt-14 md:mt-0 md:col-span-3 md:self-center', ratio: 'aspect-[3/4] md:aspect-square', pos: 'object-center' },
  { wrap: 'col-span-2 md:col-span-5 md:col-start-8', ratio: 'aspect-[4/5]', pos: 'object-top' },
  { wrap: 'col-span-2 md:col-span-6 md:col-start-7', ratio: 'aspect-[4/3] md:aspect-[3/2]', pos: 'object-center' },
  { wrap: 'col-span-1 md:col-span-4 md:col-start-2', ratio: 'aspect-[3/4]', pos: 'object-top' },
  { wrap: 'col-span-1 mt-14 md:mt-0 md:col-span-3 md:col-start-8 md:self-end', ratio: 'aspect-[3/4] md:aspect-square', pos: 'object-center' },
]
const QUOTE_AFTER = 4 // the pull quote sits after the 5th frame

function Figure({ item, n, layout, src, delay }) {
  return (
    <Reveal as="figure" delay={delay} className={`group ${layout.wrap}`}>
      <Frame src={src} alt={item.alt} ratio={layout.ratio} pos={layout.pos} tone={n} />
      <figcaption className="mt-3 flex justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-neutral-500 md:text-[11px]">
        <span>{String(n + 1).padStart(2, '0')} — {item.view}</span>
        <span className="text-neutral-400">{item.who}</span>
      </figcaption>
    </Reveal>
  )
}

export default function Gallery({ items, quote, srcFor }) {
  const out = []
  items.forEach((item, n) => {
    const layout = LAYOUT[n % LAYOUT.length]
    out.push(<Figure key={item.key} item={item} n={n} layout={layout} src={srcFor(item.key, n)} delay={n % 2 ? 120 : 0} />)
    if (n === QUOTE_AFTER) {
      out.push(
        <Reveal key="quote" className="col-span-2 py-8 md:col-span-5 md:col-start-2 md:self-center md:py-0">
          <blockquote>
            <p className="font-display text-3xl italic leading-tight md:text-5xl">“{quote.text}”</p>
            <footer className="mt-6 text-[11px] uppercase tracking-[0.3em] text-[#B08D57]">{quote.by}</footer>
          </blockquote>
        </Reveal>
      )
    }
  })
  return (
    <section id="gallery" aria-label="Campaign gallery" className={`${pad} pb-24 md:pb-44`}>
      <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-12 md:gap-x-6 md:gap-y-24">{out}</div>
    </section>
  )
}