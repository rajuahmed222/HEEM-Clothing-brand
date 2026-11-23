// import { useEffect, useMemo, useState } from 'react'
// import { Link } from 'react-router-dom'
// import { formatPrice, errorText } from '../Api.jsx'
// import { Img } from '../components/ProductCard.jsx'
// import RecommendedProducts from '../components/RecommendedProducts.jsx'
// import { useShop } from '../context/ShopContext.jsx'
// import { useAuth } from '../context/AuthContext.jsx'

// const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
// const textBtn = 'text-sm underline underline-offset-4 transition-colors hover:text-[#B08D57] disabled:opacity-40 disabled:no-underline'
// const chip = (on) =>
//   `border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-35 disabled:line-through ${on ? 'border-[#1a1716] bg-[#1a1716] text-[#F7F4EF]' : 'border-[#1a1716]/20 hover:border-[#1a1716]'}`

// function Header({ count }) {
//   return (
//     <header className="pb-10 pt-12 md:pt-20">
//       <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Wishlist</p>
//       <h1 className="mt-4 font-display text-5xl uppercase leading-none md:text-7xl">Saved for you</h1>
//       {count > 0 && <p className="mt-5 text-xs uppercase tracking-[0.2em] text-neutral-500">{count} {count === 1 ? 'product' : 'products'}</p>}
//     </header>
//   )
// }

// function WishCard({ item, i, onMessage }) {
//   const { moveToCart, toggleWish } = useShop()
//   const variants = item.variants

//   const colors = useMemo(() => [...new Set(variants.map((v) => v.color).filter(Boolean))], [variants])
//   const sizes = useMemo(() => {
//     const all = [...new Set(variants.map((v) => v.size).filter(Boolean))]
//     return [...SIZE_ORDER.filter((s) => all.includes(s)), ...all.filter((s) => !SIZE_ORDER.includes(s)).sort()]
//   }, [variants])

//   const firstColor = colors.find((c) => variants.some((v) => v.color === c && v.stock > 0)) || colors[0] || ''
//   const [color, setColor] = useState(firstColor)
//   const [size, setSize] = useState('')
//   const [busy, setBusy] = useState(false)
//   const [note, setNote] = useState('')

//   const variant = variants.find((v) => (v.color || '') === color && (v.size || '') === size)
//   const colorInStock = (c) => variants.some((v) => v.color === c && v.stock > 0)
//   const sizeInStock = (s) => variants.some((v) => v.size === s && v.stock > 0 && (!color || v.color === color))

//   const pickColor = (c) => {
//     setColor(c)
//     if (size && !variants.some((v) => v.color === c && v.size === size && v.stock > 0)) setSize('')
//     setNote('')
//   }

//   const move = async () => {
//     if (busy) return
//     if (colors.length && !color) return setNote('Please choose a colour.')
//     if (sizes.length && !size) return setNote('Please choose a size.')
//     if (!variant) return setNote('This combination is not available.')
//     if (variant.stock < 1) return setNote('Sorry, this option is sold out.')
//     setBusy(true)
//     try {
//       await moveToCart(item.product_id, variant.variant_id)
//       onMessage(`${item.name} moved to your bag.`)
//     } catch (e) {
//       setNote(errorText(e) || e.message)
//       setBusy(false)
//     }
//   }

//   const remove = async () => {
//     if (busy) return
//     setBusy(true)
//     try {
//       await toggleWish(item.product_id)
//       onMessage(`${item.name} removed from your wishlist.`)
//     } catch (e) {
//       setNote(errorText(e) || e.message)
//       setBusy(false)
//     }
//   }

//   return (
//     <article className="flex flex-col">
//       <div className="relative aspect-[3/4] overflow-hidden">
//         <Link to={`/product/${item.slug}`} aria-label={item.name} className="absolute inset-0 z-[1]" />
//         <Img src={item.image} alt={item.name} i={i} />
//         <button type="button" onClick={remove} disabled={busy} aria-label={`Remove ${item.name} from wishlist`}
//           className="absolute right-3 top-3 z-10 bg-[#F7F4EF]/85 px-2.5 py-1 text-lg leading-none transition-colors hover:text-[#B08D57] disabled:opacity-40">×</button>
//         {!item.in_stock && (
//           <span className="absolute left-3 top-3 z-10 bg-[#F7F4EF]/90 px-2 py-1 text-xs uppercase tracking-[0.15em]">Sold out</span>
//         )}
//       </div>

