import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { request, setToken } from '../Api.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { setFlash } from '../components/Flash.jsx'
import AccountHeader from '../components/signout/AccountHeader.jsx'
import AccountFooter from '../components/signout/AccountFooter.jsx'
import SignOutHero from '../components/signout/SignOutHero.jsx'
import SignOutActions from '../components/signout/SignOutActions.jsx'
import SignOutScene from '../components/signout/SignOutScene.jsx'

// Opening this page signs nobody out. Only the "Yes, sign me out" button does.
export default function SignOut() {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef(false)

  useEffect(() => { document.title = 'Sign out - HEEM' }, [])

  // Clears everything private on this device, then leaves the account area.
  // Orders, addresses and wishlist stay saved on the server.
  const finish = () => {
    try { localStorage.removeItem('heem_seen_paid') } catch { /* ignore */ }
    setFlash('You\u2019ve signed out successfully. See you again soon.')
    navigate('/', { replace: true }) // leave first, so the protected page never bounces to /login
    setToken(null)
    setUser(null)
  }

  const signOut = async () => {
    if (inFlight.current) return // no double submits
    inFlight.current = true
    setBusy(true)
    setError('')
    try {
      await request('account/logout/', { method: 'POST' }) // deletes this login token on the server
    } catch (e) {
      // 401 = the token was already invalid on the server, which is exactly what we want
      if (e.status !== 401) {
        setError(e.status === 0
          ? 'We could not reach the server, so your sign-in was not cancelled there yet. Check your connection and try again.'
          : 'Something went wrong while signing you out. Please try again.')
        inFlight.current = false
        setBusy(false)
        return
      }
    }
    finish()
  }

  return (
    <div className="flex min-h-svh flex-col bg-[#F3EFE7] text-[#171717]">
      <AccountHeader />
      <main className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-10 px-[5vw] py-6 lg:grid-cols-[1fr_1.05fr] lg:gap-20 lg:py-12">
        <div className="order-1 lg:order-2"><SignOutScene /></div>
        <div className="order-2 lg:order-1">
          <SignOutHero />
          <SignOutActions busy={busy} error={error} onConfirm={signOut} onForce={finish} />
        </div>
      </main>
      <AccountFooter />
    </div>
  )
}