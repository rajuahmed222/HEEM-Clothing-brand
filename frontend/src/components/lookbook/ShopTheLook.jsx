import { Link } from 'react-router-dom'
import { formatPrice } from '../../Api.jsx'
import { mediaUrl } from '../ProductCard.jsx'
import { Eyebrow, Frame, Reveal, pad } from './parts.jsx'

const photo = (p) => mediaUrl(p?.images?.[0]?.image) || ''

// Three products per look, taken from the real catalogue (never copied). Named picks first, then real products fill the rest.
export function pick(look, index, products) {
  const bySlug = new Map(products.map((p) => [p.slug, p]))
  const chosen = look.picks.map((s) => bySlug.get(s)).filter(Boolean)
  if (chosen.length >= 3 || !products.length) return chosen
  const rest = products.filter((p) => !chosen.includes(p))
  const start = rest.length ? (index * 3) % rest.length : 0
  return [...chosen, ...rest.slice(start), ...rest.slice(0, start)].slice(0, 3)
}

function ProductRow({ p }) {
  const src = photo(p)
  return (
    <li>
      <Link to={`/product/${p.slug}`} className="group flex items-center gap-5 border-t border-white/15 py-5 transition-colors hover:border-[#B08D57]/60 md:gap-7 md:py-6">
        <div className="h-24 w-[4.5rem] shrink-0 overflow-hidden bg-[#121110] md:h-28 md:w-20">
          {src && <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover object-top transition-transform duration-[1200ms] group-hover:scale-105" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-xl md:text-2xl">{p.name}</p>
          <p className="mt-1 text-sm text-neutral-400">{formatPrice(p.price)}</p>
        </div>
        <span className="hidden shrink-0 border-b border-transparent pb-0.5 text-[11px] uppercase tracking-[0.25em] text-white/80 transition-colors group-hover:border-[#B08D57] group-hover:text-[#B08D57] sm:block">View product</span>
        <span className="text-[#B08D57] sm:hidden" aria-hidden="true">→</span>
      </Link>
    </li>
  )
}

export default function ShopTheLook({ looks, products, srcFor }) {
  return (
    <section aria-labelledby="stl-title" className={`${pad} border-t border-white/10 py-24 md:py-40`}>
      <Reveal className="mb-16 md:mb-28">
        <Eyebrow>Shop the look</Eyebrow>
        <h2 id="stl-title" className="mt-8 font-display text-[clamp(2.4rem,7vw,6rem)] uppercase leading-none">Worn together</h2>
      </Reveal>

      <div className="space-y-24 md:space-y-40">
        {looks.map((look, i) => {
          const items = pick(look, i, products)
          const flip = i % 2 === 1
          return (
            <article key={look.key} className="grid items-start gap-10 md:grid-cols-12 md:gap-8">
              <Reveal className={`group md:sticky md:top-24 md:col-span-6 ${flip ? 'md:order-2 md:col-start-7' : ''}`}>
                <Frame src={srcFor(look.key, items[0], i)} alt={`Look ${look.no}: ${look.title}`} ratio="aspect-[4/5] md:aspect-[3/4]" pos="object-top" tone={i} />
              </Reveal>
              <div className={`md:col-span-5 md:self-center ${flip ? 'md:order-1 md:col-start-1' : 'md:col-start-8'}`}>
                <Reveal>
                  <p className="font-display text-6xl italic text-[#B08D57]/80 md:text-8xl">{look.no}</p>
                  <h3 className="mt-4 font-display text-3xl uppercase md:text-5xl">{look.title}</h3>
                  <p className="mt-4 max-w-sm text-base leading-relaxed text-neutral-400">{look.note}</p>
                </Reveal>
                {items.length > 0 && (
                  <Reveal delay={150}>
                    <ul className="mt-10 border-b border-white/15">{items.map((p) => <ProductRow key={p.id ?? p.slug} p={p} />)}</ul>
                  </Reveal>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}