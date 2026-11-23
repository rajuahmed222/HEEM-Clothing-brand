// import { useEffect, useState } from 'react'
// import { Link, useSearchParams } from 'react-router-dom'
// import { searchProducts } from '../Api.jsx'
// import ProductCard from '../components/ProductCard.jsx'

// const SORTS = [
//   ['recommended', 'Recommended'], ['newest', 'Newest'], ['featured', 'Featured'],
//   ['best_selling', 'Best selling'], ['price_asc', 'Price — low to high'], ['price_desc', 'Price — high to low'],
// ]
// const MULTI = ['category', 'collection', 'size', 'color', 'season']
// const OTHER = ['min_price', 'max_price', 'availability', 'signature', 'new']
// const SEASON = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' }
// const TRY = [['Shirts', 'q=shirt'], ['Panjabi', 'q=panjabi'], ['HEEM Signature', 'collection=heem-signature'],
//   ['New Arrivals', 'new=true'], ['Winter Collection', 'collection=winter-collection']]
// const money = (n) => `৳${Math.round(Number(n)).toLocaleString('en-US')}`
// const head = 'font-display text-[1.05rem] font-semibold'
// const gridCls = 'grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4'

// function Skeleton({ n = 8 }) {
//   return (
//     <div className={gridCls} aria-hidden="true">
//       {Array.from({ length: n }, (_, i) => (
//         <div key={i}>
//           <div className="aspect-[3/4] animate-pulse bg-[#1a1716]/[0.06]" />
//           <div className="mt-4 h-3 w-3/4 animate-pulse bg-[#1a1716]/[0.06]" />
//           <div className="mt-2 h-3 w-1/4 animate-pulse bg-[#1a1716]/[0.06]" />
//         </div>
//       ))}
//     </div>
//   )
// }

// function Opt({ on, onClick, count, children }) {
//   return (
//     <button type="button" role="checkbox" aria-checked={on} onClick={onClick}
//       className="flex w-full items-center justify-between py-1.5 text-left text-[0.95rem] text-neutral-700 transition-colors hover:text-[#1a1716]">
//       <span className="flex items-center gap-3">
//         <span className={`h-3.5 w-3.5 border ${on ? 'border-[#1a1716] bg-[#1a1716]' : 'border-[#1a1716]/30'}`} />
//         <span className={on ? 'text-[#1a1716]' : ''}>{children}</span>
//       </span>
//       {count != null && <span className="text-xs text-neutral-400">{count}</span>}
//     </button>
//   )
// }

// function Group({ title, open, onToggle, children }) {
//   return (
//     <div className="border-b border-[#1a1716]/15">
//       <button type="button" aria-expanded={open} onClick={onToggle} className={`${head} flex w-full items-center justify-between py-4`}>
//         {title}<span aria-hidden="true">{open ? '−' : '+'}</span>
//       </button>
//       <div className={`grid transition-[grid-template-rows] duration-300 motion-reduce:transition-none ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
//         <div className="overflow-hidden" inert={!open}><div className="pb-5">{children}</div></div>
//       </div>
//     </div>
//   )
// }

// function PriceRange({ max, value, onCommit }) {
//   const top = Math.max(100, Math.ceil(max / 100) * 100)
//   const [v, setV] = useState(value ?? top)
//   useEffect(() => { setV(value ?? top) }, [value, top])
//   const commit = () => onCommit(v >= top ? null : v)
//   return (
//     <div>
//       <input type="range" min={0} max={top} step={100} value={v} aria-label="Maximum price"
//         onChange={(e) => setV(Number(e.target.value))} onPointerUp={commit} onKeyUp={commit}
//         className="w-full accent-[#1a1716]" />
//       <div className="mt-1 flex justify-between text-sm text-neutral-600">
//         <span>৳0</span><span>{v >= top ? `${money(top)}+` : money(v)}</span>
//       </div>
//     </div>
//   )
// }

// export default function Search() {
//   const [sp, setSp] = useSearchParams()
//   const [data, setData] = useState(null)
//   const [loading, setLoading] = useState(true)
//   const [error, setError] = useState(false)
//   const [sheet, setSheet] = useState(false)
//   const [open, setOpen] = useState({ category: true, size: true })
//   const [rec, setRec] = useState([])
//   const key = sp.toString()
//   const q = sp.get('q') || ''

//   useEffect(() => {
//     const ctl = new AbortController()
//     setLoading(true)
//     setError(false)
//     searchProducts(key, ctl.signal)
//       .then((d) => { setData(d); setLoading(false) })
//       .catch((e) => { if (e.name !== 'AbortError') { setError(true); setLoading(false) } })
//     return () => ctl.abort()
//   }, [key])