//       <h2 className="mt-4 text-sm uppercase tracking-[0.12em]">
//         <Link to={`/product/${item.slug}`} className="transition-colors hover:text-[#B08D57]">{item.name}</Link>
//       </h2>
//       <p className="mt-1 text-neutral-600">{formatPrice(item.price)}</p>

//       {item.in_stock && colors.length > 0 && (
//         <div className="mt-4">
//           <p className="mb-2 text-xs uppercase tracking-[0.15em] text-neutral-500">Colour{color && `: ${color}`}</p>
//           <div className="flex flex-wrap gap-2">
//             {colors.map((c) => (
//               <button key={c} type="button" aria-pressed={color === c} disabled={!colorInStock(c)} onClick={() => pickColor(c)}
//                 aria-label={colorInStock(c) ? c : `${c}, sold out`} className={chip(color === c)}>{c}</button>
//             ))}
//           </div>
//         </div>
//       )}
//       {item.in_stock && sizes.length > 0 && (
//         <div className="mt-4">
//           <p className="mb-2 text-xs uppercase tracking-[0.15em] text-neutral-500">Size{size && `: ${size}`}</p>
//           <div className="flex flex-wrap gap-2">
//             {sizes.map((s) => (
//               <button key={s} type="button" aria-pressed={size === s} disabled={!sizeInStock(s)}
//                 onClick={() => { setSize(s); setNote('') }} aria-label={sizeInStock(s) ? `Size ${s}` : `Size ${s}, sold out`}
//                 className={`min-w-11 ${chip(size === s)}`}>{s}</button>
//             ))}
//           </div>
//         </div>
//       )}

//       <button type="button" onClick={move} disabled={!item.in_stock || busy}
//         className="mt-5 w-full bg-[#1a1716] py-3.5 text-sm uppercase tracking-[0.2em] text-[#F7F4EF] transition-colors hover:bg-[#B08D57] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#1a1716]">
//         {busy ? 'Please wait…' : item.in_stock ? 'Add to bag' : 'Sold out'}
//       </button>
//       <p role="alert" className="mt-2 min-h-5 text-sm text-[#8a6d3b]">{note}</p>
//     </article>
//   )
// }

// export default function Wishlist() {
//   const { wish, loaded, error, refresh } = useShop()
//   const { user } = useAuth()
//   const [message, setMessage] = useState('')

//   useEffect(() => { document.title = 'Wishlist - HEEM' }, [])

//   const status = <p role="status" className="min-h-6 pb-4 text-sm text-neutral-700">{message}</p>
//   const guestNote = !user && (
//     <p className="pb-6 text-sm text-neutral-600">
//       <Link to="/login" className={textBtn}>Sign in</Link> to keep your wishlist on every device.
//     </p>
//   )

//   if (!loaded) {
//     return (
//       <section className="px-[2.5vw] pb-24">
//         <Header count={0} />
//         <div aria-hidden="true" className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
//           {[0, 1, 2, 3].map((i) => <div key={i} className="aspect-[3/4] animate-pulse bg-[#1a1716]/[0.06]" />)}
//         </div>
//       </section>
//     )
//   }
//   if (error && wish.length === 0) {
//     return (
//       <section className="px-[2.5vw] pb-24">
//         <Header count={0} />
//         <p className="text-neutral-600">We could not load your wishlist. {error}</p>
//         <button type="button" onClick={refresh} className={`mt-6 ${textBtn}`}>Try again</button>
//       </section>
//     )
//   }

//   const recommended = <RecommendedProducts exclude={new Set(wish.map((w) => w.product_id))} />

//   if (wish.length === 0) {
//     return (
//       <section className="px-[2.5vw] pb-24">
//         <Header count={0} />
//         {status}
//         {guestNote}
//         <div className="py-10 text-center md:py-20">
//           <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Nothing saved yet</p>
//           <h2 className="mx-auto mt-4 max-w-xl font-display text-3xl md:text-4xl">Tap the heart on anything you love</h2>
//           <Link to="/search" className="mt-10 inline-block bg-[#1a1716] px-10 py-4 text-sm uppercase tracking-[0.2em] text-[#F7F4EF] transition-colors hover:bg-[#B08D57]">
//             Discover the Collection
//           </Link>
//         </div>
//         {recommended}
//       </section>
//     )
//   }

