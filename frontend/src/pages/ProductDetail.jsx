// import { useEffect, useMemo, useRef, useState } from 'react'
// import { Link, useParams } from 'react-router-dom'
// import { getProduct, formatPrice, errorText } from '../Api.jsx'
// import { useShop } from '../context/ShopContext.jsx'
// import ProductGallery from '../components/product/ProductGallery.jsx'
// import SizeGuide from '../components/product/SizeGuide.jsx'
// import ProductAccordion from '../components/product/ProductAccordion.jsx'
// import RelatedProducts from '../components/product/RelatedProducts.jsx'

// const NO_NOTE = { text: '', ok: false }
// const heading = 'font-display text-[1.05rem] font-semibold'
// const option = (on) =>
//   `border text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-35 disabled:line-through ${on ? 'border-[#1a1716] bg-[#1a1716] text-[#F7F4EF]' : 'border-[#1a1716]/20 hover:border-[#1a1716]'}`

// function Breadcrumbs({ p }) {
//   const crumbs = [{ name: 'Home', to: '/' }, ...p.breadcrumbs.map((c) => ({ name: c.name, to: `/search?category=${c.slug}` }))]
//   return (
//     <nav aria-label="Breadcrumb">
//       <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-500">
//         {crumbs.map((c) => (
//           <li key={c.to} className="flex items-center gap-2">
//             <Link to={c.to} className="transition-colors hover:text-[#1a1716]">{c.name}</Link>
//             <span aria-hidden="true">/</span>
//           </li>
//         ))}
//         <li aria-current="page" className="text-[#1a1716]">{p.name}</li>
//       </ol>
//     </nav>
//   )
// }

// function Quantity({ qty, setQty, max }) {
//   return (
//     <div role="group" aria-label="Quantity" className="inline-flex items-center border border-[#1a1716]/20">
//       <button type="button" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty(qty - 1)}
//         className="h-11 w-11 text-lg transition-colors hover:text-[#B08D57] disabled:opacity-35 disabled:hover:text-inherit">−</button>
//       <output aria-live="polite" className="w-10 text-center">{qty}</output>
//       <button type="button" aria-label="Increase quantity" disabled={qty >= max} onClick={() => setQty(qty + 1)}
//         className="h-11 w-11 text-lg transition-colors hover:text-[#B08D57] disabled:opacity-35 disabled:hover:text-inherit">+</button>
//     </div>
//   )
// }

// function Skeleton() {
//   return (
//     <section className="grid gap-10 px-[2.5vw] py-10 md:grid-cols-2 md:gap-16 md:py-16" aria-busy="true" aria-label="Loading product">
//       <div className="aspect-[3/4] animate-pulse bg-[#1a1716]/[0.06]" />
//       <div className="space-y-5 md:pt-10">
//         <div className="h-3 w-1/4 animate-pulse bg-[#1a1716]/[0.06]" />
//         <div className="h-10 w-3/4 animate-pulse bg-[#1a1716]/[0.06]" />
//         <div className="h-4 w-1/5 animate-pulse bg-[#1a1716]/[0.06]" />
//         <div className="h-24 w-full animate-pulse bg-[#1a1716]/[0.06]" />
//         <div className="h-12 w-full animate-pulse bg-[#1a1716]/[0.06]" />
//       </div>
//     </section>
//   )
// }

// export default function ProductDetail() {
//   const { slug } = useParams()
//   const { cart, addToCart, wishIds, toggleWish } = useShop()
//   const [p, setP] = useState(null)
//   const [state, setState] = useState('loading') // loading | ok | missing | error
//   const [attempt, setAttempt] = useState(0)
//   const [color, setColor] = useState('')
//   const [size, setSize] = useState('')
//   const [qty, setQty] = useState(1)
//   const [note, setNote] = useState(NO_NOTE)
//   const [busy, setBusy] = useState(false)
//   const [wishBusy, setWishBusy] = useState(false)
//   const [guide, setGuide] = useState(false)
//   const [ctaVisible, setCtaVisible] = useState(true)
//   const ctaRef = useRef(null)

//   // Load the product. `live` stops a slow response for the previous product from overwriting the new one.
//   useEffect(() => {
//     let live = true
//     window.scrollTo(0, 0)
//     setState('loading'); setP(null); setColor(''); setSize(''); setQty(1); setNote(NO_NOTE)
//     getProduct(slug).then((d) => {
//       if (!live) return
//       const firstColor = d.colors.find((c) => d.variants.some((v) => v.color === c && v.stock > 0)) || d.colors[0] || ''
//       setP(d); setColor(firstColor); setState('ok')
//     }).catch((e) => { if (live) setState(/404/.test(e.message) ? 'missing' : 'error') })
//     return () => { live = false }
//   }, [slug, attempt])

