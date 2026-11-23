import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Wrap account pages with this. Signed-out visitors are sent to /login and come back after signing in.
export default function ProtectedRoute() {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <p className="px-[2.5vw] py-32 text-neutral-600">Loading…</p>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}