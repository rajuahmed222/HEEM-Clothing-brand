// import { useEffect, useRef, useState } from 'react'
// import { Img } from '../ProductCard.jsx'
// import useModal from './useModal.js'

// const arrow = 'absolute top-1/2 z-10 -translate-y-1/2 bg-[#F7F4EF]/85 p-2.5 text-[#1a1716] transition-colors hover:bg-[#F7F4EF] focus-visible:outline-2 focus-visible:outline-[#B08D57]'

// function Chevron({ dir }) {
//   return (
//     <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
//       <path d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
//     </svg>
//   )
// }

// // Horizontal swipe on touch screens; mostly-vertical movement is left alone so the page still scrolls.
// function useSwipe(prev, next, enabled = true) {
//   const start = useRef(null)
//   return {
//     onTouchStart: (e) => { start.current = enabled ? [e.touches[0].clientX, e.touches[0].clientY] : null },
//     onTouchEnd: (e) => {
//       if (!start.current) return
//       const dx = e.changedTouches[0].clientX - start.current[0]
//       const dy = e.changedTouches[0].clientY - start.current[1]
//       start.current = null
//       if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) (dx > 0 ? prev : next)()
//     },
//   }
// }

// function Photo({ im, i, name, eager }) {
//   if (!im.image) return <Img i={i} />
//   return (
//     <img src={im.image} alt={im.alt || `${name}, view ${i + 1}`} loading={eager ? 'eager' : 'lazy'}
//       decoding="async" draggable={false} className="h-full w-full object-cover" />
//   )
// }

// function Lightbox({ list, start, name, onClose }) {
//   const [i, setI] = useState(start)
//   const [zoomed, setZoomed] = useState(false)
//   const [origin, setOrigin] = useState('50% 50%')
//   const n = list.length
//   useModal(onClose)

//   const step = (d) => { setZoomed(false); setI((c) => (c + d + n) % n) }
//   useEffect(() => {
//     const onKey = (e) => {
//       if (e.key === 'ArrowLeft') { setZoomed(false); setI((c) => (c - 1 + n) % n) }
//       if (e.key === 'ArrowRight') { setZoomed(false); setI((c) => (c + 1) % n) }
//     }
//     window.addEventListener('keydown', onKey)
//     return () => window.removeEventListener('keydown', onKey)
//   }, [n])

//   const swipe = useSwipe(() => step(-1), () => step(1), !zoomed)
//   const originAt = (e) => {
//     const box = (e.target.tagName === 'IMG' ? e.target : e.currentTarget).getBoundingClientRect()
//     return `${((e.clientX - box.left) / box.width) * 100}% ${((e.clientY - box.top) / box.height) * 100}%`
//   }

//   return (
//     <div role="dialog" aria-modal="true" aria-label={`${name} images`} className="fixed inset-0 z-[80] flex flex-col bg-[#F7F4EF]">
//       <div className="flex items-center justify-between px-4 py-3 md:px-8">
//         <p className="text-sm text-neutral-600" aria-live="polite">{i + 1} / {n}</p>
//         <button type="button" autoFocus onClick={onClose} aria-label="Close image viewer"
//           className="p-2 text-2xl leading-none transition-colors hover:text-[#B08D57] focus-visible:outline-2 focus-visible:outline-[#B08D57]">×</button>
//       </div>
//       <div className="relative min-h-0 flex-1" {...swipe}>
//         <button type="button" aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
//           onClick={(e) => { setOrigin(originAt(e)); setZoomed((z) => !z) }}
//           onMouseMove={(e) => zoomed && setOrigin(originAt(e))}
//           className={`flex h-full w-full items-center justify-center overflow-hidden ${zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}>
//           <img src={list[i].image} alt={list[i].alt || `${name}, view ${i + 1}`} draggable={false}
//             style={{ transformOrigin: origin }}
//             className={`max-h-full max-w-full object-contain transition-transform duration-300 motion-reduce:transition-none ${zoomed ? 'scale-[2]' : ''}`} />
//         </button>
//         {n > 1 && (
//           <>
//             <button type="button" aria-label="Previous image" onClick={() => step(-1)} className={`${arrow} left-3`}><Chevron dir="left" /></button>
//             <button type="button" aria-label="Next image" onClick={() => step(1)} className={`${arrow} right-3`}><Chevron dir="right" /></button>
//           </>
//         )}
//       </div>
//     </div>
//   )
// }

// // `images` = the photos of the selected colour (already chosen by the page, max 6).
// // The page gives this component key={color}, so switching colour starts again at the first photo.
// export default function ProductGallery({ images, name }) {
//   const list = images.length ? images : [{ image: '', alt: '' }]
//   const n = list.length
//   const [i, setI] = useState(0)
//   const [open, setOpen] = useState(false)
//   const real = !!list[i].image
//   const go = (d) => setI((c) => (c + d + n) % n)
//   const swipe = useSwipe(() => go(-1), () => go(1))
//   const onKeyDown = (e) => {
//     if (e.key === 'ArrowLeft') go(-1)
//     if (e.key === 'ArrowRight') go(1)
//   }

