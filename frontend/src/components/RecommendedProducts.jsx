import { useEffect, useState } from 'react'
import { searchProducts } from '../Api.jsx'
import ProductCard from './ProductCard.jsx'

// Featured products from the existing search API, minus anything the page already shows (`exclude` = Set of product ids).
export default function RecommendedProducts({ exclude, title = 'You may also like' }) {
  const [items, setItems] = useState([])

  useEffect(() => {
    const ctl = new AbortController()
    searchProducts('sort=featured&page_size=8', ctl.signal).then((d) => setItems(d.results)).catch(() => {})
    return () => ctl.abort()
  }, [])

  const shown = items.filter((p) => !exclude?.has(p.id)).slice(0, 4)
  if (!shown.length) return null
  return (
    <section aria-labelledby="recommended-title" className="mt-20 border-t border-[#1a1716]/15 pt-14">
      <h2 id="recommended-title" className="font-display text-3xl uppercase md:text-4xl">{title}</h2>
      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
        {shown.map((p, i) => <ProductCard key={p.id} p={p} i={i} showQuickAdd />)}
      </div>
    </section>
  )
}