//   useEffect(() => { window.scrollTo({ top: 0 }) }, [sp.get('page')])

//   useEffect(() => {
//     document.body.style.overflow = sheet ? 'hidden' : ''
//     const onKey = (e) => e.key === 'Escape' && setSheet(false)
//     window.addEventListener('keydown', onKey)
//     return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
//   }, [sheet])

//   const empty = !!data && !loading && data.count === 0
//   useEffect(() => {
//     if (empty && rec.length === 0) searchProducts('sort=featured&page_size=4').then((d) => setRec(d.results)).catch(() => {})
//   }, [empty])

//   const f = data?.facets
//   const selected = (k) => sp.getAll(k).flatMap((v) => v.split(',')).map((v) => v.trim()).filter(Boolean)
//   const isOn = (k, v) => selected(k).some((x) => x.toLowerCase() === v.toLowerCase())
//   const update = (fn, replace = false) => {
//     const n = new URLSearchParams(sp)
//     fn(n)
//     n.delete('page')
//     setSp(n, { replace })
//   }
//   const setList = (n, k, list) => { n.delete(k); list.forEach((x) => n.append(k, x)) }
//   const toggle = (k, v) => update((n) => {
//     const cur = selected(k)
//     setList(n, k, isOn(k, v) ? cur.filter((x) => x.toLowerCase() !== v.toLowerCase()) : [...cur, v])
//   })
//   const toggleCategory = (slug, parent) => update((n) => {
//     let cur = selected('category')
//     if (isOn('category', slug)) cur = cur.filter((x) => x.toLowerCase() !== slug)
//     else {
//       cur = parent
//         ? cur.filter((x) => x.toLowerCase() !== parent)
//         : cur.filter((x) => !f?.subcategories.some((s) => s.parent === slug && s.slug === x.toLowerCase()))
//       cur.push(slug)
//     }
//     setList(n, 'category', cur)
//   })
//   const setOne = (k, v) => update((n) => (sp.get(k) === v ? n.delete(k) : n.set(k, v)))
//   const clearAll = () => update((n) => [...MULTI, ...OTHER].forEach((k) => n.delete(k)))
//   const go = (p) => { const n = new URLSearchParams(sp); n.set('page', p); setSp(n) }
//   const flip = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }))

//   const nameOf = (k, v) => {
//     const l = v.toLowerCase()
//     if (k === 'category') return [...(f?.categories || []), ...(f?.subcategories || [])].find((c) => c.slug === l)?.name || v
//     if (k === 'collection') return f?.collections.find((c) => c.slug === l)?.name || v
//     if (k === 'season') return SEASON[l] || v
//     return v
//   }
//   const chips = []
//   MULTI.forEach((k) => selected(k).forEach((v) => chips.push({ k, v, text: nameOf(k, v) })))
//   if (sp.get('min_price')) chips.push({ k: 'min_price', text: `From ${money(sp.get('min_price'))}` })
//   if (sp.get('max_price')) chips.push({ k: 'max_price', text: `Up to ${money(sp.get('max_price'))}` })
//   if (sp.get('availability')) chips.push({ k: 'availability', text: sp.get('availability') === 'in_stock' ? 'In stock' : 'Out of stock' })
//   if (sp.get('signature') === 'true') chips.push({ k: 'signature', text: 'Signature' })
//   if (sp.get('new') === 'true') chips.push({ k: 'new', text: 'New arrivals' })
//   const removeChip = (c) => (MULTI.includes(c.k) ? toggle(c.k, c.v) : update((n) => n.delete(c.k)))

//   const colName = selected('collection')[0] && f?.collections.find((c) => c.slug === selected('collection')[0].toLowerCase())?.name
//   const count = data?.count ?? 0

