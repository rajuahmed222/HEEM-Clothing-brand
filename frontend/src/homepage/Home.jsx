

// import { useEffect, useRef, useState } from 'react'
// import { Link } from 'react-router-dom'
// import { getProducts } from "../Api.jsx"
// import ProductCard, { mediaUrl } from '../components/ProductCard.jsx'
// import useSiteMedia from '../lib/siteMedia.js'

// // Defaults. The owner replaces any of them in Admin > Site media; empty = tonal placeholder.
// const IMG = { hero: '/fashion.mp4', origin: '', men: '', women: '', cta: '' }

// const tones = [
//   'linear-gradient(160deg,#cfc6b8,#8f8372)',
//   'linear-gradient(160deg,#3b3633,#141211)',
//   'linear-gradient(160deg,#d9d2c7,#b9ad9b)',
//   'linear-gradient(160deg,#6b5f52,#2a2420)',
//   'linear-gradient(160deg,#a89d8d,#5b5045)',
//   'linear-gradient(160deg,#2b2623,#0e0c0b)',
// ]

// const btn = 'inline-block border border-current px-8 py-3 text-sm uppercase tracking-[0.2em] transition-colors duration-500 hover:bg-[#F7F4EF] hover:text-[#1a1716]'
// const link = 'inline-block border-b border-current pb-1 text-sm uppercase tracking-[0.18em] transition-colors hover:text-[#B08D57]'
// const pad = 'px-[2.5vw] py-24 md:py-36'

// function Media({ src, tone = 0, alt = '', className = '' }) {
//   const cls = `h-full w-full object-cover ${className}`
//   src = mediaUrl(src)
//   if (src && /\.(mp4|webm)(\?|$)/i.test(src))
//     return <video className={cls} src={src} autoPlay muted loop playsInline />
//   if (src) return <img className={cls} src={src} alt={alt} loading="lazy" />
//   return <div className={`h-full w-full ${className}`} style={{ background: tones[tone % tones.length] }} aria-hidden="true" />
// }

// function Reveal({ children, className = '', delay = 0 }) {
//   const ref = useRef(null)
//   useEffect(() => {
//     const el = ref.current
//     // very old browsers have no IntersectionObserver: show the content instead of crashing or hiding it
//     if (!('IntersectionObserver' in window)) { el.classList.add('in'); return }
//     const io = new IntersectionObserver(([e]) => {
//       if (e.isIntersecting) { el.classList.add('in'); io.disconnect() }
//     }, { threshold: 0.12 })
//     io.observe(el)
//     return () => io.disconnect()
//   }, [])
//   return <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`reveal ${className}`}>{children}</div>
// }

// const FALLBACK = [
//   { name: 'ORIGIN Canvas Jacket', price: 4290, images: [] },
//   { name: 'Signature Oversized Tee', price: 1890, images: [] },
//   { name: 'Essential Relaxed Shirt', price: 2790, images: [] },
//   { name: 'HEEM Structured Pants', price: 3490, images: [] },
// ]

// export default function Home() {
//   const [products, setProducts] = useState(FALLBACK)
//   const sm = useSiteMedia()
//   const m = (key, fallback = '') => sm.url(key) || fallback
//   const track = useRef(null)
//   const [edge, setEdge] = useState({ start: true, end: false })
//   const sync = () => {
//     const t = track.current
//     if (t) setEdge({ start: t.scrollLeft < 4, end: t.scrollLeft + t.clientWidth >= t.scrollWidth - 4 })
//   }
//   useEffect(() => {
//     sync()
//     window.addEventListener('resize', sync)
//     return () => window.removeEventListener('resize', sync)
//   }, [products])
//   const slide = (d) => track.current?.scrollBy({ left: d * track.current.clientWidth * 0.8, behavior: 'smooth' })

//   useEffect(() => {
//     getProducts('?signature=true')
//       .then((d) => { if (d.length) setProducts(d.slice(0, 12)) })
//       .catch(() => {}) // backend off: keep placeholder products
//   }, [])

//   return (
//     <>
//       {/* 01 Hero video, kept clean */}
//       <section className="hero-in h-[calc(75svh-3.5rem)] overflow-hidden nav:h-[calc(75svh-4rem)]">
//         <h1 className="sr-only">HEEM</h1>
//         <Media src={m('home_hero', IMG.hero)} tone={5} alt="HEEM campaign" />
//       </section>

//       {/* Tagline under hero */}
//       <div className="px-[2.5vw] py-14 text-center md:py-20">
//         <Reveal>
//           <p className="font-display text-3xl uppercase md:text-5xl">Wear your identity.</p>
//         </Reveal>
//       </div>

