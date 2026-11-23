import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import EditorialHero from '../components/editorial/EditorialHero.jsx'
import { request } from '../Api.jsx'
import usePageMeta from '../lib/usePageMeta.js'

const chip = (on) =>
  `border px-4 py-2 text-sm transition-colors ${on ? 'border-[#1a1716] bg-[#1a1716] text-[#F7F4EF]' : 'border-[#1a1716]/20 hover:border-[#1a1716]'}`

const HOW = [
  ['Chest', 'Measure around the fullest part of your chest, keeping the tape level under your arms.'],
  ['Waist', 'Measure around your natural waistline, the narrowest part of your torso.'],
  ['Hip', 'Measure around the fullest part of your hips.'],
  ['Shoulder', 'Measure straight across the back from one shoulder edge to the other.'],
]

// Converts every number inside a chart value ("38-40", "72") between inches and centimetres
function convert(text, from, to) {
  if (!text || from === to) return text
  const k = from === 'in' ? 2.54 : 1 / 2.54
  return String(text).replace(/\d+(\.\d+)?/g, (n) => String(Math.round(parseFloat(n) * k * 10) / 10).replace(/\.0$/, ''))
}

function Chart({ chart, unit }) {
  const cell = (v) => convert(v, chart.unit, unit) || '-'
  return (
    <>
      {/* Tablet and up: a normal table */}
      <table className="hidden w-full border-collapse text-left md:table">
        <caption className="sr-only">{chart.title} in {unit === 'cm' ? 'centimetres' : 'inches'}</caption>
        <thead>
          <tr className="border-b border-[#1a1716]">
            <th scope="col" className="py-3 pr-6 text-xs font-medium uppercase tracking-[0.2em]">Size</th>
            {chart.columns.map((c) => <th key={c.key} scope="col" className="py-3 pr-6 text-xs font-medium uppercase tracking-[0.2em]">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {chart.rows.map((r) => (
            <tr key={r.size} className="border-b border-[#1a1716]/15">
              <th scope="row" className="py-4 pr-6 font-display text-xl">{r.size}</th>
              {chart.columns.map((c) => <td key={c.key} className="py-4 pr-6 text-neutral-700">{cell(r[c.key])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Phones: one card per size, so nothing ever scrolls sideways */}
      <ul className="divide-y divide-[#1a1716]/15 border-y border-[#1a1716]/15 md:hidden">
        {chart.rows.map((r) => (
          <li key={r.size} className="py-5">
            <p className="font-display text-2xl">{r.size}</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {chart.columns.map((c) => (
                <div key={c.key} className="flex justify-between gap-3 border-b border-[#1a1716]/10 pb-1">
                  <dt className="text-neutral-500">{c.label}</dt><dd>{cell(r[c.key])}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  )
}

export default function SizeGuide() {
  usePageMeta('Size Guide', 'Find your perfect fit with the HEEM size guide: measurement tips and size charts by department and garment.')
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading') // loading | ok | error
  const [attempt, setAttempt] = useState(0)
  const [parentSlug, setParentSlug] = useState(null)
  const [childSlug, setChildSlug] = useState('')
  const [unit, setUnit] = useState('cm')

  useEffect(() => {
    let live = true
    setState('loading')
    request('size-guide/', { auth: false })
      .then((d) => { if (live) { setData(d); setParentSlug(d[0]?.slug || null); setState('ok') } })
      .catch(() => { if (live) setState('error') })
    return () => { live = false }
  }, [attempt])

  const parent = useMemo(() => data?.find((p) => p.slug === parentSlug), [data, parentSlug])

  // When the department changes, start on its own chart, or on its first garment that has one
  useEffect(() => {
    if (!parent) return
    setChildSlug(parent.chart ? '' : (parent.children.find((c) => c.chart)?.slug || ''))
  }, [parent])

  const child = parent?.children.find((c) => c.slug === childSlug)
  const chart = child ? child.chart : parent?.chart
  const shopTo = !parent ? '/new' : child ? `/${parent.slug}?sub=${child.slug}` : `/${parent.slug}`

  return (
    <>
      <EditorialHero size="compact" eyebrow="CLIENT SERVICES" title="Find Your Perfect Fit"
        intro="Choose a department and garment to see its measurements." />

      <div className="px-[2.5vw] py-16 md:py-24">
        {state === 'error' && (
          <div className="py-12 text-center">
            <p className="text-neutral-600">We could not load the size guide.</p>
            <button type="button" onClick={() => setAttempt((a) => a + 1)} className="mt-6 border-b border-current pb-1 text-sm uppercase tracking-[0.18em] hover:text-[#B08D57]">Try again</button>
          </div>
        )}
        {state === 'loading' && <div aria-busy="true" className="h-64 animate-pulse bg-[#1a1716]/[0.06]" />}

        {state === 'ok' && data.length === 0 && <p className="text-neutral-600">The size guide is being prepared.</p>}

        {state === 'ok' && data.length > 0 && (
          <div className="grid gap-16 nav:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] nav:gap-24">
            <section aria-labelledby="chart-title">
              <h2 id="chart-title" className="sr-only">Size chart</h2>

              <div role="group" aria-label="Department" className="flex flex-wrap gap-2">
                {data.map((p) => <button key={p.slug} type="button" aria-pressed={p.slug === parentSlug} onClick={() => setParentSlug(p.slug)} className={chip(p.slug === parentSlug)}>{p.name}</button>)}
              </div>

              {parent && (parent.children.length > 0) && (
                <div role="group" aria-label="Garment" className="mt-4 flex flex-wrap gap-2">
                  {parent.chart && <button type="button" aria-pressed={!childSlug} onClick={() => setChildSlug('')} className={chip(!childSlug)}>All</button>}
                  {parent.children.map((c) => <button key={c.slug} type="button" aria-pressed={c.slug === childSlug} onClick={() => setChildSlug(c.slug)} className={chip(c.slug === childSlug)}>{c.name}</button>)}
                </div>
              )}

              <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
                <h3 className="font-display text-3xl md:text-4xl">{chart?.title || 'Size chart'}</h3>
                {chart && (
                  <div role="group" aria-label="Unit" className="flex gap-2">
                    {['cm', 'in'].map((u) => <button key={u} type="button" aria-pressed={unit === u} onClick={() => setUnit(u)} className={chip(unit === u)}>{u === 'cm' ? 'cm' : 'inches'}</button>)}
                  </div>
                )}
              </div>

              <div className="mt-6">
                {chart ? (
                  <>
                    <Chart chart={chart} unit={unit} />
                    {chart.note && <p className="mt-5 text-sm text-neutral-600">{chart.note}</p>}
                  </>
                ) : (
                  <p className="border border-[#1a1716]/15 p-6 text-neutral-600">Measurements for this category are awaiting confirmation. Please check the product page or contact us.</p>
                )}
              </div>

              <p className="mt-6 text-sm text-neutral-500">Measurements are a guide and may vary slightly between pieces. If you are between two sizes, check the intended fit on the product page.</p>

              <Link to={shopTo} className="mt-8 inline-block bg-[#1a1716] px-8 py-3.5 text-sm uppercase tracking-[0.2em] text-[#F7F4EF] transition-colors hover:bg-[#B08D57] focus-visible:bg-[#B08D57]">
                SHOP {(child?.name || parent?.name || 'NEW').toUpperCase()}
              </Link>
            </section>

            <aside aria-labelledby="how-title" className="space-y-10">
              <div>
                <h2 id="how-title" className="font-display text-2xl md:text-3xl">How to measure</h2>
                <dl className="mt-6 space-y-5">
                  {HOW.map(([t, d]) => (
                    <div key={t}><dt className="text-xs font-medium uppercase tracking-[0.2em]">{t}</dt><dd className="mt-1 text-[0.95rem] leading-relaxed text-neutral-600">{d}</dd></div>
                  ))}
                </dl>
              </div>
              <div>
                <h2 className="font-display text-2xl md:text-3xl">Body or garment?</h2>
                <p className="mt-4 text-[0.95rem] leading-relaxed text-neutral-600">Body measurements are taken on you. Garment measurements are taken on the piece itself, laid flat. A note under each chart tells you which one it shows.</p>
              </div>
              <p className="text-sm text-neutral-500">Need help choosing? <Link to="/contact" className="underline underline-offset-4 hover:text-[#B08D57]">Contact us</Link>.</p>
            </aside>
          </div>
        )}
      </div>
    </>
  )
}