import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import EditorialHero from '../components/editorial/EditorialHero.jsx'
import Accordion from '../components/editorial/Accordion.jsx'
import usePageMeta from '../lib/usePageMeta.js'
import { usePolicy } from '../lib/policy.js'
import { buildFaq, FAQ_CATEGORIES } from '../data/faq.js'

const chip = (on) =>
  `border px-4 py-2 text-sm transition-colors ${on ? 'border-[#1a1716] bg-[#1a1716] text-[#F7F4EF]' : 'border-[#1a1716]/20 hover:border-[#1a1716]'}`

export default function FAQ() {
  usePageMeta('FAQ', 'Answers about ordering, payment, delivery, returns, sizing and your HEEM account.')
  const policy = usePolicy()
  const all = useMemo(() => buildFaq(policy), [policy])
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('All')

  const needle = query.trim().toLowerCase()
  const shown = useMemo(() => all.filter((i) =>
    (cat === 'All' || i.cat === cat) && (!needle || `${i.q} ${i.a.join(' ')}`.toLowerCase().includes(needle))), [all, cat, needle])
  const groups = FAQ_CATEGORIES.map((c) => [c, shown.filter((i) => i.cat === c)]).filter(([, list]) => list.length)

  const toItems = (list) => list.map((i) => ({
    id: i.id,
    title: i.q,
    content: (
      <>
        {i.a.map((p) => <p key={p}>{p}</p>)}
        {i.link && <p><Link to={i.link.to} className="text-[#1a1716] underline underline-offset-4 hover:text-[#B08D57]">{i.link.label}</Link></p>}
      </>
    ),
  }))

  return (
    <>
      <EditorialHero size="compact" eyebrow="CLIENT SERVICES" title="Frequently Asked Questions"
        intro="Quick answers about ordering, payment, delivery and more." />

      <section className="px-[2.5vw] py-16 md:py-24">
        <div className="max-w-xl">
          <label htmlFor="faq-search" className="text-xs uppercase tracking-[0.25em] text-neutral-500">Search the questions</label>
          <input id="faq-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off"
            placeholder="e.g. delivery, size, bKash"
            className="mt-3 w-full border-b border-[#1a1716]/30 bg-transparent py-3 text-lg outline-none transition-colors placeholder:text-neutral-400 focus:border-[#1a1716]" />
        </div>

        <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter by topic">
          {['All', ...FAQ_CATEGORIES].map((c) => (
            <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)} className={chip(cat === c)}>{c}</button>
          ))}
        </div>

        <p role="status" className="mt-8 min-h-6 text-sm text-neutral-500">
          {shown.length === 0 ? '' : `${shown.length} ${shown.length === 1 ? 'question' : 'questions'}`}
        </p>

        {groups.length === 0 ? (
          <div className="mt-6 max-w-xl border border-[#1a1716]/15 p-8">
            <h2 className="font-display text-2xl">No questions match your search</h2>
            <p className="mt-3 text-neutral-600">Try a different word, or ask us directly.</p>
            <div className="mt-6 flex flex-wrap items-center gap-6">
              <button type="button" onClick={() => { setQuery(''); setCat('All') }} className="text-sm underline underline-offset-4 hover:text-[#B08D57]">Clear search</button>
              <Link to="/contact" className="text-sm underline underline-offset-4 hover:text-[#B08D57]">Contact us</Link>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-14">
            {groups.map(([c, list]) => (
              <section key={c} aria-labelledby={`faq-${c}`}>
                <h2 id={`faq-${c}`} className="mb-4 font-display text-2xl md:text-3xl">{c}</h2>
                <Accordion items={toItems(list)} />
              </section>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="faq-help" className="bg-[#1a1716] px-[2.5vw] py-20 text-center text-[#F7F4EF] md:py-28">
        <h2 id="faq-help" className="font-display text-3xl md:text-5xl">Still need help?</h2>
        <p className="mx-auto mt-5 max-w-md text-white/70">Our team is happy to help with anything not covered here.</p>
        <Link to="/contact"
          className="mt-10 inline-block border border-white/70 px-8 py-3.5 text-sm uppercase tracking-[0.2em] transition-colors hover:bg-white hover:text-[#1a1716] focus-visible:bg-white focus-visible:text-[#1a1716]">
          CONTACT US
        </Link>
      </section>
    </>
  )
}