import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { suggestProducts, formatPrice } from '../Api.jsx'
import { Img } from './ProductCard.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useShop } from '../context/ShopContext.jsx'
import useOrderAlerts from '../lib/orderAlerts.js'
import useCategories from '../lib/categories.js'
import useSiteMedia from '../lib/siteMedia.js'

// Placeholder tones. Replace each tile's background with a real <img> later.
const tones = [
  'linear-gradient(160deg,#cfc6b8,#8f8372)',
  'linear-gradient(160deg,#3b3633,#141211)',
  'linear-gradient(160deg,#d9d2c7,#b9ad9b)',
  'linear-gradient(160deg,#6b5f52,#2a2420)',
]

const featured = ['New Arrivals', 'Best Sellers', 'HEEM Essentials', 'Signature Collection']
const bags = ['Bags', 'Caps & Hats', 'Belts', 'Wallets', 'Sunglasses']

const MENUS = {
  New: {
    cols: [
      { title: 'Discover', items: ['New Arrivals', 'Latest Collection', 'Trending Now', 'Best Sellers', 'HEEM Essentials'] },
      { title: 'Collections', items: ['ORIGIN 01', 'FORM 01', 'Signature', 'Seasonal Collection'] },
    ],
    images: ['Latest collection', 'Signature'],
  },
  Men: {
    cols: [
      { title: 'Clothing', items: ['T-Shirts', 'Shirts', 'Polo Shirts', 'Panjabi', 'Hoodies & Sweatshirts', 'Jackets & Coats', 'Sweaters', 'Pants', 'Jeans', 'Shorts', 'Suits & Blazers'] },
      { title: 'Featured', items: featured },
      { title: 'Accessories', items: bags },
    ],
    images: ['Men’s collection', 'Essentials'],
  },
  Women: {
    cols: [
      { title: 'Clothing', items: ['T-Shirts', 'Tops', 'Shirts', 'Saree', 'Dresses', 'Hoodies & Sweatshirts', 'Jackets & Coats', 'Sweaters', 'Pants', 'Jeans', 'Skirts', 'Blazers'] },
      { title: 'Featured', items: featured },
      { title: 'Accessories', items: ['Bags', 'Belts', 'Scarves', 'Sunglasses', 'Caps & Hats'] },
    ],
    images: ['Women’s collection', 'Signature'],
  },
  Kids: {
    cols: [
      { title: 'Boys', items: ['T-Shirts', 'Shirts', 'Panjabi', 'Hoodies', 'Jackets', 'Pants', 'Shorts'] },
      { title: 'Girls', items: ['Tops', 'Dresses', 'T-Shirts', 'Hoodies', 'Jackets', 'Pants', 'Skirts'] },
      { title: 'Featured', items: ['New Arrivals', 'Best Sellers', 'Kids Collection'] },
      { title: 'Shop by age', items: ['2–4 Years', '5–7 Years', '8–12 Years', '13–16 Years'] },
    ],
    images: ['Kids collection', 'Little essentials'],
  },
  Lifestyle: {
    cols: [
      { title: 'Accessories', items: bags },
      { title: 'Lifestyle', items: ['Fragrance', 'Travel Accessories', 'Watches', 'Lifestyle Objects'] },
      { title: 'Featured', items: ['New Lifestyle', 'Best Sellers', 'HEEM Essentials'] },
    ],
    images: ['Objects', 'Fragrance'],
  },
  Sale: {
    cols: [
      { title: 'Shop sale', items: ['Men', 'Women', 'Kids', 'Accessories'] },
      { title: 'Offers', items: ['Special Selection', 'Last Chance', 'Final Sale'] },
    ],
    images: [],
  },
}

const trending = ['Oversized T-Shirt', 'Canvas Jacket', 'Panjabi', 'Saree', 'New Collection']
const topRated = ['Canvas jacket', 'Oversized tee', 'Linen panjabi', 'Silk saree']

const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const sectionPath = (n) => `/${n.toLowerCase()}`
// Men and Women clothing items open their sub-category; everything else opens the section
const itemTo = (menu, col, item) =>
  (menu === 'Men' || menu === 'Women') && col === 'Clothing'
    ? `/${menu.toLowerCase()}?sub=${slug(`${menu} ${item}`)}`
    : sectionPath(menu)