//   useEffect(() => {
//     if (!p) return
//     const prev = document.title
//     document.title = `${p.name} - HEEM`
//     return () => { document.title = prev }
//   }, [p])

//   const variants = p?.variants || []
//   const needColor = !!p && p.colors.length > 0
//   const needSize = !!p && p.sizes.length > 0
//   // the exact variant for the chosen colour + size (blank for products without that option)
//   const variant = useMemo(
//     () => variants.find((v) => (v.color || '') === color && (v.size || '') === size),
//     [variants, color, size],
//   )

//   // How many more can go into the bag: stock and the per-order limit, minus what is already there.
//   const inBag = variant ? (cart.items.find((i) => i.variant_id === variant.id)?.quantity || 0) : 0
//   const limit = variant && p ? Math.min(variant.stock, p.max_per_order) : 0
//   const maxQty = Math.max(limit - inBag, 0)
//   const qtyCap = variant ? Math.max(maxQty, 1) : (p?.max_per_order || 1)

//   // Keep the quantity only while it is still valid for the chosen variant; otherwise go back to 1.
//   useEffect(() => { if (qty > qtyCap) setQty(1) }, [qty, qtyCap])

//   // Mobile sticky bar appears whenever the main Add to bag button is off screen.
//   useEffect(() => {
//     const el = ctaRef.current
//     if (!el || !('IntersectionObserver' in window)) return
//     const io = new IntersectionObserver(([e]) => setCtaVisible(e.isIntersecting))
//     io.observe(el)
//     return () => io.disconnect()
//   }, [state])

//   if (state === 'loading') return <Skeleton />
//   if (state === 'missing') {
//     return (
//       <section className="px-[2.5vw] py-32 text-center">
//         <h1 className="font-display text-3xl md:text-4xl">This product is not available</h1>
//         <p className="mt-4 text-neutral-600">It may have been removed, or the link is incorrect.</p>
//         <Link to="/search" className="mt-8 inline-block border-b border-current pb-1 text-sm uppercase tracking-[0.18em] hover:text-[#B08D57]">Browse all products</Link>
//       </section>
//     )
//   }
//   if (state === 'error') {
//     return (
//       <section className="px-[2.5vw] py-32 text-center">
//         <h1 className="font-display text-3xl md:text-4xl">We could not load this product</h1>
//         <p className="mt-4 text-neutral-600">Check your connection and try again.</p>
//         <button type="button" onClick={() => setAttempt((a) => a + 1)}
//           className="mt-8 border-b border-current pb-1 text-sm uppercase tracking-[0.18em] hover:text-[#B08D57]">Try again</button>
//       </section>
//     )
//   }

//   // ----- derived view data -----
//   // Photos of the chosen colour; photos with no colour are shared by every colour and used when a colour has none of its own.
//   const own = color ? p.images.filter((im) => im.color === color) : []
//   const gallery = (own.length ? own : p.images.filter((im) => !im.color)).slice(0, 6)
//   const swatch = (c) => p.images.find((im) => im.color === c)?.image
//   const colorInStock = (c) => variants.some((v) => v.color === c && v.stock > 0)
//   const sizeInStock = (s) => variants.some((v) => v.size === s && v.stock > 0 && (!color || v.color === color))
//   const anyInStock = variants.some((v) => v.stock > 0 && (!color || v.color === color))

//   const wished = wishIds.has(p.id)
//   const soldOut = !p.in_stock || (!!variant && variant.stock < 1)
//   const code = variant?.sku || p.sku
//   const price = formatPrice(p.price)

//   let qtyMsg = ''
//   if (variant && variant.stock > 0 && qty >= qtyCap) {
//     if (inBag && maxQty === 0) qtyMsg = `You already have the maximum available (${inBag}) in your bag.`
//     else if (inBag) qtyMsg = `You have ${inBag} in your bag. You can add ${maxQty} more.`
//     else qtyMsg = p.max_per_order < variant.stock ? `Limit of ${limit} per order.` : `Only ${limit} available.`
//   }

//   const stockText = variant
//     ? (variant.stock < 1 ? 'Sold out' : variant.stock <= 3 ? `Only ${variant.stock} left` : 'In stock')
//     : (anyInStock ? 'In stock' : 'Sold out')

//   const flag = (text, ok = false) => {
//     setNote({ text, ok })
//     if (!ok && !ctaVisible) ctaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
//   }