//   return (
//     <div className="flex flex-col gap-3 md:flex-row-reverse" onKeyDown={onKeyDown}>
//       <div className="relative min-w-0 flex-1">
//         <div className="relative aspect-[3/4] overflow-hidden bg-[#1a1716]/[0.05]" {...swipe}>
//           <button type="button" disabled={!real} onClick={() => setOpen(true)} aria-label="Enlarge image"
//             className="block h-full w-full cursor-zoom-in disabled:cursor-default">
//             <Photo im={list[i]} i={i} name={name} eager={i === 0} />
//           </button>
//           {n > 1 && (
//             <>
//               <button type="button" aria-label="Previous image" onClick={() => go(-1)} className={`${arrow} left-2`}><Chevron dir="left" /></button>
//               <button type="button" aria-label="Next image" onClick={() => go(1)} className={`${arrow} right-2`}><Chevron dir="right" /></button>
//               <span className="pointer-events-none absolute bottom-3 right-3 bg-[#F7F4EF]/85 px-2 py-1 text-xs md:hidden">{i + 1} / {n}</span>
//             </>
//           )}
//         </div>
//       </div>

//       {n > 1 && (
//         <ul aria-label="Product images" className="flex gap-2 overflow-x-auto md:w-20 md:flex-none md:flex-col md:overflow-visible">
//           {list.map((im, k) => (
//             <li key={k} className="w-16 shrink-0 md:w-full">
//               <button type="button" aria-label={`Show image ${k + 1}`} aria-current={k === i ? 'true' : undefined} onClick={() => setI(k)}
//                 className={`block aspect-[3/4] w-full overflow-hidden border transition-opacity ${k === i ? 'border-[#1a1716]' : 'border-transparent opacity-60 hover:opacity-100'}`}>
//                 <Photo im={im} i={k} name={name} />
//               </button>
//             </li>
//           ))}
//         </ul>
//       )}

//       {open && <Lightbox list={list} start={i} name={name} onClose={() => setOpen(false)} />}
//     </div>
//   )
// }



import { useEffect, useRef, useState } from 'react'
import { Img } from '../ProductCard.jsx'
import useModal from './useModal.js'

const arrow = 'absolute top-1/2 z-10 -translate-y-1/2 bg-[#F7F4EF]/85 p-2.5 text-[#1a1716] transition-colors hover:bg-[#F7F4EF] focus-visible:outline-2 focus-visible:outline-[#B08D57]'

function Chevron({ dir }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
    </svg>
  )
}

// Horizontal swipe on touch screens; mostly-vertical movement is left alone so the page still scrolls.
function useSwipe(prev, next, enabled = true) {
  const start = useRef(null)
  return {
    onTouchStart: (e) => { start.current = enabled ? [e.touches[0].clientX, e.touches[0].clientY] : null },
    onTouchEnd: (e) => {
      if (!start.current) return
      const dx = e.changedTouches[0].clientX - start.current[0]
      const dy = e.changedTouches[0].clientY - start.current[1]
      start.current = null
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) (dx > 0 ? prev : next)()
    },
  }
}

function Photo({ im, i, name, eager }) {
  if (!im.image) return <Img i={i} />
  return (
    <img src={im.image} alt={im.alt || `${name}, view ${i + 1}`} loading={eager ? 'eager' : 'lazy'}
      decoding="async" draggable={false} className="h-full w-full object-cover" />
  )
}

