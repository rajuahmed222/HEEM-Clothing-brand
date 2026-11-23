import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getProducts, request } from "../Api.jsx"
import ProductCard from '../components/ProductCard.jsx'
import ComingSoon from '../components/ComingSoon.jsx'
import useCategories from '../lib/categories.js'

const TITLES = { men: 'Men', women: 'Women', kids: 'Kids', lifestyle: 'Lifestyle', new: 'New arrivals', sale: 'Sale' }
const PARENTS = ['men', 'women', 'kids', 'lifestyle']

export default function Collection() {
  const { section } = useParams()
  const rawSub = useSearchParams()[0].get('sub')
  const title = TITLES[section]
  const { list, bySlug, ready } = useCategories()
  const sub = rawSub && bySlug[rawSub] ? rawSub : '' // a link to a category that was deleted just shows the section

  // Is this page open? Admin controls it per category (see Admin > Categories).
  const target = bySlug[sub] || bySlug[section]
  const parentCat = bySlug[sub]?.parent ? bySlug[bySlug[sub].parent] : null
  const gated = PARENTS.includes(section) && [parentCat, target].some((x) => x && x.state !== 'live')
  const subs = PARENTS.includes(section) ? list.filter((x) => x.parent === section && x.state === 'live') : []

  // The answer is stored together with the page it belongs to, so a slow answer for an old page is never shown on a new one
  const pageKey = `${section}|${sub}`
  const [res, setRes] = useState({ key: '', list: null, error: false })
  const products = res.key === pageKey ? res.list : null // null = loading
  const error = res.key === pageKey && res.error

  useEffect(() => { window.scrollTo(0, 0) }, [section])

  useEffect(() => {
    if (!title || section === 'sale' || !ready || gated) return
    let live = true
    // New uses the "new" flag; every other page lists whatever the admin placed in that menu item (or section)
    const load = section === 'new' ? getProducts('?new=true') : request(`admin/shelf/?item=${encodeURIComponent(sub || section)}`, { auth: false })
    load.then((list) => live && setRes({ key: pageKey, list, error: false }))
      .catch(() => live && setRes({ key: pageKey, list: null, error: true }))
    return () => { live = false }
  }, [section, sub, title, ready, gated, pageKey])

  if (!title) return <p className="px-[2.5vw] py-32 text-neutral-600">Page not found. <Link to="/" className="underline">Back home</Link></p>

  // Nothing to show yet: a proper Coming Soon page instead of an empty grid
  const soonName = sub && bySlug[sub] ? bySlug[sub].name : title
  if (section === 'sale') return <ComingSoon title="Sale" skip="sale" />
  if (PARENTS.includes(section) && !ready) return <p className="px-[2.5vw] py-32 text-neutral-600">Loading…</p>
  if (gated) return <ComingSoon title={soonName} skip={section} />
  if (products && products.length === 0 && !error) return <ComingSoon title={soonName} skip={section} />

  const chip = (active) => `border px-4 py-2 text-sm transition-colors ${active ? 'border-[#1a1716] bg-[#1a1716] text-[#F7F4EF]' : 'border-[#1a1716]/20 hover:border-[#1a1716]'}`

  return (
    <section className="px-[2.5vw] py-12 md:py-20">
      <h1 className="font-display text-5xl uppercase md:text-7xl">{title}</h1>

      {subs.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          <Link to={`/${section}`} className={chip(!sub)}>All</Link>
          {subs.map((s) => (
            <Link key={s.slug} to={`/${section}?sub=${s.slug}`} className={chip(sub === s.slug)}>{s.name}</Link>
          ))}
        </div>
      )}

      <div className="mt-12">
        {error ? <p className="text-neutral-600">Could not load products. Is the backend running?</p>
          : products === null ? <p className="text-neutral-600">Loading…</p>
          : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
              {products.map((p, i) => <ProductCard key={p.id} p={p} i={i} showQuickAdd />)}
            </div>
          )}
      </div>
    </section>
  )
}