
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useShop } from '../context/ShopContext.jsx'
import { API, formatPrice, getProduct, errorText } from '../Api.jsx'

// ONE card for the whole site: home, search, collections, wishlist, related products.
// Each page decides what the card shows with props:
//   showWishlist  heart button on the photo            (default true)
//   showQuickAdd  size picker + real add to bag         (default false)
//   showColors    colour swatches under the price       (default true, only if 2+ colours)
//   onQuickAdd    (variant, product) => Promise  replaces the default addToCart (wishlist uses moveToCart)
//   onAdded       (product) => void              called after a successful quick add
//   onWishToggle  (nowSaved, product) => void    called after the heart is toggled
// `p` is a product exactly as the API returns it. Wishlist items (product_id, image, variants[].variant_id) work too.

const tones = [
  'linear-gradient(160deg,#cfc6b8,#8f8372)',
  'linear-gradient(160deg,#3b3633,#141211)',
  'linear-gradient(160deg,#d9d2c7,#b9ad9b)',
  'linear-gradient(160deg,#6b5f52,#2a2420)',
]

// Backend often returns "/media/..." (relative). The browser would look for it on the
// frontend server and fail, so point it at the backend instead.
export function mediaUrl(src) {
  if (!src || typeof src !== 'string') return ''
  if (/^(https?:)?\/\//.test(src) || src.startsWith('data:') || src.startsWith('blob:')) return src
  return `${API}${src.startsWith('/') ? '' : '/'}${src}`
}

// Real image, or a tonal placeholder when none is uploaded yet or the file fails to load
export function Img({ src, alt = '', i = 0 }) {
  const [bad, setBad] = useState(false)
  useEffect(() => { setBad(false) }, [src])
  if (src && !bad) {
    return <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setBad(true)} className="h-full w-full object-cover" />
  }
  return <div className="h-full w-full" style={{ background: tones[i % tones.length] }} aria-hidden="true" />
}

// ---------- helpers: read whatever shape the API sends, never invent data ----------

const num = (x) => {
  if (x === null || x === undefined || x === '') return null
  const n = Number(x)
  return Number.isFinite(n) ? n : null
}

function imagesOf(p) {
  const out = []
  const seen = new Set()
  const push = (x, color = '', primary = false) => {
    const src = mediaUrl(typeof x === 'string' ? x : x?.image || x?.url)
    if (!src || seen.has(src)) return
    seen.add(src)
    out.push({ src, color, primary })
  }
  if (Array.isArray(p.images)) p.images.forEach((x) => push(x, x?.color || '', !!x?.is_primary))
  ;[p.primary_image, p.image, p.thumbnail, p.secondary_image].forEach((x) => push(x))
  return out
}

const normVariants = (list) =>
  (Array.isArray(list) ? list : [])
    .map((v) => ({ id: v.id ?? v.variant_id, color: v.color || '', size: v.size || '', stock: Number(v.stock) || 0 }))
    .filter((v) => v.id !== undefined && v.id !== null)

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const sortSizes = (all) => [...SIZE_ORDER.filter((s) => all.includes(s)), ...all.filter((s) => !SIZE_ORDER.includes(s)).sort()]
const unique = (arr) => [...new Set(arr)]

// colour name -> swatch colour. Unknown names fall back to that colour's photo, then to a neutral dot.
const CSS_COLORS = {
  black: '#111111', white: '#ffffff', 'off white': '#f4f0e8', ivory: '#f3efe3', cream: '#efe6d2', beige: '#d8c9ad',
  sand: '#cdb892', khaki: '#b5a37a', olive: '#6b6a3a', green: '#3f6b4a', navy: '#1c2a4a', blue: '#2f5d9b',
  grey: '#8a8a8a', gray: '#8a8a8a', charcoal: '#3a3a3a', brown: '#6b4a32', tan: '#b08a5a', camel: '#b98a4d',
  maroon: '#6a1f2b', burgundy: '#5a1a2a', red: '#b3261e', pink: '#e3a1b0', yellow: '#e6c84a', mustard: '#c9a227',
  orange: '#d9772b', purple: '#6a4b8a', silver: '#c0c0c0', gold: '#b8923a',
}
function cssColor(name) {
  const k = String(name).trim().toLowerCase()
  return CSS_COLORS[k] || CSS_COLORS[k.split(/\s+/).pop()] || ''
}

