import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useShop } from '../../context/ShopContext.jsx'
import useOrderAlerts from '../../lib/orderAlerts.js'
import useModal from '../product/useModal.js'
import AccountIcon from './AccountIcons.jsx'

const ITEMS = [
  { to: '/account', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/account/orders', label: 'My Orders', icon: 'orders', key: 'orders' },
  { to: '/account/tracking', label: 'Order Tracking', icon: 'truck' },
  { to: '/account/profile', label: 'Personal Information', icon: 'user' },
  { to: '/account/addresses', label: 'Addresses', icon: 'pin' },
  { to: '/wishlist', label: 'Wishlist', icon: 'heart', key: 'wish' },
  { to: '/cart', label: 'My Bag', icon: 'bag', key: 'bag' },
]

function NavList({ onNavigate }) {
  const { user } = useAuth()
  const { cartCount, wishCount } = useShop()
  const { dot } = useOrderAlerts()
  const counts = { wish: wishCount, bag: cartCount }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-6 pb-6 pt-8">
        <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">My account</p>
        <p className="mt-3 font-display text-xl leading-tight">{user.full_name}</p>
        <p className="mt-1 break-all text-xs text-neutral-500">{user.email}</p>
      </div>

      <nav aria-label="Account" className="flex-1 overflow-y-auto">
        <ul>
          {ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} end={item.end} onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-3 border-l-2 px-6 py-3.5 text-[0.95rem] transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#B08D57] ${isActive ? 'border-[#1a1716] bg-[#1a1716]/[0.04]' : 'border-transparent text-neutral-600 hover:text-[#B08D57]'}`}>
                <AccountIcon name={item.icon} />
                <span className="flex-1">{item.label}</span>
                {item.key === 'orders' && dot && (
                  <>
                    <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dot === 'red' ? 'bg-red-600' : 'bg-green-600'}`} />
                    <span className="sr-only">{dot === 'red' ? 'A payment needs your attention' : 'A payment was verified'}</span>
                  </>
                )}
                {counts[item.key] > 0 && <span className="text-xs text-neutral-500">{counts[item.key]}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-[#1a1716]/15 p-3">
        <Link to="/account/signout" onClick={onNavigate}
          className="flex w-full items-center gap-3 px-3 py-3 text-[0.95rem] text-neutral-500 transition-colors hover:text-[#8a6d3b] focus-visible:outline-2 focus-visible:outline-[#B08D57]">
          <AccountIcon name="logout" />Sign Out
        </Link>
      </div>
    </div>
  )
}

function Drawer({ onClose }) {
  useModal(onClose)
  return (
    <div className="fixed inset-0 z-[60] xl:hidden">
      <div onClick={onClose} className="absolute inset-0 bg-black/30" />
      <div role="dialog" aria-modal="true" aria-label="Account menu"
        className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-[#F7F4EF]">
        <div className="flex justify-end px-4 pt-4">
          <button type="button" autoFocus onClick={onClose} aria-label="Close menu" className="p-2 text-2xl leading-none hover:text-[#B08D57]">×</button>
        </div>
        <NavList onNavigate={onClose} />
      </div>
    </div>
  )
}

// Wrap account pages with this. Pass `children` (Cart / Wishlist) or use it as a route element with nested routes.
export default function AccountLayout({ children }) {
  const [drawer, setDrawer] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => { setDrawer(false) }, [pathname])

  return (
    <div className="xl:flex">
      <aside aria-label="Account menu"
        className="hidden w-64 shrink-0 flex-col border-r border-[#1a1716]/15 xl:sticky xl:top-16 xl:flex xl:h-[calc(100svh-4rem)] xl:self-start">
        <NavList />
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b border-[#1a1716]/15 px-[2.5vw] py-3 xl:hidden">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">My account</p>
          <button type="button" aria-haspopup="dialog" aria-expanded={drawer} onClick={() => setDrawer(true)}
            className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] hover:text-[#B08D57] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B08D57]">
            <AccountIcon name="menu" />Menu
          </button>
        </div>
        {children ?? <Outlet />}
      </div>

      {drawer && <Drawer onClose={() => setDrawer(false)} />}
    </div>
  )
}