//   const filters = () => {
//     if (!f) return null
//     return (
//       <div className="border-t border-[#1a1716]/15">
//         <Group title="Category" open={!!open.category} onToggle={() => flip('category')}>
//           {f.categories.map((c) => {
//             const subs = f.subcategories.filter((s) => s.parent === c.slug)
//             const showSubs = subs.length > 0 && (isOn('category', c.slug) || subs.some((s) => isOn('category', s.slug)) || f.categories.length === 1)
//             return (
//               <div key={c.slug}>
//                 <Opt on={isOn('category', c.slug)} count={c.count} onClick={() => toggleCategory(c.slug)}>{c.name}</Opt>
//                 {showSubs && (
//                   <div className="ml-1.5 border-l border-[#1a1716]/15 pl-4">
//                     {subs.map((s) => (
//                       <Opt key={s.slug} on={isOn('category', s.slug)} count={s.count} onClick={() => toggleCategory(s.slug, c.slug)}>{s.name}</Opt>
//                     ))}
//                   </div>
//                 )}
//               </div>
//             )
//           })}
//         </Group>
//         {f.collections.length > 0 && (
//           <Group title="Collection" open={!!open.collection} onToggle={() => flip('collection')}>
//             {f.collections.map((c) => <Opt key={c.slug} on={isOn('collection', c.slug)} count={c.count} onClick={() => toggle('collection', c.slug)}>{c.name}</Opt>)}
//           </Group>
//         )}
//         {f.sizes.length > 0 && (
//           <Group title="Size" open={!!open.size} onToggle={() => flip('size')}>
//             <div className="flex flex-wrap gap-2">
//               {f.sizes.map((s) => (
//                 <button key={s.value} type="button" aria-pressed={isOn('size', s.value)} onClick={() => toggle('size', s.value)}
//                   className={`min-w-11 border px-3 py-2 text-sm transition-colors ${isOn('size', s.value) ? 'border-[#1a1716] bg-[#1a1716] text-[#F7F4EF]' : 'border-[#1a1716]/20 hover:border-[#1a1716]'}`}>
//                   {s.value}
//                 </button>
//               ))}
//             </div>
//           </Group>
//         )}
//         {f.colors.length > 0 && (
//           <Group title="Colour" open={!!open.color} onToggle={() => flip('color')}>
//             {f.colors.map((c) => <Opt key={c.value} on={isOn('color', c.value)} count={c.count} onClick={() => toggle('color', c.value)}>{c.value}</Opt>)}
//           </Group>
//         )}
//         {f.price.max > 0 && (
//           <Group title="Price" open={!!open.price} onToggle={() => flip('price')}>
//             <PriceRange max={f.price.max} value={sp.get('max_price') ? Number(sp.get('max_price')) : null}
//               onCommit={(v) => update((n) => (v == null ? n.delete('max_price') : n.set('max_price', v)), true)} />
//           </Group>
//         )}
//         {f.seasons.length > 0 && (
//           <Group title="Season" open={!!open.season} onToggle={() => flip('season')}>
//             {f.seasons.map((s) => <Opt key={s.value} on={isOn('season', s.value)} count={s.count} onClick={() => toggle('season', s.value)}>{SEASON[s.value] || s.value}</Opt>)}
//           </Group>
//         )}
//         <Group title="Availability" open={!!open.availability} onToggle={() => flip('availability')}>
//           <Opt on={sp.get('availability') === 'in_stock'} onClick={() => setOne('availability', 'in_stock')}>In stock</Opt>
//           <Opt on={sp.get('availability') === 'out_of_stock'} onClick={() => setOne('availability', 'out_of_stock')}>Out of stock</Opt>
//         </Group>
//       </div>
//     )
//   }

//   return (
//     <section className="px-[2.5vw] pb-24">
//       <header className="pt-12 pb-10 md:pt-20">
//         <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">{q ? 'Search results for' : 'Search'}</p>
//         <h1 className="mt-4 font-display text-5xl uppercase leading-none md:text-7xl">{q ? `“${q}”` : colName || 'All products'}</h1>
//         <p className="mt-5 text-xs uppercase tracking-[0.2em] text-neutral-500">
//           {data ? `${count} ${count === 1 ? 'product' : 'products'}` : ' '}
//         </p>
//         {data?.corrected_query && (
//           <p className="mt-3 text-sm text-neutral-600">
//             Showing results for “{data.corrected_query}”.
//           </p>
//         )}
//       </header>

//       <div className="flex items-center justify-between border-y border-[#1a1716]/15 py-4">
//         <button type="button" onClick={() => setSheet(true)} className="text-sm uppercase tracking-[0.2em] hover:text-[#B08D57] nav:hidden">
//           Filter{chips.length > 0 ? ` (${chips.length})` : ''}
//         </button>
//         <span className="hidden text-sm uppercase tracking-[0.2em] text-neutral-500 nav:block">Filters</span>
//         <label className="flex items-center gap-3 text-sm text-neutral-600">
//           <span className="hidden md:inline">Sort</span>
//           <select value={sp.get('sort') || 'recommended'}
//             onChange={(e) => update((n) => (e.target.value === 'recommended' ? n.delete('sort') : n.set('sort', e.target.value)))}
//             className="border-0 border-b border-[#1a1716]/30 bg-transparent py-1 pr-2 text-[#1a1716] outline-none focus:border-[#B08D57]">
//             {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
//           </select>
//         </label>
//       </div>