//   const pickColor = (c) => {
//     setColor(c)
//     // keep the chosen size only if this colour still has it in stock
//     if (size && !variants.some((v) => v.color === c && v.size === size && v.stock > 0)) setSize('')
//     setNote(NO_NOTE)
//   }

//   const add = async () => {
//     if (busy) return
//     if (needColor && !color) return flag('Please choose a colour.')
//     if (needSize && !size) return flag('Please choose a size.')
//     if (!variant) return flag('This combination is not available.')
//     if (variant.stock < 1) return flag('Sorry, this option is sold out.')
//     if (maxQty < 1) return flag(qtyMsg || 'No more of this item can be added.')
//     setBusy(true)
//     try {
//       await addToCart(variant.id, qty)
//       flag(qty > 1 ? `${qty} items added to your bag.` : 'Added to your bag.', true)
//       setQty(1)
//     } catch (e) {
//       flag(errorText(e) || e.message)
//     } finally {
//       setBusy(false)
//     }
//   }

//   const wish = async () => {
//     if (wishBusy) return
//     setWishBusy(true)
//     try {
//       await toggleWish(p.id)
//       setNote({ text: wished ? 'Removed from your wishlist.' : 'Saved to your wishlist.', ok: true })
//     } catch (e) {
//       setNote({ text: errorText(e) || e.message, ok: false })
//     } finally {
//       setWishBusy(false)
//     }
//   }

//   const share = async () => {
//     const url = window.location.href
//     try {
//       if (navigator.share) await navigator.share({ title: p.name, url })
//       else { await navigator.clipboard.writeText(url); setNote({ text: 'Link copied.', ok: true }) }
//     } catch (e) {
//       if (e?.name !== 'AbortError') setNote({ text: 'Could not share this link.', ok: false })
//     }
//   }

//   const sr = p.shipping_returns
//   const sections = [
//     p.description && { id: 'description', title: 'Product description', body: <p className="whitespace-pre-line">{p.description}</p> },
//     p.fabric && { id: 'fabric', title: 'Fabric & materials', body: <p>{p.fabric}</p> },
//     (p.fit || p.model_height || p.model_wears || p.size_chart) && {
//       id: 'fit', title: 'Size & fit',
//       body: (
//         <div className="space-y-2">
//           {p.fit && <p>Fit: {p.fit}</p>}
//           {p.model_height && p.model_wears && <p>The model is {p.model_height} tall and wears size {p.model_wears}.</p>}
//           {p.model_height && !p.model_wears && <p>Model height: {p.model_height}.</p>}
//           {!p.model_height && p.model_wears && <p>The model wears size {p.model_wears}.</p>}
//           {p.size_chart && <button type="button" onClick={() => setGuide(true)} className="underline underline-offset-4 hover:text-[#B08D57]">Open size guide</button>}
//         </div>
//       ),
//     },
//     p.care_list.length > 0 && { id: 'care', title: 'Care instructions', body: <ul className="list-disc space-y-1 pl-5">{p.care_list.map((l) => <li key={l}>{l}</li>)}</ul> },
//     {
//       id: 'shipping', title: 'Shipping & returns',
//       body: (
//         <ul className="space-y-1">
//           <li>Delivery inside Dhaka: {formatPrice(sr.delivery_dhaka)}</li>
//           <li>Delivery outside Dhaka: {formatPrice(sr.delivery_outside)}</li>
//           <li>Free delivery on orders over {formatPrice(sr.free_over)}</li>
//           <li>Return window: {sr.return_days} days</li>
//         </ul>
//       ),
//     },
//   ].filter(Boolean)

//   const addLabel = busy ? 'Adding…' : soldOut ? 'Sold out' : 'Add to bag'

//   return (
//     <>
//       <section className="px-[2.5vw] pb-10 pt-6 md:pb-16">
//         <Breadcrumbs p={p} />
//         <div className="mt-6 grid gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-14">
//           <ProductGallery key={color} images={gallery} name={p.name} />

//           <div className="md:sticky md:top-24 md:max-h-[calc(100svh-7rem)] md:self-start md:overflow-y-auto md:pr-2">
//             <p className="text-sm text-neutral-500">{p.collection_name || p.category_name}</p>
//             <h1 className="mt-2 font-display text-4xl uppercase leading-tight md:text-5xl">{p.name}</h1>
//             <p className="mt-4 flex flex-wrap items-baseline gap-x-3 text-xl">
//               <span>{price}</span>
//               {p.compare_at_price && (
//                 <>
//                   <s className="text-base text-neutral-500"><span className="sr-only">Original price </span>{formatPrice(p.compare_at_price)}</s>
//                   <span className="text-sm text-[#8a6d3b]">{p.discount_percent}% off</span>
//                 </>
//               )}
//             </p>
//             {p.short_description && <p className="mt-6 max-w-md text-neutral-600">{p.short_description}</p>}

