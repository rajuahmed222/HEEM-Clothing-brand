// // import { useEffect, useState } from 'react'
// // import { getRelatedProducts } from  "../../Api.jsx"
// // import ProductCard from '../ProductCard.jsx'

// // // 4 cards on phones (2 columns), 6 on tablets (3 columns), 8 on large screens (4 columns).
// // const visible = (i) => (i >= 6 ? 'hidden xl:block' : i >= 4 ? 'hidden md:block' : '')

// // export default function RelatedProducts({ slug }) {
// //   const [items, setItems] = useState([])

// //   useEffect(() => {
// //     const ctl = new AbortController()
// //     setItems([])
// //     getRelatedProducts(slug, ctl.signal).then(setItems).catch(() => {}) // no related items is fine: section just hides
// //     return () => ctl.abort()
// //   }, [slug])

// //   if (!items.length) return null
// //   return (
// //     <section aria-labelledby="related-title" className="border-t border-[#1a1716]/15 px-[2.5vw] py-16 md:py-24">
// //       <h2 id="related-title" className="font-display text-3xl uppercase md:text-4xl">You may also like</h2>
// //       <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
// //         {items.slice(0, 8).map((p, i) => <ProductCard key={p.id} p={p} i={i} showColors className={visible(i)} />)}
// //       </div>
// //     </section>
// //   )
// // }


// import { useEffect, useState } from 'react'
// import { getRelatedProducts } from '../../Api.jsx'
// import ProductCard from '../ProductCard.jsx'

// // Related products on the product page. Same card as everywhere else, but with the
// // wishlist heart and Quick add switched off: this page already has its own Add to bag.
// export default function RelatedProducts({ slug }) {
//   const [items, setItems] = useState(null) // null = loading

//   useEffect(() => {
//     const ctl = new AbortController()
//     setItems(null)
//     getRelatedProducts(slug, ctl.signal)
//       .then((d) => {
//         const list = Array.isArray(d) ? d : d?.results || []
//         setItems(list.filter((x) => x.slug !== slug).slice(0, 4))
//       })
//       .catch((e) => { if (e.name !== 'AbortError') setItems([]) })
//     return () => ctl.abort()
//   }, [slug])

//   if (items && items.length === 0) return null

//   return (
//     <section className="border-t border-[#1a1716]/15 px-[2.5vw] py-12 md:py-16" aria-label="Related products">
//       <h2 className="mb-10 font-display text-3xl uppercase md:text-4xl">You may also like</h2>
//       <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4" aria-busy={items === null}>
//         {items === null
//           ? [0, 1, 2, 3].map((n) => (
//               <div key={n} aria-hidden="true">
//                 <div className="aspect-[3/4] animate-pulse bg-[#1a1716]/[0.06]" />
//                 <div className="mt-4 h-3 w-3/4 animate-pulse bg-[#1a1716]/[0.06]" />
//                 <div className="mt-2 h-3 w-1/4 animate-pulse bg-[#1a1716]/[0.06]" />
//               </div>
//             ))
//           : items.map((p, n) => <ProductCard key={p.id ?? p.slug} p={p} i={n} showWishlist={false} showQuickAdd={false} />)}
//       </div>
//     </section>
//   )
// }



import { useEffect, useState } from 'react'
import { getRelatedProducts } from '../../Api.jsx'
import ProductCard from '../ProductCard.jsx'

// Related products on the product page. Same card as everywhere else: heart, Quick add and the second photo on hover.
export default function RelatedProducts({ slug }) {
  const [items, setItems] = useState(null) // null = loading

  useEffect(() => {
    const ctl = new AbortController()
    setItems(null)
    getRelatedProducts(slug, ctl.signal)
      .then((d) => {
        const list = Array.isArray(d) ? d : d?.results || []
        setItems(list.filter((x) => x.slug !== slug).slice(0, 4))
      })
      .catch((e) => { if (e.name !== 'AbortError') setItems([]) })
    return () => ctl.abort()
  }, [slug])

  if (items && items.length === 0) return null

  return (
    <section className="border-t border-[#1a1716]/15 px-[2.5vw] py-12 md:py-16" aria-label="Related products">
      <h2 className="mb-10 font-display text-3xl uppercase md:text-4xl">You may also like</h2>
      <div className="grid grid-cols-2 gap-x-[10px] gap-y-8 sm:gap-x-3 md:grid-cols-4 md:gap-x-4 md:gap-y-10 lg:gap-x-5 2xl:gap-x-6" aria-busy={items === null}>
        {items === null
          ? [0, 1, 2, 3].map((n) => (
              <div key={n} aria-hidden="true">
                <div className="aspect-[3/4] animate-pulse bg-[#1a1716]/[0.06]" />
                <div className="mt-4 h-3 w-3/4 animate-pulse bg-[#1a1716]/[0.06]" />
                <div className="mt-2 h-3 w-1/4 animate-pulse bg-[#1a1716]/[0.06]" />
              </div>
            ))
          : items.map((p, n) => <ProductCard key={p.id ?? p.slug} p={p} i={n} showQuickAdd />)}
      </div>
    </section>
  )
}