//       {chips.length > 0 && (
//         <div className="flex flex-wrap items-center gap-2 pt-5">
//           {chips.map((c) => (
//             <button key={c.k + (c.v || '')} type="button" onClick={() => removeChip(c)}
//               className="flex items-center gap-2 border border-[#1a1716]/25 px-3 py-1.5 text-sm transition-colors hover:border-[#1a1716]">
//               {c.text}<span aria-hidden="true">×</span><span className="sr-only">remove filter</span>
//             </button>
//           ))}
//           <button type="button" onClick={clearAll} className="ml-2 text-sm underline underline-offset-4 hover:text-[#B08D57]">Clear all</button>
//         </div>
//       )}

//       <div className="mt-10 grid gap-12 nav:grid-cols-[15rem_1fr]">
//         <aside className="hidden nav:block">
//           <div className="sticky top-24 max-h-[calc(100svh-7rem)] overflow-y-auto pr-2">{filters()}</div>
//         </aside>

//         <div aria-busy={loading} className={`transition-opacity duration-300 ${loading && data ? 'opacity-50' : ''}`}>
//           {error ? (
//             <p className="py-20 text-neutral-600">Could not load results. Is the backend running?</p>
//           ) : !data ? (
//             <Skeleton />
//           ) : empty ? (
//             <div className="py-10 text-center md:py-20">
//               <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">No results</p>
//               <h2 className="mx-auto mt-4 max-w-xl font-display text-3xl md:text-4xl">
//                 We couldn’t find anything matching{q ? <> “{q}”</> : ' these filters'}
//               </h2>
//               {chips.length > 0 && (
//                 <button type="button" onClick={clearAll} className="mt-6 text-sm underline underline-offset-4 hover:text-[#B08D57]">Clear all filters</button>
//               )}
//               <p className="mt-14 text-xs uppercase tracking-[0.3em] text-neutral-500">Try searching for</p>
//               <ul className="mt-5 flex flex-wrap justify-center gap-x-8 gap-y-3">
//                 {TRY.map(([t, qs]) => (
//                   <li key={t}><Link to={`/search?${qs}`} className="border-b border-transparent pb-0.5 transition-colors hover:border-current hover:text-[#B08D57]">{t}</Link></li>
//                 ))}
//               </ul>
//               {rec.length > 0 && (
//                 <div className="mt-20 text-left">
//                   <p className={`${head} mb-6`}>Recommended for you</p>
//                   <div className={gridCls}>{rec.map((p, i) => <ProductCard key={p.id} p={p} i={i} />)}</div>
//                 </div>
//               )}
//             </div>
//           ) : (
//             <>
//               <div className={gridCls}>{data.results.map((p, i) => <ProductCard key={p.id} p={p} i={i} showColors />)}</div>
//               {data.total_pages > 1 && (
//                 <nav aria-label="Pages" className="mt-16 flex items-center justify-center gap-8 text-sm uppercase tracking-[0.18em]">
//                   <button type="button" disabled={data.page <= 1} onClick={() => go(data.page - 1)} className="transition-colors hover:text-[#B08D57] disabled:opacity-30">← Previous</button>
//                   <span className="text-neutral-500">{data.page} / {data.total_pages}</span>
//                   <button type="button" disabled={data.page >= data.total_pages} onClick={() => go(data.page + 1)} className="transition-colors hover:text-[#B08D57] disabled:opacity-30">Next →</button>
//                 </nav>
//               )}
//             </>
//           )}
//         </div>
//       </div>