//             {needColor && (
//               <div className="mt-8">
//                 <p className={`mb-3 ${heading}`}>Colour{color && <span className="ml-2 font-body text-sm font-normal text-neutral-500">{color}</span>}</p>
//                 <div className="flex flex-wrap gap-2">
//                   {p.colors.map((c) => {
//                     const ok = colorInStock(c)
//                     const img = swatch(c)
//                     return (
//                       <button key={c} type="button" aria-pressed={color === c} disabled={!ok} onClick={() => pickColor(c)}
//                         aria-label={ok ? c : `${c}, sold out`} title={ok ? c : `${c} - sold out`}
//                         className={`flex items-center gap-2 border text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-35 disabled:line-through ${img ? 'p-1.5 pr-3' : 'px-4 py-2'} ${color === c ? 'border-[#1a1716]' : 'border-[#1a1716]/20 hover:border-[#1a1716]'}`}>
//                         {img && <span className="block h-9 w-7 shrink-0 overflow-hidden bg-[#1a1716]/[0.06]"><img src={img} alt="" loading="lazy" className="h-full w-full object-cover" /></span>}
//                         <span>{c}</span>
//                       </button>
//                     )
//                   })}
//                 </div>
//               </div>
//             )}

//             {needSize && (
//               <div className="mt-8">
//                 <div className="mb-3 flex items-baseline justify-between">
//                   <p className={heading}>Size{size && <span className="ml-2 font-body text-sm font-normal text-neutral-500">{size}</span>}</p>
//                   {p.size_chart && <button type="button" onClick={() => setGuide(true)} className="text-sm underline underline-offset-4 hover:text-[#B08D57]">Size guide</button>}
//                 </div>
//                 <div className="flex flex-wrap gap-2">
//                   {p.sizes.map((s) => (
//                     <button key={s} type="button" aria-pressed={size === s} disabled={!sizeInStock(s)}
//                       onClick={() => { setSize(s); setNote(NO_NOTE) }}
//                       aria-label={sizeInStock(s) ? `Size ${s}` : `Size ${s}, sold out`}
//                       className={`min-w-12 px-4 py-2 ${option(size === s)}`}>{s}</button>
//                   ))}
//                 </div>
//               </div>
//             )}

//             <div className="mt-8">
//               <p className={`mb-3 ${heading}`}>Quantity</p>
//               <Quantity qty={qty} setQty={setQty} max={qtyCap} />
//               <p className="mt-2 min-h-5 text-sm text-neutral-500" role="status">{qtyMsg}</p>
//             </div>

//             <p className="mt-4 text-sm text-neutral-500">
//               {stockText}{code && <span className="ml-4">Product code: {code}</span>}
//             </p>

//             <div className="mt-4 space-y-3 md:max-w-md">
//               <button ref={ctaRef} type="button" onClick={add} disabled={soldOut || busy}
//                 className="w-full bg-[#1a1716] py-4 text-sm uppercase tracking-[0.2em] text-[#F7F4EF] transition-colors hover:bg-[#B08D57] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#1a1716]">
//                 {addLabel}
//               </button>
//               <button type="button" onClick={wish} disabled={wishBusy} aria-pressed={wished}
//                 className="flex w-full items-center justify-center gap-3 border border-[#1a1716]/20 py-4 text-sm uppercase tracking-[0.2em] transition-colors hover:border-[#1a1716] disabled:opacity-50">
//                 <svg viewBox="0 0 24 24" className="h-5 w-5" fill={wished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
//                   <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
//                 </svg>
//                 {wished ? 'Remove from wishlist' : 'Add to wishlist'}
//               </button>
//             </div>

//             <p className={`mt-3 min-h-6 text-sm ${note.ok ? 'text-neutral-700' : 'text-[#8a6d3b]'}`} role="status">{note.text}</p>
//             <button type="button" onClick={share} className="mt-2 text-sm underline underline-offset-4 hover:text-[#B08D57]">Share this product</button>
//           </div>
//         </div>
//       </section>

//       <section className="border-t border-[#1a1716]/15 px-[2.5vw] py-12 md:py-16" aria-label="Product information">
//         <div className="max-w-4xl"><ProductAccordion items={sections} /></div>
//       </section>

//       <RelatedProducts slug={p.slug} />