//       {/* 02 Men and women */}
//       <section className="grid md:grid-cols-2">
//         {[['Men', m('home_men', IMG.men), 2], ['Women', m('home_women', IMG.women), 4]].map(([n, src, t]) => (
//           <Link key={n} to={`/${n.toLowerCase()}`} className="group relative block h-[70vh] overflow-hidden text-[#F7F4EF]">
//             <div className="absolute inset-0 transition-transform duration-[1500ms] ease-out group-hover:scale-105"><Media src={src} tone={t} alt={n} /></div>
//             <div className="absolute inset-0 bg-black/10 transition-colors duration-700 group-hover:bg-black/40" />
//             <div className="absolute bottom-10 left-8 transition-transform duration-700 group-hover:-translate-y-2">
//               <h2 className="font-display text-6xl uppercase md:text-7xl">{n}</h2>
//               <span className="mt-4 inline-block text-sm uppercase tracking-[0.18em] opacity-90 transition-opacity duration-700 group-hover:opacity-100">Explore {n.toLowerCase()} →</span>
//             </div>
//           </Link>
//         ))}
//       </section>

//       {/* 03 Signature */}
//       <section className={pad}>
//         <Reveal className="mb-14 text-center">
//           <h2 className="font-display text-4xl uppercase md:text-6xl">HEEM Signature</h2>
//           <p className="mt-4 text-neutral-600">Pieces that define the HEEM identity.</p>
//         </Reveal>

//         <div className="relative">
//           {/* left / right slide buttons */}
//           {[-1, 1].map((d) => (
//             <button
//               key={d}
//               type="button"
//               onClick={() => slide(d)}
//               disabled={d < 0 ? edge.start : edge.end}
//               aria-label={d < 0 ? 'Previous products' : 'Next products'}
//               className={`absolute top-1/3 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-[#1a1716]/25 bg-[#F7F4EF]/90 backdrop-blur transition enabled:hover:border-[#1a1716] enabled:hover:bg-[#1a1716] enabled:hover:text-[#F7F4EF] disabled:pointer-events-none disabled:opacity-0 ${d < 0 ? 'left-2 md:-left-3' : 'right-2 md:-right-3'}`}
//             >
//               <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d={d < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} /></svg>
//             </button>
//           ))}

//           <div
//             ref={track}
//             onScroll={sync}
//             className="-mx-[2.5vw] flex snap-x snap-mandatory gap-[10px] overflow-x-auto sm:gap-3 md:gap-4 lg:gap-5 scroll-smooth px-[2.5vw] pb-4 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden"
//           >
//             {products.map((p, i) => (
//               <ProductCard key={p.slug || p._id || p.id || p.name} p={p} i={i} showQuickAdd className="w-[46%] shrink-0 snap-start sm:w-[32%] md:w-[28%] lg:w-[23%] 2xl:w-[19%]" />
//             ))}
//           </div>
//         </div>

//         <Reveal className="mt-14 text-center"><Link to="/search" className={link}>View all products →</Link></Reveal>
//       </section>

//       {/* 04 New collection */}
//       <section className={pad}>
//         <div className="grid gap-12 md:grid-cols-12 md:items-end">
//           <Reveal className="md:col-span-7">
//             <div className="aspect-[4/5] overflow-hidden"><Media src={m('home_origin', IMG.origin)} tone={0} alt="ORIGIN 01" /></div>
//           </Reveal>
//           <div className="md:col-span-5">
//             <Reveal>
//               <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">ORIGIN 01</p>
//               <h2 className="mt-4 font-display text-5xl uppercase leading-[0.95] md:text-7xl">The new standard</h2>
//               <p className="mt-6 max-w-sm text-neutral-600">Discover the latest HEEM collection.</p>
//             </Reveal>
//             <Reveal delay={150} className="mt-10 grid grid-cols-2 gap-3">
//               {['Full outfit', 'Fabric detail', 'Product close-up', 'Model styling'].map((l, i) => (
//                 <div key={l}>
//                   <div className="aspect-[4/5] overflow-hidden"><Media src={m(`home_origin_${i + 1}`)} tone={i + 1} alt={l} /></div>
//                   <p className="mt-2 text-sm text-neutral-600">{l}</p>
//                 </div>
//               ))}
//             </Reveal>
//             <Reveal className="mt-10"><a href="#" className={link}>Explore collection →</a></Reveal>
//           </div>
//         </div>
//       </section>

//       {/* 05 Final CTA */}
//       <section className="relative overflow-hidden text-center text-[#F7F4EF]">
//         <div className="absolute inset-0"><Media src={m('home_cta', IMG.cta)} tone={5} alt="" /></div>
//         <div className="absolute inset-0 bg-black/45" />
//         <div className="relative px-6 py-32 md:py-44">
//           <Reveal>
//             <p className="font-display text-xl tracking-[0.4em] pl-[0.4em]">THIS IS HEEM.</p>
//             <h2 className="mt-6 font-display text-5xl uppercase leading-none md:text-8xl">Discover your next look.</h2>
//             <div className="mt-10"><a href="#" className={btn}>Shop the collection →</a></div>
//           </Reveal>
//         </div>
//       </section>