// Category slug behind a menu entry, if it has one. New, Sale and the Featured lists are always shown.
const catSlug = (menu, col, item) => (item == null
  ? (['New', 'Sale'].includes(menu) ? null : menu.toLowerCase())
  : (menu === 'Men' || menu === 'Women') && col === 'Clothing' ? slug(`${menu} ${item}`) : null)

const ICONS = {
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  bag: <><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M5 5l14 14M19 5L5 19" />,
}

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      {ICONS[name]}
    </svg>
  )
}

function IconBtn({ name, label, onClick, to, badge = 0, dot = null }) {
  const cls = 'relative p-1 text-[#1a1716] transition-colors hover:text-[#B08D57] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B08D57]'
  const inner = (
    <>
      <Icon name={name} />
      {badge > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1a1716] px-1 text-[10px] leading-none text-[#F7F4EF]">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      {dot && (
        <span aria-hidden="true" className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#F7F4EF] ${dot === 'red' ? 'bg-red-600' : 'bg-green-600'}`} />
      )}
    </>
  )
  // `to` makes it a real link (Wishlist, Bag, Account); without it it is a button (Search, menu)
  return to
    ? <Link to={to} aria-label={label} onClick={onClick} className={cls}>{inner}</Link>
    : <button type="button" aria-label={label} onClick={onClick} className={cls}>{inner}</button>
}

function Soon() {
  return <span className="ml-2 align-middle text-[0.6rem] uppercase tracking-[0.18em] text-[#B08D57]">Soon</span>
}

function Brand() {
  return (
    <Link to="/" className="font-display text-2xl tracking-[0.32em] pl-[0.32em] text-[#1a1716] focus-visible:outline-2 focus-visible:outline-[#B08D57]">
      HEEM
    </Link>
  )
}

const sugHead = 'mb-4 font-display text-[1.05rem] font-semibold text-neutral-900'
const sugLink = 'text-[0.95rem] text-neutral-700 transition-colors hover:text-[#B08D57]'
const panel = 'absolute left-[2.5vw] right-[2.5vw] top-full border border-[#1a1716]/15 bg-[#F7F4EF] transition-[opacity,transform,visibility] duration-300 ease-out motion-reduce:transition-none'
const shut = 'invisible -translate-y-2 opacity-0'
const open = 'visible translate-y-0 opacity-100'

