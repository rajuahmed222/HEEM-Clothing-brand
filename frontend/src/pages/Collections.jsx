import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import EditorialHero from '../components/editorial/EditorialHero.jsx'
import Reveal from '../components/editorial/Reveal.jsx'
import { Img } from '../components/ProductCard.jsx'
import { request } from '../Api.jsx'
import usePageMeta from '../lib/usePageMeta.js'

const DEPARTMENTS = [['Men', '/men'], ['Women', '/women'], ['Kids', '/kids'], ['Lifestyle', '/lifestyle']]

export default function Collections() {
  usePageMeta('Collections', 'Explore the HEEM collections, each a considered edit of pieces made to work together.')
  const [list, setList] = useState(null) // null = loading
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let live = true
    setError(false)
    request('collections/', { auth: false })
      .then((d) => { if (live) setList(d) })
      .catch(() => { if (live) setError(true) })
    return () => { live = false }
  }, [attempt])

  return (
    <>
      <EditorialHero eyebrow="THE EDITS" title="Collections by HEEM"
        intro="Each collection is a considered edit of pieces designed to work together." />

      <section aria-labelledby="coll-title" className="px-[2.5vw] py-16 md:py-24">
        <h2 id="coll-title" className="sr-only">All collections</h2>

        {error ? (
          <div className="py-16 text-center">
            <p className="text-neutral-600">We could not load the collections.</p>
            <button type="button" onClick={() => setAttempt((a) => a + 1)} className="mt-6 border-b border-current pb-1 text-sm uppercase tracking-[0.18em] hover:text-[#B08D57]">Try again</button>
          </div>
        ) : list === null ? (
          <div aria-busy="true" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="aspect-[4/5] animate-pulse bg-[#1a1716]/[0.06]" />)}
          </div>
        ) : list.length === 0 ? (
          <p className="py-16 text-center text-neutral-600">New collections are on their way. In the meantime, explore everything that is new.</p>
        ) : (
          <ul className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c, i) => (
              <li key={c.slug}>
                <Reveal delay={(i % 3) * 100}>
                  <Link to={`/collections/${c.slug}`} className="group block" aria-label={`${c.name}, explore collection`}>
                    <div className="aspect-[4/5] overflow-hidden bg-[#1a1716]/[0.05]">
                      <div className="h-full w-full transition-transform duration-[1200ms] ease-out group-hover:scale-105 motion-reduce:transition-none">
                        <Img src={c.cover} alt="" i={i} />
                      </div>
                    </div>
                    <h3 className="mt-5 font-display text-2xl md:text-3xl">{c.name}</h3>
                    <p className="mt-1 text-sm text-neutral-500">{c.count} {c.count === 1 ? 'piece' : 'pieces'}</p>
                    <span className="mt-4 inline-block border-b border-current pb-1 text-sm uppercase tracking-[0.18em] transition-colors group-hover:text-[#B08D57]">Explore collection</span>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="dept-title" className="border-t border-[#1a1716]/15 px-[2.5vw] py-16 md:py-24">
        <h2 id="dept-title" className="font-display text-3xl md:text-4xl">Shop by department</h2>
        <ul className="mt-8 flex flex-wrap gap-3">
          {DEPARTMENTS.map(([label, to]) => (
            <li key={to}><Link to={to} className="inline-block border border-[#1a1716]/20 px-6 py-3 text-sm uppercase tracking-[0.18em] transition-colors hover:border-[#1a1716]">{label}</Link></li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="coll-cta" className="bg-[#1a1716] px-[2.5vw] py-24 text-center text-[#F7F4EF] md:py-32">
        <h2 id="coll-cta" className="font-display text-3xl md:text-5xl">Start with what is new.</h2>
        <Link to="/new" className="mt-10 inline-block border border-white/70 px-8 py-3.5 text-sm uppercase tracking-[0.2em] transition-colors hover:bg-white hover:text-[#1a1716] focus-visible:bg-white focus-visible:text-[#1a1716]">
          SHOP NEW ARRIVALS
        </Link>
      </section>
    </>
  )
}