//     </>
//   )
// }





import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProducts } from "../Api.jsx"
import ProductCard, { mediaUrl } from '../components/ProductCard.jsx'
import useSiteMedia from '../lib/siteMedia.js'

// Defaults. The owner replaces any of them in Admin > Site media; empty = tonal placeholder.
const IMG = { hero: '/fashion.mp4', origin: '', men: '', women: '', cta: '' }

const tones = [
  'linear-gradient(160deg,#cfc6b8,#8f8372)',
  'linear-gradient(160deg,#3b3633,#141211)',
  'linear-gradient(160deg,#d9d2c7,#b9ad9b)',
  'linear-gradient(160deg,#6b5f52,#2a2420)',
  'linear-gradient(160deg,#a89d8d,#5b5045)',
  'linear-gradient(160deg,#2b2623,#0e0c0b)',
]

const btn = 'inline-block border border-current px-6 py-3 text-sm uppercase tracking-[0.16em] transition-colors duration-500 sm:px-8 sm:tracking-[0.2em] hover:bg-[#F7F4EF] hover:text-[#1a1716]'
const link = 'inline-block border-b border-current pb-1 text-sm uppercase tracking-[0.18em] transition-colors hover:text-[#B08D57]'
const pad = 'px-[2.5vw] py-24 md:py-36'

function Media({ src, tone = 0, alt = '', className = '' }) {
  const cls = `h-full w-full object-cover ${className}`
  src = mediaUrl(src)
  if (src && /\.(mp4|webm)(\?|$)/i.test(src))
    return <video className={cls} src={src} autoPlay muted loop playsInline />
  if (src) return <img className={cls} src={src} alt={alt} loading="lazy" />
  return <div className={`h-full w-full ${className}`} style={{ background: tones[tone % tones.length] }} aria-hidden="true" />
}

function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    // very old browsers have no IntersectionObserver: show the content instead of crashing or hiding it
    if (!('IntersectionObserver' in window)) { el.classList.add('in'); return }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add('in'); io.disconnect() }
    }, { threshold: 0.12 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`reveal ${className}`}>{children}</div>
}

const FALLBACK = [
  { name: 'ORIGIN Canvas Jacket', price: 4290, images: [] },
  { name: 'Signature Oversized Tee', price: 1890, images: [] },
  { name: 'Essential Relaxed Shirt', price: 2790, images: [] },
  { name: 'HEEM Structured Pants', price: 3490, images: [] },
]