//       {/* Mobile and tablet filter sheet */}
//       <div className={`fixed inset-0 z-[70] nav:hidden ${sheet ? '' : 'pointer-events-none'}`}>
//         <div onClick={() => setSheet(false)} className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${sheet ? 'opacity-100' : 'opacity-0'}`} />
//         <aside aria-label="Filters" inert={!sheet}
//           className={`absolute inset-x-0 bottom-0 flex max-h-[92svh] flex-col bg-[#F7F4EF] transition-transform duration-300 motion-reduce:transition-none ${sheet ? 'translate-y-0' : 'translate-y-full'}`}>
//           <div className="flex items-center justify-between px-6 py-5">
//             <p className="font-display text-2xl">Filters</p>
//             <button type="button" onClick={() => setSheet(false)} aria-label="Close filters" className="p-2 text-xl leading-none">×</button>
//           </div>
//           <div className="flex-1 overflow-y-auto px-6">{filters()}</div>
//           <div className="flex items-center gap-4 border-t border-[#1a1716]/15 px-6 py-4">
//             <button type="button" onClick={clearAll} className="text-sm underline underline-offset-4">Clear all</button>
//             <button type="button" onClick={() => setSheet(false)} className="flex-1 bg-[#1a1716] py-4 text-sm uppercase tracking-[0.2em] text-[#F7F4EF]">
//               Show {count} {count === 1 ? 'product' : 'products'}
//             </button>
//           </div>
//         </aside>
//       </div>
//     </section>
//   )
// }




import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { searchProducts } from '../Api.jsx'
import ProductCard from '../components/ProductCard.jsx'

const SORTS = [
  ['recommended', 'Recommended'], ['newest', 'Newest'], ['featured', 'Featured'],
  ['best_selling', 'Best selling'], ['price_asc', 'Price — low to high'], ['price_desc', 'Price — high to low'],
]
const MULTI = ['category', 'collection', 'size', 'color', 'season']
const OTHER = ['min_price', 'max_price', 'availability', 'signature', 'new']
const SEASON = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' }
const TRY = [['Shirts', 'q=shirt'], ['Panjabi', 'q=panjabi'], ['HEEM Signature', 'collection=heem-signature'],
  ['New Arrivals', 'new=true'], ['Winter Collection', 'collection=winter-collection']]
const money = (n) => `৳${Math.round(Number(n)).toLocaleString('en-US')}`
const head = 'font-display text-[1.05rem] font-semibold'
const gridCls = 'grid grid-cols-2 gap-x-[10px] gap-y-8 sm:gap-x-3 md:grid-cols-3 md:gap-x-4 md:gap-y-10 lg:gap-x-5 xl:grid-cols-4 2xl:grid-cols-5 2xl:gap-x-6'

function Skeleton({ n = 8 }) {
  return (
    <div className={gridCls} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <div key={i}>
          <div className="aspect-[3/4] animate-pulse bg-[#1a1716]/[0.06]" />
          <div className="mt-4 h-3 w-3/4 animate-pulse bg-[#1a1716]/[0.06]" />
          <div className="mt-2 h-3 w-1/4 animate-pulse bg-[#1a1716]/[0.06]" />
        </div>
      ))}
    </div>
  )
}

function Opt({ on, onClick, count, children }) {
  return (
    <button type="button" role="checkbox" aria-checked={on} onClick={onClick}
      className="flex w-full items-center justify-between py-1.5 text-left text-[0.95rem] text-neutral-700 transition-colors hover:text-[#1a1716]">
      <span className="flex items-center gap-3">
        <span className={`h-3.5 w-3.5 border ${on ? 'border-[#1a1716] bg-[#1a1716]' : 'border-[#1a1716]/30'}`} />
        <span className={on ? 'text-[#1a1716]' : ''}>{children}</span>
      </span>
      {count != null && <span className="text-xs text-neutral-400">{count}</span>}
    </button>
  )
}

function Group({ title, open, onToggle, children }) {
  return (
    <div className="border-b border-[#1a1716]/15">
      <button type="button" aria-expanded={open} onClick={onToggle} className={`${head} flex w-full items-center justify-between py-4`}>
        {title}<span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 motion-reduce:transition-none ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden" inert={!open}><div className="pb-5">{children}</div></div>
      </div>
    </div>
  )
}

function PriceRange({ max, value, onCommit }) {
  const top = Math.max(100, Math.ceil(max / 100) * 100)
  const [v, setV] = useState(value ?? top)
  useEffect(() => { setV(value ?? top) }, [value, top])
  const commit = () => onCommit(v >= top ? null : v)
  return (
    <div>
      <input type="range" min={0} max={top} step={100} value={v} aria-label="Maximum price"
        onChange={(e) => setV(Number(e.target.value))} onPointerUp={commit} onKeyUp={commit}
        className="w-full accent-[#1a1716]" />
      <div className="mt-1 flex justify-between text-sm text-neutral-600">
        <span>৳0</span><span>{v >= top ? `${money(top)}+` : money(v)}</span>
      </div>
    </div>
  )
}