//       {/* Phone only: keeps Add to bag in reach once the main button has scrolled away */}
//       <div inert={ctaVisible} className={`fixed inset-x-0 bottom-0 z-40 flex items-center gap-4 border-t border-[#1a1716]/15 bg-[#F7F4EF] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-transform duration-300 motion-reduce:transition-none md:hidden ${ctaVisible ? 'translate-y-full' : 'translate-y-0'}`}>
//         <span className="text-lg">{price}</span>
//         <button type="button" onClick={add} disabled={soldOut || busy}
//           className="flex-1 bg-[#1a1716] py-3.5 text-sm uppercase tracking-[0.2em] text-[#F7F4EF] disabled:opacity-40">{addLabel}</button>
//       </div>

//       {guide && p.size_chart && <SizeGuide chart={p.size_chart} onClose={() => setGuide(false)} />}
//     </>
//   )
// }








import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProduct, formatPrice, errorText } from '../Api.jsx'
import { useShop } from '../context/ShopContext.jsx'
import ProductGallery from '../components/product/ProductGallery.jsx'
import SizeGuide from '../components/product/SizeGuide.jsx'
import ProductAccordion from '../components/product/ProductAccordion.jsx'
import RelatedProducts from '../components/product/RelatedProducts.jsx'

const NO_NOTE = { text: '', ok: false }
const heading = 'font-display text-[1.05rem] font-semibold'
const option = (on) =>
  `border text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-35 disabled:line-through ${on ? 'border-[#1a1716] bg-[#1a1716] text-[#F7F4EF]' : 'border-[#1a1716]/20 hover:border-[#1a1716]'}`

function Breadcrumbs({ p }) {
  const crumbs = [{ name: 'Home', to: '/' }, ...p.breadcrumbs.map((c) => ({ name: c.name, to: `/search?category=${c.slug}` }))]
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-500">
        {crumbs.map((c) => (
          <li key={c.to} className="flex items-center gap-2">
            <Link to={c.to} className="transition-colors hover:text-[#1a1716]">{c.name}</Link>
            <span aria-hidden="true">/</span>
          </li>
        ))}
        <li aria-current="page" className="text-[#1a1716]">{p.name}</li>
      </ol>
    </nav>
  )
}

function Quantity({ qty, setQty, max }) {
  return (
    <div role="group" aria-label="Quantity" className="inline-flex items-center border border-[#1a1716]/20">
      <button type="button" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty(qty - 1)}
        className="h-11 w-11 text-lg transition-colors hover:text-[#B08D57] disabled:opacity-35 disabled:hover:text-inherit">−</button>
      <output aria-live="polite" className="w-10 text-center">{qty}</output>
      <button type="button" aria-label="Increase quantity" disabled={qty >= max} onClick={() => setQty(qty + 1)}
        className="h-11 w-11 text-lg transition-colors hover:text-[#B08D57] disabled:opacity-35 disabled:hover:text-inherit">+</button>
    </div>
  )
}

function Skeleton() {
  return (
    <section className="grid gap-10 px-[2.5vw] py-10 md:grid-cols-2 md:gap-16 md:py-16" aria-busy="true" aria-label="Loading product">
      <div className="aspect-[3/4] animate-pulse bg-[#1a1716]/[0.06]" />
      <div className="space-y-5 md:pt-10">
        <div className="h-3 w-1/4 animate-pulse bg-[#1a1716]/[0.06]" />
        <div className="h-10 w-3/4 animate-pulse bg-[#1a1716]/[0.06]" />
        <div className="h-4 w-1/5 animate-pulse bg-[#1a1716]/[0.06]" />
        <div className="h-24 w-full animate-pulse bg-[#1a1716]/[0.06]" />
        <div className="h-12 w-full animate-pulse bg-[#1a1716]/[0.06]" />
      </div>
    </section>
  )
}