function Lightbox({ list, start, name, onClose }) {
  const [i, setI] = useState(start)
  const [zoomed, setZoomed] = useState(false)
  const [origin, setOrigin] = useState('50% 50%')
  const n = list.length
  const cur = useRef(start)
  cur.current = i
  useModal(() => onClose(cur.current)) // Esc closes on the photo you were looking at

  const step = (d) => { setZoomed(false); setI((c) => (c + d + n) % n) }
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') { setZoomed(false); setI((c) => (c - 1 + n) % n) }
      if (e.key === 'ArrowRight') { setZoomed(false); setI((c) => (c + 1) % n) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [n])

  const swipe = useSwipe(() => step(-1), () => step(1), !zoomed)
  const originAt = (e) => {
    const box = (e.target.tagName === 'IMG' ? e.target : e.currentTarget).getBoundingClientRect()
    return `${((e.clientX - box.left) / box.width) * 100}% ${((e.clientY - box.top) / box.height) * 100}%`
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={`${name} images`} className="fixed inset-0 z-[80] flex flex-col bg-[#F7F4EF]">
      <div className="flex items-center justify-between px-4 py-3 md:px-8">
        <p className="text-sm text-neutral-600" aria-live="polite">{i + 1} / {n}</p>
        <button type="button" autoFocus onClick={() => onClose(i)} aria-label="Close image viewer"
          className="p-2 text-2xl leading-none transition-colors hover:text-[#B08D57] focus-visible:outline-2 focus-visible:outline-[#B08D57]">×</button>
      </div>
      <div className="relative min-h-0 flex-1" {...swipe}>
        <button type="button" aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
          onClick={(e) => { setOrigin(originAt(e)); setZoomed((z) => !z) }}
          onMouseMove={(e) => zoomed && setOrigin(originAt(e))}
          className={`flex h-full w-full items-center justify-center overflow-hidden ${zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}>
          <img src={list[i].image} alt={list[i].alt || `${name}, view ${i + 1}`} draggable={false}
            style={{ transformOrigin: origin }}
            className={`max-h-full max-w-full object-contain transition-transform duration-300 motion-reduce:transition-none ${zoomed ? 'scale-[2]' : ''}`} />
        </button>
        {n > 1 && (
          <>
            <button type="button" aria-label="Previous image" onClick={() => step(-1)} className={`${arrow} left-3`}><Chevron dir="left" /></button>
            <button type="button" aria-label="Next image" onClick={() => step(1)} className={`${arrow} right-3`}><Chevron dir="right" /></button>
          </>
        )}
      </div>
    </div>
  )
}

// `images` = the photos of the selected colour (already chosen by the page, max 6).
// The page gives this component key={color}, so switching colour starts again at the first photo.
export default function ProductGallery({ images, name }) {
  const list = images.length ? images : [{ image: '', alt: '' }]
  const n = list.length
  const [i, setI] = useState(0)
  const [open, setOpen] = useState(false)
  const [zoom, setZoom] = useState(null) // transform-origin while the mouse hovers the main photo
  const real = !!list[i].image
  const hoverAt = (e) => {
    if (!real || !window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return
    const b = e.currentTarget.getBoundingClientRect()
    setZoom(`${((e.clientX - b.left) / b.width) * 100}% ${((e.clientY - b.top) / b.height) * 100}%`)
  }
  const go = (d) => setI((c) => (c + d + n) % n)
  const swipe = useSwipe(() => go(-1), () => go(1))
  const onKeyDown = (e) => {
    if (open) return
    if (e.key === 'ArrowLeft') go(-1)
    if (e.key === 'ArrowRight') go(1)
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row-reverse" onKeyDown={onKeyDown}>
      <div className="relative min-w-0 flex-1">
        <div className="relative aspect-[3/4] overflow-hidden bg-[#1a1716]/[0.05]" {...swipe}>
          <button type="button" disabled={!real} onClick={() => { setZoom(null); setOpen(true) }} aria-label="Enlarge image"
            onMouseEnter={hoverAt} onMouseMove={hoverAt} onMouseLeave={() => setZoom(null)}
            className="block h-full w-full cursor-zoom-in disabled:cursor-default">
            {/* key={i}: a new photo fades in instead of jumping */}
            <span key={i} className="block h-full w-full transition-transform duration-200 ease-out motion-safe:animate-[fadeIn_0.45s_ease_both] motion-reduce:transition-none"
              style={zoom ? { transform: 'scale(1.8)', transformOrigin: zoom } : undefined}>
              <Photo im={list[i]} i={i} name={name} eager={i === 0} />
            </span>
          </button>
          {n > 1 && (
            <>
              <button type="button" aria-label="Previous image" onClick={() => go(-1)} className={`${arrow} left-2`}><Chevron dir="left" /></button>
              <button type="button" aria-label="Next image" onClick={() => go(1)} className={`${arrow} right-2`}><Chevron dir="right" /></button>
              <span className="pointer-events-none absolute bottom-3 right-3 bg-[#F7F4EF]/85 px-2 py-1 text-xs md:hidden">{i + 1} / {n}</span>
            </>
          )}
        </div>
      </div>

      {n > 1 && (
        <ul aria-label="Product images" className="flex gap-2 overflow-x-auto md:w-20 md:flex-none md:flex-col md:overflow-visible">
          {list.map((im, k) => (
            <li key={k} className="w-16 shrink-0 md:w-full">
              <button type="button" aria-label={`Show image ${k + 1}`} aria-current={k === i ? 'true' : undefined} onClick={() => setI(k)}
                className={`block aspect-[3/4] w-full overflow-hidden border transition-opacity ${k === i ? 'border-[#1a1716]' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                <Photo im={im} i={k} name={name} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && <Lightbox list={list} start={i} name={name} onClose={(k) => { setI(k); setOpen(false) }} />}
    </div>
  )
}