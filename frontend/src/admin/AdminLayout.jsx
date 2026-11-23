import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { API } from '../Api.jsx'
import { adm } from './ui.jsx'

const NAV = [
  ['/admin', 'Dashboard', true],
  ['/admin/orders', 'Orders'],
  ['/admin/payments', 'Payments'],
  ['/admin/customers', 'Customers'],
  ['/admin/emails', 'Emails'],
  ['/admin/messages', 'Messages'],
  ['/admin/products', 'Products'],
  ['/admin/categories', 'Categories'],
  ['/admin/media', 'Site media'],
  ['/admin/analytics', 'Analytics'],
  ['/admin/contact', 'Contact settings'],
]

export default function AdminLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [state, setState] = useState('loading') // loading | ok | denied | error

  useEffect(() => {
    document.title = 'HEEM admin'
    adm('me/').then(() => setState('ok')).catch((e) => setState(e.status === 403 ? 'denied' : 'error'))
  }, [])

  if (state === 'loading') return <div className="min-h-screen bg-[#F7F4EF] p-10 text-neutral-600">Loading…</div>
  if (state !== 'ok') {
    return (
      <div className="min-h-screen bg-[#F7F4EF] p-10">
        <h1 className="font-display text-3xl">{state === 'denied' ? 'Staff only' : 'Cannot load admin'}</h1>
        <p className="mt-3 max-w-md text-neutral-600">
          {state === 'denied' ? 'This account is not a staff account. Sign in with the admin account, or tick "Staff status" for this user in the Django admin.' : 'Could not reach the server. Is the backend running?'}
        </p>
        <Link to="/" className="mt-6 inline-block underline">Back to the shop</Link>
      </div>
    )
  }

  const link = ({ isActive }) => `block px-4 py-2 text-sm transition-colors ${isActive ? 'bg-[#F7F4EF] text-[#1a1716]' : 'text-white/70 hover:text-white'}`
  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1a1716] md:flex">
      <aside className="bg-[#1a1716] md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0">
        <div className="flex items-center justify-between px-4 py-4 md:block">
          <p className="font-display text-2xl tracking-[0.25em] text-white">HEEM</p>
          <p className="hidden text-xs uppercase tracking-[0.2em] text-white/50 md:block">Admin</p>
        </div>
        <nav className="flex overflow-x-auto md:block" aria-label="Admin">
          {NAV.map(([to, label, end]) => <NavLink key={to} to={to} end={end} className={link}>{label}</NavLink>)}
        </nav>
        <div className="hidden border-t border-white/10 p-4 text-sm md:absolute md:bottom-0 md:block md:w-56">
          <Link to="/" className="block py-1 text-white/70 hover:text-white">View shop</Link>
          <a href={`${API}/admin/`} className="block py-1 text-white/70 hover:text-white">Django admin</a>
          <button type="button" onClick={async () => { await logout(); navigate('/') }} className="block py-1 text-white/70 hover:text-white">Sign out</button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8"><Outlet /></main>
    </div>
  )
}