export default function ProductDetail() {
  const { slug } = useParams()
  const { cart, addToCart, wishIds, toggleWish } = useShop()
  const [p, setP] = useState(null)
  const [state, setState] = useState('loading') // loading | ok | missing | error
  const [attempt, setAttempt] = useState(0)
  const [color, setColor] = useState('')
  const [size, setSize] = useState('')
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState(NO_NOTE)
  const [busy, setBusy] = useState(false)
  const [wishBusy, setWishBusy] = useState(false)
  const [guide, setGuide] = useState(false)
  const [ctaVisible, setCtaVisible] = useState(true)
  const ctaRef = useRef(null)

  // Load the product. `live` stops a slow response for the previous product from overwriting the new one.
  useEffect(() => {
    let live = true
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    setState('loading'); setP(null); setColor(''); setSize(''); setQty(1); setNote(NO_NOTE)
    getProduct(slug).then((d) => {
      if (!live) return
      const firstColor = d.colors.find((c) => d.variants.some((v) => v.color === c && v.stock > 0)) || d.colors[0] || ''
      setP(d); setColor(firstColor); setState('ok')
    }).catch((e) => { if (live) setState(/404/.test(e.message) ? 'missing' : 'error') })
    return () => { live = false }
  }, [slug, attempt])

  useEffect(() => {
    if (!p) return
    const prev = document.title
    document.title = `${p.name} - HEEM`
    return () => { document.title = prev }
  }, [p])

  const variants = p?.variants || []
  const needColor = !!p && p.colors.length > 0
  const needSize = !!p && p.sizes.length > 0
  // the exact variant for the chosen colour + size (blank for products without that option)
  const variant = useMemo(
    () => variants.find((v) => (v.color || '') === color && (v.size || '') === size),
    [variants, color, size],
  )

  // How many more can go into the bag: stock and the per-order limit, minus what is already there.
  const inBag = variant ? (cart.items.find((i) => i.variant_id === variant.id)?.quantity || 0) : 0
  const limit = variant && p ? Math.min(variant.stock, p.max_per_order) : 0
  const maxQty = Math.max(limit - inBag, 0)
  const qtyCap = variant ? Math.max(maxQty, 1) : (p?.max_per_order || 1)

  // Keep the quantity only while it is still valid for the chosen variant; otherwise go back to 1.
  useEffect(() => { if (qty > qtyCap) setQty(1) }, [qty, qtyCap])

  // Mobile sticky bar appears whenever the main Add to bag button is off screen.
  useEffect(() => {
    const el = ctaRef.current
    if (!el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(([e]) => setCtaVisible(e.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [state])

  if (state === 'loading') return <Skeleton />
  if (state === 'missing') {
    return (
      <section className="px-[2.5vw] py-32 text-center">
        <h1 className="font-display text-3xl md:text-4xl">This product is not available</h1>
        <p className="mt-4 text-neutral-600">It may have been removed, or the link is incorrect.</p>
        <Link to="/search" className="mt-8 inline-block border-b border-current pb-1 text-sm uppercase tracking-[0.18em] hover:text-[#B08D57]">Browse all products</Link>
      </section>
    )
  }
  if (state === 'error') {
    return (
      <section className="px-[2.5vw] py-32 text-center">
        <h1 className="font-display text-3xl md:text-4xl">We could not load this product</h1>
        <p className="mt-4 text-neutral-600">Check your connection and try again.</p>
        <button type="button" onClick={() => setAttempt((a) => a + 1)}
          className="mt-8 border-b border-current pb-1 text-sm uppercase tracking-[0.18em] hover:text-[#B08D57]">Try again</button>
      </section>
    )
  }

  // ----- derived view data -----
  // Photos of the chosen colour; photos with no colour are shared by every colour and used when a colour has none of its own.
  const own = color ? p.images.filter((im) => im.color === color) : []
  const gallery = (own.length ? own : p.images.filter((im) => !im.color)).slice(0, 6)
  const swatch = (c) => p.images.find((im) => im.color === c)?.image
  const colorInStock = (c) => variants.some((v) => v.color === c && v.stock > 0)
  const sizeInStock = (s) => variants.some((v) => v.size === s && v.stock > 0 && (!color || v.color === color))
  const anyInStock = variants.some((v) => v.stock > 0 && (!color || v.color === color))

  const wished = wishIds.has(p.id)
  const soldOut = !p.in_stock || (!!variant && variant.stock < 1)
  const code = variant?.sku || p.sku
  const price = formatPrice(p.price)

  let qtyMsg = ''
  if (variant && variant.stock > 0 && qty >= qtyCap) {
    if (inBag && maxQty === 0) qtyMsg = `You already have the maximum available (${inBag}) in your bag.`
    else if (inBag) qtyMsg = `You have ${inBag} in your bag. You can add ${maxQty} more.`
    else qtyMsg = p.max_per_order < variant.stock ? `Limit of ${limit} per order.` : `Only ${limit} available.`
  }

  const stockText = variant
    ? (variant.stock < 1 ? 'Sold out' : variant.stock <= 3 ? `Only ${variant.stock} left` : 'In stock')
    : (anyInStock ? 'In stock' : 'Sold out')

  const flag = (text, ok = false) => {
    setNote({ text, ok })
    if (!ok && !ctaVisible) ctaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const pickColor = (c) => {
    setColor(c)
    // keep the chosen size only if this colour still has it in stock
    if (size && !variants.some((v) => v.color === c && v.size === size && v.stock > 0)) setSize('')
    setNote(NO_NOTE)
  }

  const add = async () => {
    if (busy) return
    if (needColor && !color) return flag('Please choose a colour.')
    if (needSize && !size) return flag('Please choose a size.')
    if (!variant) return flag('This combination is not available.')
    if (variant.stock < 1) return flag('Sorry, this option is sold out.')
    if (maxQty < 1) return flag(qtyMsg || 'No more of this item can be added.')
    setBusy(true)
    try {
      await addToCart(variant.id, qty)
      flag(qty > 1 ? `${qty} items added to your bag.` : 'Added to your bag.', true)
      setQty(1)
    } catch (e) {
      flag(errorText(e) || e.message)
    } finally {
      setBusy(false)
    }
  }

  const wish = async () => {
    if (wishBusy) return
    setWishBusy(true)
    try {
      await toggleWish(p.id)
      setNote({ text: wished ? 'Removed from your wishlist.' : 'Saved to your wishlist.', ok: true })
    } catch (e) {
      setNote({ text: errorText(e) || e.message, ok: false })
    } finally {
      setWishBusy(false)
    }
  }

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: p.name, url })
      else { await navigator.clipboard.writeText(url); setNote({ text: 'Link copied.', ok: true }) }
    } catch (e) {
      if (e?.name !== 'AbortError') setNote({ text: 'Could not share this link.', ok: false })
    }
  }

  const sr = p.shipping_returns
  const sections = [
    p.description && { id: 'description', title: 'Product description', body: <p className="whitespace-pre-line">{p.description}</p> },
    p.fabric && { id: 'fabric', title: 'Fabric & materials', body: <p>{p.fabric}</p> },
    (p.fit || p.model_height || p.model_wears || p.size_chart) && {
      id: 'fit', title: 'Size & fit',
      body: (
        <div className="space-y-2">
          {p.fit && <p>Fit: {p.fit}</p>}
          {p.model_height && p.model_wears && <p>The model is {p.model_height} tall and wears size {p.model_wears}.</p>}
          {p.model_height && !p.model_wears && <p>Model height: {p.model_height}.</p>}
          {!p.model_height && p.model_wears && <p>The model wears size {p.model_wears}.</p>}
          {p.size_chart && <button type="button" onClick={() => setGuide(true)} className="underline underline-offset-4 hover:text-[#B08D57]">Open size guide</button>}
        </div>
      ),
    },
    p.care_list.length > 0 && { id: 'care', title: 'Care instructions', body: <ul className="list-disc space-y-1 pl-5">{p.care_list.map((l) => <li key={l}>{l}</li>)}</ul> },
    {
      id: 'shipping', title: 'Shipping & returns',
      body: (
        <ul className="space-y-1">
          <li>Delivery inside Dhaka: {formatPrice(sr.delivery_dhaka)}</li>
          <li>Delivery outside Dhaka: {formatPrice(sr.delivery_outside)}</li>
          <li>Free delivery on orders over {formatPrice(sr.free_over)}</li>
          <li>Return window: {sr.return_days} days</li>
        </ul>
      ),
    },
  ].filter(Boolean)

  const addLabel = busy ? 'Adding…' : soldOut ? 'Sold out' : 'Add to bag'

  return (
    <>
      <section className="px-[2.5vw] pb-10 pt-6 md:pb-16">
        <Breadcrumbs p={p} />
        <div className="mt-6 grid gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-14">
          <ProductGallery key={color} images={gallery} name={p.name} />

          <div className="md:sticky md:top-24 md:max-h-[calc(100svh-7rem)] md:self-start md:overflow-y-auto md:pr-2">
            <p className="text-sm text-neutral-500">{p.collection_name || p.category_name}</p>
            <h1 className="mt-2 font-display text-4xl uppercase leading-tight md:text-5xl">{p.name}</h1>
            <p className="mt-4 flex flex-wrap items-baseline gap-x-3 text-xl">
              <span>{price}</span>
              {p.compare_at_price && (
                <>
                  <s className="text-base text-neutral-500"><span className="sr-only">Original price </span>{formatPrice(p.compare_at_price)}</s>
                  <span className="text-sm text-[#8a6d3b]">{p.discount_percent}% off</span>
                </>
              )}
            </p>
            {p.short_description && <p className="mt-6 max-w-md text-neutral-600">{p.short_description}</p>}

            {needColor && (
              <div className="mt-8">
                <p className={`mb-3 ${heading}`}>Colour{color && <span className="ml-2 font-body text-sm font-normal text-neutral-500">{color}</span>}</p>
                <div className="flex flex-wrap gap-2">
                  {p.colors.map((c) => {
                    const ok = colorInStock(c)
                    const img = swatch(c)
                    return (
                      <button key={c} type="button" aria-pressed={color === c} disabled={!ok} onClick={() => pickColor(c)}
                        aria-label={ok ? c : `${c}, sold out`} title={ok ? c : `${c} - sold out`}
                        className={`flex items-center gap-2 border text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-35 disabled:line-through ${img ? 'p-1.5 pr-3' : 'px-4 py-2'} ${color === c ? 'border-[#1a1716]' : 'border-[#1a1716]/20 hover:border-[#1a1716]'}`}>
                        {img && <span className="block h-9 w-7 shrink-0 overflow-hidden bg-[#1a1716]/[0.06]"><img src={img} alt="" loading="lazy" className="h-full w-full object-cover" /></span>}
                        <span>{c}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {needSize && (
              <div className="mt-8">
                <div className="mb-3 flex items-baseline justify-between">
                  <p className={heading}>Size{size && <span className="ml-2 font-body text-sm font-normal text-neutral-500">{size}</span>}</p>
                  {p.size_chart && <button type="button" onClick={() => setGuide(true)} className="text-sm underline underline-offset-4 hover:text-[#B08D57]">Size guide</button>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.sizes.map((s) => (
                    <button key={s} type="button" aria-pressed={size === s} disabled={!sizeInStock(s)}
                      onClick={() => { setSize(s); setNote(NO_NOTE) }}
                      aria-label={sizeInStock(s) ? `Size ${s}` : `Size ${s}, sold out`}
                      className={`min-w-12 px-4 py-2 ${option(size === s)}`}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8">
              <p className={`mb-3 ${heading}`}>Quantity</p>
              <Quantity qty={qty} setQty={setQty} max={qtyCap} />
              <p className="mt-2 min-h-5 text-sm text-neutral-500" role="status">{qtyMsg}</p>
            </div>

            <p className="mt-4 text-sm text-neutral-500">
              {stockText}{code && <span className="ml-4">Product code: {code}</span>}
            </p>

            <div className="mt-4 space-y-3 md:max-w-md">
              <button ref={ctaRef} type="button" onClick={add} disabled={soldOut || busy}
                className="w-full bg-[#1a1716] py-4 text-sm uppercase tracking-[0.2em] text-[#F7F4EF] transition-colors hover:bg-[#B08D57] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#1a1716]">
                {addLabel}
              </button>
              <button type="button" onClick={wish} disabled={wishBusy} aria-pressed={wished}
                className="flex w-full items-center justify-center gap-3 border border-[#1a1716]/20 py-4 text-sm uppercase tracking-[0.2em] transition-colors hover:border-[#1a1716] disabled:opacity-50">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill={wished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
                  <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
                </svg>
                {wished ? 'Remove from wishlist' : 'Add to wishlist'}
              </button>
            </div>

            <p className={`mt-3 min-h-6 text-sm ${note.ok ? 'text-neutral-700' : 'text-[#8a6d3b]'}`} role="status">{note.text}</p>
            <button type="button" onClick={share} className="mt-2 text-sm underline underline-offset-4 hover:text-[#B08D57]">Share this product</button>
          </div>
        </div>
      </section>

      <section className="border-t border-[#1a1716]/15 px-[2.5vw] py-12 md:py-16" aria-label="Product information">
        <div className="max-w-4xl"><ProductAccordion items={sections} /></div>
      </section>

      <RelatedProducts slug={p.slug} />

      {/* Phone only: keeps Add to bag in reach once the main button has scrolled away */}
      <div inert={ctaVisible} className={`fixed inset-x-0 bottom-0 z-40 flex items-center gap-4 border-t border-[#1a1716]/15 bg-[#F7F4EF] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-transform duration-300 motion-reduce:transition-none md:hidden ${ctaVisible ? 'translate-y-full' : 'translate-y-0'}`}>
        <span className="text-lg">{price}</span>
        <button type="button" onClick={add} disabled={soldOut || busy}
          className="flex-1 bg-[#1a1716] py-3.5 text-sm uppercase tracking-[0.2em] text-[#F7F4EF] disabled:opacity-40">{addLabel}</button>
      </div>

      {guide && p.size_chart && <SizeGuide chart={p.size_chart} onClose={() => setGuide(false)} />}
    </>
  )
}