//   return (
//     <section className="px-[2.5vw] pb-24">
//       <Header count={wish.length} />
//       {status}
//       {guestNote}
//       <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 xl:grid-cols-4">
//         {wish.map((item, i) => <WishCard key={item.product_id} item={item} i={i} onMessage={setMessage} />)}
//       </div>
//       <p className="mt-12">
//         <Link to="/search" className={textBtn}>Continue shopping</Link>
//       </p>
//       {recommended}
//     </section>
//   )
// }




import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard.jsx'
import RecommendedProducts from '../components/RecommendedProducts.jsx'
import { useShop } from '../context/ShopContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const textBtn = 'text-sm underline underline-offset-4 transition-colors hover:text-[#B08D57] disabled:opacity-40 disabled:no-underline'

function Header({ count }) {
  return (
    <header className="pb-10 pt-12 md:pt-20">
      <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Wishlist</p>
      <h1 className="mt-4 font-display text-5xl uppercase leading-none md:text-7xl">Saved for you</h1>
      {count > 0 && <p className="mt-5 text-xs uppercase tracking-[0.2em] text-neutral-500">{count} {count === 1 ? 'product' : 'products'}</p>}
    </header>
  )
}

export default function Wishlist() {
  const { wish, loaded, error, refresh, moveToCart } = useShop()
  const { user } = useAuth()
  const [message, setMessage] = useState('')

  useEffect(() => { document.title = 'Wishlist - HEEM' }, [])

  const status = <p role="status" className="min-h-6 pb-4 text-sm text-neutral-700">{message}</p>
  const guestNote = !user && (
    <p className="pb-6 text-sm text-neutral-600">
      <Link to="/login" className={textBtn}>Sign in</Link> to keep your wishlist on every device.
    </p>
  )

  if (!loaded) {
    return (
      <section className="px-[2.5vw] pb-24">
        <Header count={0} />
        <div aria-hidden="true" className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="aspect-[3/4] animate-pulse bg-[#1a1716]/[0.06]" />)}
        </div>
      </section>
    )
  }
  if (error && wish.length === 0) {
    return (
      <section className="px-[2.5vw] pb-24">
        <Header count={0} />
        <p className="text-neutral-600">We could not load your wishlist. {error}</p>
        <button type="button" onClick={refresh} className={`mt-6 ${textBtn}`}>Try again</button>
      </section>
    )
  }

  const recommended = <RecommendedProducts exclude={new Set(wish.map((w) => w.product_id))} />

  if (wish.length === 0) {
    return (
      <section className="px-[2.5vw] pb-24">
        <Header count={0} />
        {status}
        {guestNote}
        <div className="py-10 text-center md:py-20">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Nothing saved yet</p>
          <h2 className="mx-auto mt-4 max-w-xl font-display text-3xl md:text-4xl">Tap the heart on anything you love</h2>
          <Link to="/search" className="mt-10 inline-block bg-[#1a1716] px-10 py-4 text-sm uppercase tracking-[0.2em] text-[#F7F4EF] transition-colors hover:bg-[#B08D57]">
            Discover the Collection
          </Link>
        </div>
        {recommended}
      </section>
    )
  }

  return (
    <section className="px-[2.5vw] pb-24">
      <Header count={wish.length} />
      {status}
      {guestNote}
      <div className="grid grid-cols-2 gap-x-[10px] gap-y-8 sm:gap-x-3 md:grid-cols-3 md:gap-x-4 md:gap-y-12 lg:grid-cols-4 lg:gap-x-5 2xl:grid-cols-5 2xl:gap-x-6">
        {wish.map((item, i) => (
          <ProductCard
            key={item.product_id}
            p={item}
            i={i}
            showQuickAdd
            // from the wishlist an add moves the item to the bag (same as the old "Add to bag" button)
            onQuickAdd={(variant) => moveToCart(item.product_id, variant.id)}
            onAdded={(it) => setMessage(`${it.name} moved to your bag.`)}
            onWishToggle={(saved, it) => { if (!saved) setMessage(`${it.name} removed from your wishlist.`) }}
          />
        ))}
      </div>
      <p className="mt-12">
        <Link to="/search" className={textBtn}>Continue shopping</Link>
      </p>
      {recommended}
    </section>
  )
}