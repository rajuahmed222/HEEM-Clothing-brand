import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProducts } from '../Api.jsx'
import { mediaUrl } from '../components/ProductCard.jsx'
import useSiteMedia from '../lib/siteMedia.js'
import { CAMPAIGN, INTRO, GALLERY, QUOTE, LOOKS, CAMPAIGNS } from '../data/lookbook.js'
import Hero from '../components/lookbook/Hero.jsx'
import Intro from '../components/lookbook/Intro.jsx'
import Gallery from '../components/lookbook/Gallery.jsx'
import ShopTheLook from '../components/lookbook/ShopTheLook.jsx'
import Campaigns from '../components/lookbook/Campaigns.jsx'
import { Reveal, pad } from '../components/lookbook/parts.jsx'

// Lookbook: an editorial page, not a product list.
// Pictures: Admin > Site media > "Lookbook page". Until one is uploaded the slot shows a real product photo, then a dark tonal block.
export default function Lookbook() {
  const sm = useSiteMedia()
  const [products, setProducts] = useState([])

  useEffect(() => {
    let live = true
    getProducts('')
      .then((d) => { const list = Array.isArray(d) ? d : d?.results || []; if (live) setProducts(list) })
      .catch(() => {}) // shop offline: the page still reads well without products
    return () => { live = false }
  }, [])

  // real product photos, used only while a slot has no upload
  const pool = products.map((p) => mediaUrl(p.images?.[0]?.image)).filter(Boolean)
  const spare = (i) => (pool.length ? pool[i % pool.length] : '')
  const srcFor = (key, i = 0) => sm.url(key) || spare(i)
  const lookSrc = (key, firstProduct, i) => sm.url(key) || mediaUrl(firstProduct?.images?.[0]?.image) || spare(i)

  return (
    <main className="overflow-x-clip bg-[#080808] font-sans text-white">
      <Hero campaign={CAMPAIGN} src={sm.url('lb_hero') || spare(0)} />
      <Intro intro={INTRO} src={sm.url('lb_intro') || spare(1)} />
      <Gallery items={GALLERY} quote={QUOTE} srcFor={(key, n) => srcFor(key, n + 2)} />
      <ShopTheLook looks={LOOKS} products={products} srcFor={lookSrc} />
      <Campaigns items={CAMPAIGNS} srcFor={(key, i) => srcFor(key, i + 5)} />

      <section className={`${pad} border-t border-white/10 py-24 text-center md:py-36`}>
        <Reveal>
          <p className="font-display text-3xl uppercase md:text-6xl">Wear your identity.</p>
          <Link to="/new" className="mt-10 inline-block border-b border-current pb-1 text-xs uppercase tracking-[0.3em] text-[#B08D57] transition-colors hover:text-white">Shop the collection →</Link>
        </Reveal>
      </section>
    </main>
  )
}