export default function Navbar() {
  const [active, setActive] = useState(null)
  const [shown, setShown] = useState('Men')
  const [searchOpen, setSearchOpen] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [sug, setSug] = useState(null)
  const term = query.trim()
  const { user } = useAuth()
  const { cartCount, wishCount } = useShop()
  const accountTo = user ? '/account' : '/login'
  const { dot: alertDot } = useOrderAlerts()
  const { bySlug, list } = useCategories()
  const media = useSiteMedia()
  // hidden  -> removed from the menu;  coming_soon -> kept, with a small "Soon" tag;  unknown/failed -> shown as before
  const stateOf = (menu, col, item) => bySlug[catSlug(menu, col, item)]?.state
  const showSection = (menu) => stateOf(menu) !== 'hidden'
  // Menu columns come from the database (Admin > Categories). Until a section has been arranged into groups,
  // the original fixed list below is used, so the menu is never empty.
  const showItem = (menu, col, item) => stateOf(menu, col, item) !== 'hidden'
  const dbCols = (menu) => {
    const kids = list.filter((c) => c.parent === menu.toLowerCase())
    if (!kids.some((c) => c.group)) return null
    const groups = new Map()
    kids.filter((c) => c.state !== 'hidden')
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
      .forEach((c) => { const t = c.group || 'More'; groups.set(t, [...(groups.get(t) || []), { extra: c }]) })
    return [...groups].map(([title, items]) => ({ title, items }))
  }
  const colsOf = (menu) => dbCols(menu) || MENUS[menu].cols
    .map((c) => ({ ...c, items: c.items.filter((i) => showItem(menu, c.title, i)) }))
    .filter((c) => c.items.length)
  const sections = Object.keys(MENUS).filter(showSection)
  const accountLabel = user ? 'My account' : 'Sign in'
  const accountDot = user ? alertDot : null
  const accountAria = accountDot === 'red' ? `${accountLabel}, a payment needs your attention`
    : accountDot === 'green' ? `${accountLabel}, a payment was verified` : accountLabel


  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { setActive(null); setSearchOpen(false); setDrawer(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    document.body.style.overflow = drawer || searchOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawer, searchOpen])

  // Debounced live suggestions: one small request per pause in typing
  useEffect(() => {
    if (term.length < 2) { setSug(null); return }
    const ctl = new AbortController()
    const t = setTimeout(() => { suggestProducts(term, ctl.signal).then(setSug).catch(() => {}) }, 250)
    return () => { clearTimeout(t); ctl.abort() }
  }, [term])

  useEffect(() => { if (!searchOpen) { setQuery(''); setSug(null) } }, [searchOpen])

  const submitSearch = (e) => {
    e.preventDefault()
    if (!term) return
    setSearchOpen(false)
    navigate(`/search?q=${encodeURIComponent(term)}`)
  }

  const openMenu = (name) => { setSearchOpen(false); setShown(name); setActive(name) }
  const toggleSearch = () => { setActive(null); setSearchOpen((v) => !v) }
  const menu = MENUS[shown] || MENUS.Men
  const menuCols = colsOf(MENUS[shown] ? shown : 'Men')

  return (
    <>
      <div aria-hidden="true" onClick={() => setSearchOpen(false)}
        className={`fixed inset-0 z-40 bg-black/25 transition-opacity duration-300 ${active || searchOpen ? 'opacity-100' : 'pointer-events-none opacity-0'} ${searchOpen ? '' : 'pointer-events-none'}`} />

      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#1a1716]/15 bg-[#F7F4EF] text-[#1a1716]" onMouseLeave={() => setActive(null)}>
        {/* Desktop and laptop */}
        <div className="hidden h-16 grid-cols-[1fr_auto_1fr] items-center px-[2.5vw] nav:grid">
          <nav aria-label="Main">
            <ul className="flex h-16 gap-6 xl:gap-8">
              {sections.map((n) => (
                <li key={n} onMouseEnter={() => openMenu(n)}>
                  <Link to={sectionPath(n)} onClick={() => setActive(null)} onFocus={() => openMenu(n)}
                    className={`flex h-full items-center border-b pt-px text-[0.95rem] tracking-wide transition-colors ${active === n ? 'border-[#1a1716]' : 'border-transparent'} focus-visible:outline-2 focus-visible:outline-[#B08D57]`}>
                    {n}{stateOf(n) === 'coming_soon' && <Soon />}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <Brand />
          <div className="flex items-center justify-end gap-5">
            <IconBtn name="search" label="Search" onClick={toggleSearch} />
            <IconBtn name="heart" label="Wishlist" to="/wishlist" badge={wishCount} />
            <IconBtn name="bag" label="Shopping bag" to="/cart" badge={cartCount} />
            <IconBtn name="user" label={accountAria} to={accountTo} dot={accountDot} />
          </div>
        </div>

        {/* Tablet and mobile */}
        <div className="flex h-14 items-center justify-between px-4 nav:hidden">
          <IconBtn name="menu" label="Open menu" onClick={() => setDrawer(true)} />
          <Brand />
                    <div className="flex gap-2">
            <IconBtn name="search" label="Search" onClick={toggleSearch} />
            <IconBtn name="heart" label="Wishlist" to="/wishlist" badge={wishCount} />
            <IconBtn name="bag" label="Shopping bag" to="/cart" badge={cartCount} />
            <IconBtn name="user" label={accountAria} to={accountTo} dot={accountDot} />
          </div>
        </div>

        {/* Mega menu */}
        <div className={`${panel} hidden min-h-[46vh] nav:block ${active ? open : shut}`}>
          <div className="flex min-h-[46vh] gap-8 p-6 xl:gap-16 xl:p-10">
            <div className="grid flex-1 auto-cols-fr grid-flow-col gap-6 xl:gap-10">
              {menuCols.map((c) => (
                <div key={c.title}>
                  <p className="mb-4 font-display text-[1.05rem] font-semibold text-neutral-900">{c.title}</p>
                  <ul className="space-y-2.5">
                    {c.items.map((i) => i.extra ? (
                      <li key={i.extra.slug}><Link to={`/${shown.toLowerCase()}?sub=${i.extra.slug}`} onClick={() => setActive(null)} className="text-[0.95rem] text-neutral-700 transition-colors hover:text-[#B08D57]">{i.extra.name}{i.extra.state === 'coming_soon' && <Soon />}</Link></li>
                    ) : (
                      <li key={i}><Link to={itemTo(shown, c.title, i)} onClick={() => setActive(null)} className="text-[0.95rem] text-neutral-700 transition-colors hover:text-[#B08D57]">{i}{stateOf(shown, c.title, i) === 'coming_soon' && <Soon />}</Link></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {menu.images.length > 0 && (
              <div className="hidden w-[32%] grid-cols-2 gap-4 xl:grid">
                {menu.images.map((label, i) => {
                  const t = media.tile(`nav_${shown.toLowerCase()}_${i + 1}`)  // an uploaded picture, or a product chosen in Admin > Site media
                  return (
                    <Link key={label} to={t?.to || sectionPath(shown)} onClick={() => setActive(null)} className="flex min-h-0 flex-col">
                      <div className="min-h-[14rem] flex-1 overflow-hidden [&_img]:object-top"><Img src={t?.src} alt="" i={i} /></div>
                      <span className="mt-2 text-sm">{t?.label || label}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Search overlay */}
        <div className={`${panel} max-h-[85vh] overflow-y-auto ${searchOpen ? open : shut}`} role="dialog" aria-label="Search HEEM">
          {searchOpen && (
            <div className="p-6 nav:p-10">
              <div className="flex items-start justify-between">
                <h2 className="font-display text-3xl">Search HEEM</h2>
                <IconBtn name="close" label="Close search" onClick={() => setSearchOpen(false)} />
              </div>
              <form onSubmit={submitSearch} role="search">
                <input autoFocus type="search" value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="What are you looking for?" aria-label="Search HEEM"
                  className="mt-6 w-full border-b border-[#1a1716] bg-transparent py-3 font-display text-2xl outline-none placeholder:text-neutral-400 focus:border-[#B08D57]" />
              </form>

              {sug && term.length >= 2 ? (
                <div className="mt-8 grid gap-10 nav:grid-cols-[16rem_1fr]">
                  <div className="space-y-8">
                    {sug.queries.length > 0 && (
                      <div>
                        <p className={sugHead}>Suggestions</p>
                        <ul className="space-y-2.5">
                          {sug.queries.map((n) => (
                            <li key={n}><Link to={`/search?q=${encodeURIComponent(n)}`} onClick={() => setSearchOpen(false)} className={sugLink}>{n}</Link></li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {sug.categories.length > 0 && (
                      <div>
                        <p className={sugHead}>Categories</p>
                        <ul className="space-y-2.5">
                          {sug.categories.map((c) => (
                            <li key={c.slug}><Link to={`/search?category=${c.slug}`} onClick={() => setSearchOpen(false)} className={sugLink}>{c.parent ? `${c.parent} · ${c.name}` : c.name}</Link></li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {sug.collections.length > 0 && (
                      <div>
                        <p className={sugHead}>Collections</p>
                        <ul className="space-y-2.5">
                          {sug.collections.map((c) => (
                            <li key={c.slug}><Link to={`/search?collection=${c.slug}`} onClick={() => setSearchOpen(false)} className={sugLink}>{c.name}</Link></li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className={sugHead}>Products</p>
                    {sug.products.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 nav:grid-cols-5">
                        {sug.products.map((p, i) => (
                          <Link key={p.id} to={`/product/${p.slug}`} onClick={() => setSearchOpen(false)} className="group block">
                            <div className="h-[clamp(9rem,26vh,16rem)] overflow-hidden [&_img]:object-top"><Img src={p.images[0]?.image} alt={p.name} i={i} /></div>
                            <span className="mt-2 block text-sm transition-colors group-hover:text-[#B08D57]">{p.name}</span>
                            <span className="block text-sm text-neutral-600">{formatPrice(p.price)}</span>
                            <span className="block text-xs text-neutral-400">{p.collection_name || p.category_name}</span>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-neutral-500">No matching products.</p>
                    )}
                    <Link to={`/search?q=${encodeURIComponent(term)}`} onClick={() => setSearchOpen(false)}
                      className="mt-8 inline-block border-b border-current pb-1 text-sm uppercase tracking-[0.18em] transition-colors hover:text-[#B08D57]">
                      View all results →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-8 grid gap-10 nav:grid-cols-[14rem_1fr]">
                  <div>
                    <p className={sugHead}>Trending searches</p>
                    <ul className="space-y-2.5">
                      {trending.map((t) => (
                        <li key={t}><Link to={`/search?q=${encodeURIComponent(t)}`} onClick={() => setSearchOpen(false)} className={sugLink}>{t}</Link></li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className={sugHead}>Top rated</p>
                    <div className="grid grid-cols-2 gap-4 nav:grid-cols-4">
                      {topRated.map((t, i) => {
                        const tile = media.tile(`search_top_${i + 1}`)
                        return (
                          <Link key={t} to={tile?.to || `/search?q=${encodeURIComponent(t)}`} onClick={() => setSearchOpen(false)}>
                            <div className="h-[clamp(8rem,24vh,15rem)] overflow-hidden [&_img]:object-top"><Img src={tile?.src} alt="" i={i} /></div>
                            <span className="mt-2 block text-sm">{tile?.label || t}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Mobile drawer */}
      <div className={`fixed inset-0 z-[60] nav:hidden ${drawer ? '' : 'pointer-events-none'}`}>
        <div onClick={() => setDrawer(false)} className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${drawer ? 'opacity-100' : 'opacity-0'}`} />
        <aside aria-label="Menu" inert={!drawer}
          className={`absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col overflow-y-auto bg-[#F7F4EF] px-6 pb-8 text-[#1a1716] transition-transform duration-300 motion-reduce:transition-none ${drawer ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex h-14 items-center justify-between">
            <Brand />
            <IconBtn name="close" label="Close menu" onClick={() => setDrawer(false)} />
          </div>
          <ul className="mt-2 border-t border-[#1a1716]/15">
            {sections.map((name) => {
              const isOpen = expanded === name
              return (
                <li key={name} className="border-b border-[#1a1716]/15">
                  <button type="button" aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? null : name)}
                    className="flex w-full items-center justify-between py-4 font-display text-xl">
                    <span>{name}{stateOf(name) === 'coming_soon' && <Soon />}</span><span aria-hidden="true">{isOpen ? '−' : '+'}</span>
                  </button>
                  <div className={`grid transition-[grid-template-rows] duration-300 motion-reduce:transition-none ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden" inert={!isOpen}>
                      {colsOf(name).map((c) => (
                        <div key={c.title} className="pb-4">
                          <p className="mb-2 font-display text-[1.05rem] font-semibold text-neutral-900">{c.title}</p>
                          <ul className="space-y-2">
                            {c.items.map((i) => i.extra ? (
                              <li key={i.extra.slug}><Link to={`/${name.toLowerCase()}?sub=${i.extra.slug}`} onClick={() => setDrawer(false)} className="block text-[0.95rem] text-neutral-700">{i.extra.name}{i.extra.state === 'coming_soon' && <Soon />}</Link></li>
                            ) : (
                              <li key={i}><Link to={itemTo(name, c.title, i)} onClick={() => setDrawer(false)} className="block text-[0.95rem] text-neutral-700">{i}{stateOf(name, c.title, i) === 'coming_soon' && <Soon />}</Link></li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          <nav aria-label="Your HEEM" className="mt-8 grid grid-cols-2 gap-3">
            <Link to="/wishlist" onClick={() => setDrawer(false)}
              className="group flex flex-col items-start gap-3 border border-[#1a1716]/15 p-4 transition-colors hover:border-[#B08D57] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B08D57]">
              <span className="relative text-[#1a1716] transition-colors group-hover:text-[#B08D57]">
                <Icon name="heart" />
                {wishCount > 0 && <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1a1716] px-1 text-[10px] leading-none text-[#F7F4EF]">{wishCount > 99 ? '99+' : wishCount}</span>}
              </span>
              <span className="font-display text-lg leading-none">Wishlist</span>
              <span className="text-[0.65rem] uppercase tracking-[0.22em] text-neutral-500">{wishCount > 0 ? `${wishCount} saved` : 'Saved pieces'}</span>
            </Link>
            <Link to={accountTo} onClick={() => setDrawer(false)} aria-label={accountAria}
              className="group flex flex-col items-start gap-3 border border-[#1a1716]/15 p-4 transition-colors hover:border-[#B08D57] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B08D57]">
              <span className="relative text-[#1a1716] transition-colors group-hover:text-[#B08D57]">
                <Icon name="user" />
                {accountDot && <span aria-hidden="true" className={`absolute -right-2 -top-1 h-2.5 w-2.5 rounded-full ring-2 ring-[#F7F4EF] ${accountDot === 'red' ? 'bg-red-600' : 'bg-green-600'}`} />}
              </span>
              <span className="font-display text-lg leading-none">{user ? 'Account' : 'Sign in'}</span>
              <span className="text-[0.65rem] uppercase tracking-[0.22em] text-neutral-500">{user ? 'Orders & details' : 'Join HEEM'}</span>
            </Link>
          </nav>
        </aside>
      </div>
    </>
  )
}