export default function Home() {
  const [products, setProducts] = useState(FALLBACK)
  const sm = useSiteMedia()
  const m = (key, fallback = '') => sm.url(key) || fallback
  const track = useRef(null)
  const [edge, setEdge] = useState({ start: true, end: false })
  const sync = () => {
    const t = track.current
    if (t) setEdge({ start: t.scrollLeft < 4, end: t.scrollLeft + t.clientWidth >= t.scrollWidth - 4 })
  }
  useEffect(() => {
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [products])
  const slide = (d) => track.current?.scrollBy({ left: d * track.current.clientWidth * 0.8, behavior: 'smooth' })

  useEffect(() => {
    getProducts('?signature=true')
      .then((d) => { if (d.length) setProducts(d.slice(0, 12)) })
      .catch(() => {}) // backend off: keep placeholder products
  }, [])

  return (
    <>
      {/* 01 Hero video, kept clean */}
      <section className="hero-in h-[50svh] min-h-80 overflow-hidden md:h-[calc(75svh-3.5rem)] md:min-h-72 nav:h-[calc(75svh-4rem)]">
        <h1 className="sr-only">HEEM</h1>
        <Media src={m('home_hero', IMG.hero)} tone={5} alt="HEEM campaign" />
      </section>

      {/* Tagline under hero */}
      <div className="px-[2.5vw] py-14 text-center md:py-20">
        <Reveal>
          <p className="font-display text-3xl uppercase md:text-5xl">Wear your identity.</p>
        </Reveal>
      </div>

      {/* 02 Men and women */}
      <section className="grid md:grid-cols-2">
        {[['Men', m('home_men', IMG.men), 2], ['Women', m('home_women', IMG.women), 4]].map(([n, src, t]) => (
          <Link key={n} to={`/${n.toLowerCase()}`} className="group relative block h-[50svh] min-h-80 overflow-hidden lg:h-[70vh] text-[#F7F4EF]">
            <div className="absolute inset-0 transition-transform duration-[1500ms] ease-out group-hover:scale-105"><Media src={src} tone={t} alt={n} /></div>
            <div className="absolute inset-0 bg-black/10 transition-colors duration-700 group-hover:bg-black/40" />
            <div className="absolute bottom-10 left-8 transition-transform duration-700 group-hover:-translate-y-2">
              <h2 className="font-display text-6xl uppercase md:text-7xl">{n}</h2>
              <span className="mt-4 inline-block text-sm uppercase tracking-[0.18em] opacity-90 transition-opacity duration-700 group-hover:opacity-100">Explore {n.toLowerCase()} →</span>
            </div>
          </Link>
        ))}
      </section>

      {/* 03 Signature */}
      <section className={pad}>
        <Reveal className="mb-14 text-center">
          <h2 className="font-display text-4xl uppercase md:text-6xl">HEEM Signature</h2>
          <p className="mt-4 text-neutral-600">Pieces that define the HEEM identity.</p>
        </Reveal>

        <div className="relative">
          {/* left / right slide buttons */}
          {[-1, 1].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => slide(d)}
              disabled={d < 0 ? edge.start : edge.end}
              aria-label={d < 0 ? 'Previous products' : 'Next products'}
              className={`absolute top-1/3 z-10 hidden h-11 w-11 -translate-y-1/2 md:flex items-center justify-center border border-[#1a1716]/25 bg-[#F7F4EF]/90 backdrop-blur transition enabled:hover:border-[#1a1716] enabled:hover:bg-[#1a1716] enabled:hover:text-[#F7F4EF] disabled:pointer-events-none disabled:opacity-0 ${d < 0 ? 'left-2 md:-left-3' : 'right-2 md:-right-3'}`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d={d < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} /></svg>
            </button>
          ))}

          <div
            ref={track}
            onScroll={sync}
            className="-mx-[2.5vw] flex snap-x snap-mandatory gap-[10px] overflow-x-auto sm:gap-3 md:gap-4 lg:gap-5 scroll-smooth px-[2.5vw] pb-4 scroll-px-[2.5vw] [scrollbar-width:none] md:mx-0 md:scroll-px-0 md:px-0 [&::-webkit-scrollbar]:hidden"
          >
            {products.map((p, i) => (
              <ProductCard key={p.slug || p._id || p.id || p.name} p={p} i={i} showQuickAdd className="w-[46%] shrink-0 snap-start sm:w-[32%] md:w-[28%] lg:w-[23%] 2xl:w-[19%]" />
            ))}
          </div>
        </div>

        <Reveal className="mt-14 text-center"><Link to="/search" className={link}>View all products →</Link></Reveal>
      </section>

      {/* 04 New collection */}
      <section className={pad}>
        <div className="grid gap-12 md:grid-cols-12 md:items-end">
          <Reveal className="-mx-[2.5vw] md:col-span-7 md:mx-0">
            <div className="h-[50svh] min-h-80 overflow-hidden md:aspect-[4/5] md:h-auto md:min-h-0"><Media src={m('home_origin', IMG.origin)} tone={0} alt="ORIGIN 01" /></div>
          </Reveal>
          <div className="md:col-span-5">
            <Reveal>
              <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">ORIGIN 01</p>
              <h2 className="mt-4 font-display text-5xl uppercase leading-[0.95] md:text-6xl lg:text-7xl">The new standard</h2>
              <p className="mt-6 max-w-sm text-neutral-600">Discover the latest HEEM collection.</p>
            </Reveal>
            <Reveal delay={150} className="mt-10 grid grid-cols-2 gap-3">
              {['Full outfit', 'Fabric detail', 'Product close-up', 'Model styling'].map((l, i) => (
                <div key={l}>
                  <div className="aspect-[4/5] overflow-hidden"><Media src={m(`home_origin_${i + 1}`)} tone={i + 1} alt={l} /></div>
                  <p className="mt-2 text-sm text-neutral-600">{l}</p>
                </div>
              ))}
            </Reveal>
            <Reveal className="mt-10"><a href="#" className={link}>Explore collection →</a></Reveal>
          </div>
        </div>
      </section>

      {/* 05 Final CTA */}
      <section className="relative flex h-[50svh] min-h-80 items-center overflow-hidden text-center text-[#F7F4EF] md:block md:h-auto md:min-h-0">
        <div className="absolute inset-0"><Media src={m('home_cta', IMG.cta)} tone={5} alt="" /></div>
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative w-full px-6 md:py-44">
          <Reveal>
            <p className="font-display text-xl tracking-[0.4em] pl-[0.4em]">THIS IS HEEM.</p>
            <h2 className="mt-6 font-display text-5xl uppercase leading-none md:text-8xl">Discover your next look.</h2>
            <div className="mt-10"><a href="#" className={btn}>Shop the collection →</a></div>
          </Reveal>
        </div>
      </section>

    </>
  )
}