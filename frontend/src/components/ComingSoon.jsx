import { Link } from 'react-router-dom'
import usePageMeta from '../lib/usePageMeta.js'
import useCategories from '../lib/categories.js'
import useSiteMedia from '../lib/siteMedia.js'
import { mediaUrl } from './ProductCard.jsx'

// Background photo: Admin > Site media > Coming Soon page. Without it a dark gradient is used.

export default function ComingSoon({ title, skip }) {
  usePageMeta(`${title} — Coming soon`, `${title} is coming soon to HEEM.`)
  const { list } = useCategories()
  const BG = useSiteMedia().url('coming_soon')
  // Sections that are open right now, so nobody lands on a dead end
  const open = list.filter((c) => !c.parent && c.state === 'live' && c.slug !== skip)

  return (
    <section aria-labelledby="cs-title" className="relative isolate flex min-h-[78vh] items-center justify-center overflow-hidden bg-[#1a1716] px-[5vw] py-28 text-center text-[#F7F4EF]">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_40%,#3a322c,#1a1716_70%)]" />
      {BG && <img src={BG} alt="" aria-hidden="true" onError={(e) => { e.currentTarget.style.display = 'none' }}
        className="absolute inset-0 -z-10 h-full w-full object-cover opacity-30" />}

      <div className="max-w-2xl motion-safe:animate-[fadeIn_0.8s_ease_both]">
        <p className="font-display text-sm uppercase tracking-[0.5em] pl-[0.5em] text-[#B08D57] md:text-base">Coming soon</p>
        <span aria-hidden="true" className="mx-auto mt-6 block h-px w-14 bg-[#B08D57]" />
        <h1 id="cs-title" className="mt-8 font-display text-5xl uppercase leading-[1.05] md:text-7xl">{title}</h1>
        <p className="mt-6 text-lg font-light tracking-wide text-[#F7F4EF]/75 md:text-xl">Something beautiful is on its way.</p>

        <Link to="/collections"
          className="mt-12 inline-block border border-[#B08D57] px-8 py-3.5 text-sm uppercase tracking-[0.2em] text-[#F7F4EF] transition-colors hover:bg-[#B08D57] hover:text-[#1a1716] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B08D57]">
          Explore available collections
        </Link>

        {open.length > 0 && (
          <div className="mt-14">
            <p className="text-xs uppercase tracking-[0.3em] text-[#F7F4EF]/50">Available now</p>
            <ul className="mt-4 flex flex-wrap justify-center gap-x-8 gap-y-2">
              {open.map((c) => (
                <li key={c.slug}>
                  <Link to={`/${c.slug}`} className="border-b border-transparent pb-0.5 font-display text-lg transition-colors hover:border-[#B08D57] hover:text-[#B08D57]">{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}