export default function Search() {
  const [sp, setSp] = useSearchParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [open, setOpen] = useState({ category: true, size: true })
  const [rec, setRec] = useState([])
  const key = sp.toString()
  const q = sp.get('q') || ''

  useEffect(() => {
    const ctl = new AbortController()
    setLoading(true)
    setError(false)
    searchProducts(key, ctl.signal)
      .then((d) => { setData(d); setLoading(false) })
      .catch((e) => { if (e.name !== 'AbortError') { setError(true); setLoading(false) } })
    return () => ctl.abort()
  }, [key])

  useEffect(() => { window.scrollTo({ top: 0 }) }, [sp.get('page')])

  useEffect(() => {
    document.body.style.overflow = sheet ? 'hidden' : ''
    const onKey = (e) => e.key === 'Escape' && setSheet(false)
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
  }, [sheet])

  const empty = !!data && !loading && data.count === 0
  useEffect(() => {
    if (empty && rec.length === 0) searchProducts('sort=featured&page_size=4').then((d) => setRec(d.results)).catch(() => {})
  }, [empty])

  const f = data?.facets
  const selected = (k) => sp.getAll(k).flatMap((v) => v.split(',')).map((v) => v.trim()).filter(Boolean)
  const isOn = (k, v) => selected(k).some((x) => x.toLowerCase() === v.toLowerCase())
  const update = (fn, replace = false) => {
    const n = new URLSearchParams(sp)
    fn(n)
    n.delete('page')
    setSp(n, { replace })
  }
  const setList = (n, k, list) => { n.delete(k); list.forEach((x) => n.append(k, x)) }
  const toggle = (k, v) => update((n) => {
    const cur = selected(k)
    setList(n, k, isOn(k, v) ? cur.filter((x) => x.toLowerCase() !== v.toLowerCase()) : [...cur, v])
  })
  const toggleCategory = (slug, parent) => update((n) => {
    let cur = selected('category')
    if (isOn('category', slug)) cur = cur.filter((x) => x.toLowerCase() !== slug)
    else {
      cur = parent
        ? cur.filter((x) => x.toLowerCase() !== parent)
        : cur.filter((x) => !f?.subcategories.some((s) => s.parent === slug && s.slug === x.toLowerCase()))
      cur.push(slug)
    }
    setList(n, 'category', cur)
  })
  const setOne = (k, v) => update((n) => (sp.get(k) === v ? n.delete(k) : n.set(k, v)))
  const clearAll = () => update((n) => [...MULTI, ...OTHER].forEach((k) => n.delete(k)))
  const go = (p) => { const n = new URLSearchParams(sp); n.set('page', p); setSp(n) }
  const flip = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }))

  const nameOf = (k, v) => {
    const l = v.toLowerCase()
    if (k === 'category') return [...(f?.categories || []), ...(f?.subcategories || [])].find((c) => c.slug === l)?.name || v
    if (k === 'collection') return f?.collections.find((c) => c.slug === l)?.name || v
    if (k === 'season') return SEASON[l] || v
    return v
  }
  const chips = []
  MULTI.forEach((k) => selected(k).forEach((v) => chips.push({ k, v, text: nameOf(k, v) })))
  if (sp.get('min_price')) chips.push({ k: 'min_price', text: `From ${money(sp.get('min_price'))}` })
  if (sp.get('max_price')) chips.push({ k: 'max_price', text: `Up to ${money(sp.get('max_price'))}` })
  if (sp.get('availability')) chips.push({ k: 'availability', text: sp.get('availability') === 'in_stock' ? 'In stock' : 'Out of stock' })
  if (sp.get('signature') === 'true') chips.push({ k: 'signature', text: 'Signature' })
  if (sp.get('new') === 'true') chips.push({ k: 'new', text: 'New arrivals' })
  const removeChip = (c) => (MULTI.includes(c.k) ? toggle(c.k, c.v) : update((n) => n.delete(c.k)))

  const colName = selected('collection')[0] && f?.collections.find((c) => c.slug === selected('collection')[0].toLowerCase())?.name
  const count = data?.count ?? 0

  const filters = () => {
    if (!f) return null
    return (
      <div className="border-t border-[#1a1716]/15">
        <Group title="Category" open={!!open.category} onToggle={() => flip('category')}>
          {f.categories.map((c) => {
            const subs = f.subcategories.filter((s) => s.parent === c.slug)
            const showSubs = subs.length > 0 && (isOn('category', c.slug) || subs.some((s) => isOn('category', s.slug)) || f.categories.length === 1)
            return (
              <div key={c.slug}>
                <Opt on={isOn('category', c.slug)} count={c.count} onClick={() => toggleCategory(c.slug)}>{c.name}</Opt>
                {showSubs && (
                  <div className="ml-1.5 border-l border-[#1a1716]/15 pl-4">
                    {subs.map((s) => (
                      <Opt key={s.slug} on={isOn('category', s.slug)} count={s.count} onClick={() => toggleCategory(s.slug, c.slug)}>{s.name}</Opt>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </Group>
        {f.collections.length > 0 && (
          <Group title="Collection" open={!!open.collection} onToggle={() => flip('collection')}>
            {f.collections.map((c) => <Opt key={c.slug} on={isOn('collection', c.slug)} count={c.count} onClick={() => toggle('collection', c.slug)}>{c.name}</Opt>)}
          </Group>
        )}
        {f.sizes.length > 0 && (
          <Group title="Size" open={!!open.size} onToggle={() => flip('size')}>
            <div className="flex flex-wrap gap-2">
              {f.sizes.map((s) => (
                <button key={s.value} type="button" aria-pressed={isOn('size', s.value)} onClick={() => toggle('size', s.value)}
                  className={`min-w-11 border px-3 py-2 text-sm transition-colors ${isOn('size', s.value) ? 'border-[#1a1716] bg-[#1a1716] text-[#F7F4EF]' : 'border-[#1a1716]/20 hover:border-[#1a1716]'}`}>
                  {s.value}
                </button>
              ))}
            </div>
          </Group>
        )}
        {f.colors.length > 0 && (
          <Group title="Colour" open={!!open.color} onToggle={() => flip('color')}>
            {f.colors.map((c) => <Opt key={c.value} on={isOn('color', c.value)} count={c.count} onClick={() => toggle('color', c.value)}>{c.value}</Opt>)}
          </Group>
        )}
        {f.price.max > 0 && (
          <Group title="Price" open={!!open.price} onToggle={() => flip('price')}>
            <PriceRange max={f.price.max} value={sp.get('max_price') ? Number(sp.get('max_price')) : null}
              onCommit={(v) => update((n) => (v == null ? n.delete('max_price') : n.set('max_price', v)), true)} />
          </Group>
        )}
        {f.seasons.length > 0 && (
          <Group title="Season" open={!!open.season} onToggle={() => flip('season')}>
            {f.seasons.map((s) => <Opt key={s.value} on={isOn('season', s.value)} count={s.count} onClick={() => toggle('season', s.value)}>{SEASON[s.value] || s.value}</Opt>)}
          </Group>
        )}
        <Group title="Availability" open={!!open.availability} onToggle={() => flip('availability')}>
          <Opt on={sp.get('availability') === 'in_stock'} onClick={() => setOne('availability', 'in_stock')}>In stock</Opt>
          <Opt on={sp.get('availability') === 'out_of_stock'} onClick={() => setOne('availability', 'out_of_stock')}>Out of stock</Opt>
        </Group>
      </div>
    )
  }

  return (
    <section className="px-[2.5vw] pb-24">
      <header className="pt-12 pb-10 md:pt-20">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">{q ? 'Search results for' : 'Search'}</p>
        <h1 className="mt-4 font-display text-5xl uppercase leading-none md:text-7xl">{q ? `“${q}”` : colName || 'All products'}</h1>
        <p className="mt-5 text-xs uppercase tracking-[0.2em] text-neutral-500">
          {data ? `${count} ${count === 1 ? 'product' : 'products'}` : ' '}
        </p>
        {data?.corrected_query && (
          <p className="mt-3 text-sm text-neutral-600">
            Showing results for “{data.corrected_query}”.
          </p>
        )}
      </header>

      <div className="flex items-center justify-between border-y border-[#1a1716]/15 py-4">
        <button type="button" onClick={() => setSheet(true)} className="text-sm uppercase tracking-[0.2em] hover:text-[#B08D57] nav:hidden">
          Filter{chips.length > 0 ? ` (${chips.length})` : ''}
        </button>
        <span className="hidden text-sm uppercase tracking-[0.2em] text-neutral-500 nav:block">Filters</span>
        <label className="flex items-center gap-3 text-sm text-neutral-600">
          <span className="hidden md:inline">Sort</span>
          <select value={sp.get('sort') || 'recommended'}
            onChange={(e) => update((n) => (e.target.value === 'recommended' ? n.delete('sort') : n.set('sort', e.target.value)))}
            className="border-0 border-b border-[#1a1716]/30 bg-transparent py-1 pr-2 text-[#1a1716] outline-none focus:border-[#B08D57]">
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-5">
          {chips.map((c) => (
            <button key={c.k + (c.v || '')} type="button" onClick={() => removeChip(c)}
              className="flex items-center gap-2 border border-[#1a1716]/25 px-3 py-1.5 text-sm transition-colors hover:border-[#1a1716]">
              {c.text}<span aria-hidden="true">×</span><span className="sr-only">remove filter</span>
            </button>
          ))}
          <button type="button" onClick={clearAll} className="ml-2 text-sm underline underline-offset-4 hover:text-[#B08D57]">Clear all</button>
        </div>
      )}

      <div className="mt-10 grid gap-12 nav:grid-cols-[15rem_1fr]">
        <aside className="hidden nav:block">
          <div className="sticky top-24 max-h-[calc(100svh-7rem)] overflow-y-auto pr-2">{filters()}</div>
        </aside>

        <div aria-busy={loading} className={`transition-opacity duration-300 ${loading && data ? 'opacity-50' : ''}`}>
          {error ? (
            <p className="py-20 text-neutral-600">Could not load results. Is the backend running?</p>
          ) : !data ? (
            <Skeleton />
          ) : empty ? (
            <div className="py-10 text-center md:py-20">
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">No results</p>
              <h2 className="mx-auto mt-4 max-w-xl font-display text-3xl md:text-4xl">
                We couldn’t find anything matching{q ? <> “{q}”</> : ' these filters'}
              </h2>
              {chips.length > 0 && (
                <button type="button" onClick={clearAll} className="mt-6 text-sm underline underline-offset-4 hover:text-[#B08D57]">Clear all filters</button>
              )}
              <p className="mt-14 text-xs uppercase tracking-[0.3em] text-neutral-500">Try searching for</p>
              <ul className="mt-5 flex flex-wrap justify-center gap-x-8 gap-y-3">
                {TRY.map(([t, qs]) => (
                  <li key={t}><Link to={`/search?${qs}`} className="border-b border-transparent pb-0.5 transition-colors hover:border-current hover:text-[#B08D57]">{t}</Link></li>
                ))}
              </ul>
              {rec.length > 0 && (
                <div className="mt-20 text-left">
                  <p className={`${head} mb-6`}>Recommended for you</p>
                  <div className={gridCls}>{rec.map((p, i) => <ProductCard key={p.id} p={p} i={i} showQuickAdd />)}</div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className={gridCls}>{data.results.map((p, i) => <ProductCard key={p.id} p={p} i={i} showQuickAdd />)}</div>
              {data.total_pages > 1 && (
                <nav aria-label="Pages" className="mt-16 flex items-center justify-center gap-8 text-sm uppercase tracking-[0.18em]">
                  <button type="button" disabled={data.page <= 1} onClick={() => go(data.page - 1)} className="transition-colors hover:text-[#B08D57] disabled:opacity-30">← Previous</button>
                  <span className="text-neutral-500">{data.page} / {data.total_pages}</span>
                  <button type="button" disabled={data.page >= data.total_pages} onClick={() => go(data.page + 1)} className="transition-colors hover:text-[#B08D57] disabled:opacity-30">Next →</button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile and tablet filter sheet */}
      <div className={`fixed inset-0 z-[70] nav:hidden ${sheet ? '' : 'pointer-events-none'}`}>
        <div onClick={() => setSheet(false)} className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${sheet ? 'opacity-100' : 'opacity-0'}`} />
        <aside aria-label="Filters" inert={!sheet}
          className={`absolute inset-x-0 bottom-0 flex max-h-[92svh] flex-col bg-[#F7F4EF] transition-transform duration-300 motion-reduce:transition-none ${sheet ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="flex items-center justify-between px-6 py-5">
            <p className="font-display text-2xl">Filters</p>
            <button type="button" onClick={() => setSheet(false)} aria-label="Close filters" className="p-2 text-xl leading-none">×</button>
          </div>
          <div className="flex-1 overflow-y-auto px-6">{filters()}</div>
          <div className="flex items-center gap-4 border-t border-[#1a1716]/15 px-6 py-4">
            <button type="button" onClick={clearAll} className="text-sm underline underline-offset-4">Clear all</button>
            <button type="button" onClick={() => setSheet(false)} className="flex-1 bg-[#1a1716] py-4 text-sm uppercase tracking-[0.2em] text-[#F7F4EF]">
              Show {count} {count === 1 ? 'product' : 'products'}
            </button>
          </div>
        </aside>
      </div>
    </section>
  )
}