// product details are fetched only when someone opens Quick add, and only once per product
const detailCache = new Map()
function loadDetail(slug) {
  if (!detailCache.has(slug)) {
    detailCache.set(slug, getProduct(slug).catch((e) => { detailCache.delete(slug); throw e }))
  }
  return detailCache.get(slug)
}

const bar =
  'absolute inset-x-0 bottom-0 z-[3] bg-[#F7F4EF]/95 py-3 text-center text-xs uppercase tracking-[0.2em] transition-transform duration-300 motion-reduce:transition-none md:text-sm ' +
  '[@media(hover:hover)]:translate-y-full [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-focus-within:translate-y-0 [@media(hover:hover)]:focus-visible:translate-y-0'

export default function ProductCard({
  p, i = 0, className = '',
  showWishlist = true, showQuickAdd = false, showColors = true,
  onQuickAdd, onAdded, onWishToggle,
}) {
  const { cart, addToCart, wishIds, toggleWish } = useShop()
  const id = p.id ?? p.product_id
  const to = p.slug ? `/product/${p.slug}` : null

  const alive = useRef(true)
  const timer = useRef(0)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false; clearTimeout(timer.current) }
  }, [])

  // ----- what to show -----
  const price = num(p.price)
  const compare = num(p.compare_at_price ?? p.original_price)
  const onSale = price !== null && compare !== null && compare > price
  const pct = onSale ? (num(p.discount_percent) ?? Math.round((1 - price / compare) * 100)) : 0
  const soldOut = p.in_stock === false
  const badge = soldOut ? 'Sold out' : onSale ? 'Sale' : p.is_new ? 'New' : p.is_best_seller ? 'Best seller' : p.is_limited ? 'Limited' : ''

  const baseVariants = useMemo(() => normVariants(p.variants), [p.variants])
  const colors = useMemo(() => {
    if (Array.isArray(p.colors) && p.colors.length) {
      return p.colors.map((c) => (typeof c === 'string' ? { name: c, hex: '' } : { name: c.name, hex: c.hex || c.code || '' })).filter((c) => c.name)
    }
    return unique(baseVariants.map((v) => v.color).filter(Boolean)).map((name) => ({ name, hex: '' }))
  }, [p.colors, baseVariants])
  const colorOk = (name) => baseVariants.length === 0 || baseVariants.some((v) => v.color === name && v.stock > 0)

  // ----- photos (the chosen colour's own photos when the product has them) -----
  const [color, setColor] = useState('')
  const imgs = useMemo(() => imagesOf(p), [p])
  const pool = useMemo(() => {
    const own = color ? imgs.filter((x) => x.color === color) : []
    if (own.length) return own
    const shared = imgs.filter((x) => !x.color)
    return shared.length ? shared : imgs
  }, [imgs, color])
  const main = pool.find((x) => x.primary) || pool[0]
  const second = pool.find((x) => x !== main)

  // ----- wishlist -----
  const wished = id !== undefined && id !== null ? wishIds.has(id) : false
  const [wishBusy, setWishBusy] = useState(false)
  const toggle = async () => {
    if (id === undefined || id === null || wishBusy) return
    setWishBusy(true)
    try {
      await toggleWish(id)
      onWishToggle?.(!wished, p)
    } catch { /* the heart simply stays as it was */ } finally {
      if (alive.current) setWishBusy(false)
    }
  }

  // ----- quick add -----
  const [open, setOpen] = useState(false)
  const [load, setLoad] = useState('idle') // idle | loading | ready | error
  const [fetched, setFetched] = useState([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const canQuick = showQuickAdd && !soldOut && (baseVariants.length > 0 || !!p.slug)
  const variants = baseVariants.length ? baseVariants : fetched

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const fetchVariants = async () => {
    setLoad('loading')
    try {
      const d = await loadDetail(p.slug)
      if (!alive.current) return
      setFetched(normVariants(d.variants))
      setLoad('ready')
    } catch {
      if (alive.current) setLoad('error')
    }
  }
  const openQuick = () => {
    setOpen(true)
    setMsg('')
    setDone(false)
    if (baseVariants.length || fetched.length) setLoad('ready')
    else fetchVariants()
  }
  const closeQuick = () => { clearTimeout(timer.current); setOpen(false); setMsg(''); setDone(false) }

  // the colour that gets added: the swatch the shopper picked, else the first colour still in stock
  const vColors = unique(variants.map((v) => v.color).filter(Boolean))
  const col = color || vColors.find((c) => variants.some((v) => v.color === c && v.stock > 0)) || vColors[0] || ''
  const sizes = sortSizes(unique(variants.map((v) => v.size).filter(Boolean)))
  const matching = variants.filter((v) => !col || v.color === col)
  const sizeOk = (s) => matching.some((v) => v.size === s && v.stock > 0)

  const add = async (v) => {
    if (busy) return
    if (!v || v.stock < 1) return setMsg('Sorry, this option is sold out.')
    const inBag = cart?.items?.find((x) => x.variant_id === v.id)?.quantity || 0
    if (inBag >= v.stock) return setMsg('You already have the maximum available in your bag.')
    setBusy(true)
    setMsg('')
    try {
      await (onQuickAdd ? onQuickAdd(v, p) : addToCart(v.id, 1))
      detailCache.delete(p.slug) // stock changed, fetch fresh next time
      onAdded?.(p)
      if (!alive.current) return
      setMsg('Added to your bag.')
      setDone(true)
      timer.current = setTimeout(() => { if (alive.current) closeQuick() }, 1400)
    } catch (e) {
      if (alive.current) setMsg(errorText(e) || e.message)
    } finally {
      if (alive.current) setBusy(false)
    }
  }

  const shownColors = colors.slice(0, 5)
  const hiddenColors = colors.length - shownColors.length

  return (
    <article className={`group ${className}`}>
      <div className="relative aspect-[3/4] overflow-hidden bg-[#1a1716]/[0.04]">
        <div className="absolute inset-0"><Img key={main?.src || 'none'} src={main?.src} alt={p.name} i={i} /></div>
        {second && (
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 motion-reduce:transition-none [@media(hover:hover)]:group-hover:opacity-100">
            <Img src={second.src} alt="" i={i + 2} />
          </div>
        )}
        {to && <Link to={to} aria-label={p.name} className="absolute inset-0 z-[1] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#B08D57]" />}

        {badge && (
          <span className={`pointer-events-none absolute left-2 top-2 z-[2] bg-[#F7F4EF]/90 px-2 py-1 text-[0.62rem] uppercase tracking-[0.15em] ${badge === 'Sale' ? 'text-[#8a6d3b]' : ''}`}>{badge}</span>
        )}

        {showWishlist && (
          <button type="button" onClick={toggle} disabled={id === undefined || id === null || wishBusy} aria-pressed={wished}
            aria-label={wished ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`}
            className="absolute right-2 top-2 z-[3] grid h-8 w-8 place-items-center rounded-full bg-[#F7F4EF]/85 text-[#1a1716] transition-colors hover:text-[#B08D57] disabled:cursor-default motion-reduce:transition-none">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill={wished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
              <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
            </svg>
          </button>
        )}

        {canQuick && !open && (
          <button type="button" onClick={openQuick} className={bar}>Quick add</button>
        )}

        {canQuick && open && (
          <div role="group" aria-label={`Quick add ${p.name}`} className="absolute inset-x-0 bottom-0 z-[4] bg-[#F7F4EF] px-3 pb-3 pt-2">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-[0.65rem] uppercase tracking-[0.15em] text-neutral-500">
                {sizes.length ? 'Select size' : 'Add to bag'}{col ? ` · ${col}` : ''}
              </p>
              <button type="button" onClick={closeQuick} aria-label="Close quick add" className="-mr-1 px-1 text-lg leading-none">×</button>
            </div>

            {load === 'loading' && <p className="py-3 text-xs text-neutral-500">Loading sizes…</p>}
            {load === 'error' && (
              <button type="button" onClick={fetchVariants} className="py-3 text-xs underline underline-offset-4">Could not load. Try again</button>
            )}
            {load === 'ready' && variants.length === 0 && (
              <p className="py-3 text-xs text-neutral-500">This product cannot be added right now.</p>
            )}
            {load === 'ready' && variants.length > 0 && sizes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {sizes.map((s) => (
                  <button key={s} type="button" disabled={busy || done || !sizeOk(s)}
                    onClick={() => add(matching.find((v) => v.size === s))}
                    aria-label={sizeOk(s) ? `Add size ${s} to bag` : `Size ${s}, sold out`}
                    className="h-9 min-w-9 border border-[#1a1716]/20 px-2 text-xs transition-colors hover:border-[#1a1716] hover:bg-[#1a1716] hover:text-[#F7F4EF] disabled:cursor-not-allowed disabled:opacity-35 disabled:line-through disabled:hover:border-[#1a1716]/20 disabled:hover:bg-transparent disabled:hover:text-inherit motion-reduce:transition-none">
                    {s}
                  </button>
                ))}
              </div>
            )}
            {load === 'ready' && variants.length > 0 && sizes.length === 0 && (
              <button type="button" disabled={busy || done || !matching.some((v) => v.stock > 0)}
                onClick={() => add(matching.find((v) => v.stock > 0))}
                className="mt-2 w-full bg-[#1a1716] py-2.5 text-xs uppercase tracking-[0.18em] text-[#F7F4EF] transition-colors hover:bg-[#B08D57] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#1a1716]">
                {matching.some((v) => v.stock > 0) ? (busy ? 'Adding…' : 'Add to bag') : 'Sold out'}
              </button>
            )}
            <p role="status" className={`min-h-4 pt-2 text-xs ${done ? 'text-neutral-700' : 'text-[#8a6d3b]'}`}>{msg}</p>
          </div>
        )}
      </div>

      <h3 className="mt-3 min-h-[2.5rem] overflow-hidden text-[0.8rem] uppercase leading-5 tracking-[0.12em] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [display:-webkit-box] md:mt-4 md:text-sm">
        {to ? <Link to={to} className="transition-colors hover:text-[#B08D57]">{p.name}</Link> : p.name}
      </h3>

      {price !== null && (
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className={onSale ? 'text-[#1a1716]' : 'text-neutral-600'}>{formatPrice(price)}</span>
          {onSale && <s className="text-neutral-400"><span className="sr-only">Original price </span>{formatPrice(compare)}</s>}
          {onSale && pct > 0 && <span className="text-xs text-[#8a6d3b]">-{pct}%</span>}
        </p>
      )}

      {showColors && colors.length > 1 && (
        <ul className="mt-2 flex flex-wrap items-center gap-0.5" aria-label="Available colours">
          {shownColors.map((c) => {
            const ok = colorOk(c.name)
            const on = color === c.name
            const photo = imgs.find((x) => x.color === c.name)?.src
            const bg = c.hex || cssColor(c.name) || (photo ? `center / cover url("${photo}")` : '#d9d2c7')
            return (
              <li key={c.name}>
                <button type="button" aria-pressed={on} disabled={!ok} title={ok ? c.name : `${c.name} - sold out`}
                  aria-label={ok ? c.name : `${c.name}, sold out`} onClick={() => setColor(on ? '' : c.name)}
                  className="grid h-6 w-6 place-items-center disabled:cursor-not-allowed disabled:opacity-40">
                  <span style={{ background: bg }}
                    className={`block h-4 w-4 rounded-full border border-[#1a1716]/25 ${on ? 'ring-1 ring-[#1a1716] ring-offset-2 ring-offset-[#F7F4EF]' : ''}`} />
                </button>
              </li>
            )
          })}
          {hiddenColors > 0 && <li className="pl-1 text-xs text-neutral-500">+{hiddenColors}</li>}
        </ul>
      )}
    </article>
  )
}



