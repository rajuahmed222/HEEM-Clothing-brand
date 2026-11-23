import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { setFlash } from '../Flash.jsx'
import useModal from '../product/useModal.js'

// Nobody is signed out until they press "Sign Out" here. Esc, the backdrop and "Stay with HEEM" all just close it.
export default function SignOutDialog({ onClose }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  useModal(onClose)

  const confirm = async () => {
    if (busy) return
    setBusy(true)
    await logout() // deletes the login token on the server and clears it here; orders, addresses and wishlist stay saved
    try { localStorage.removeItem('heem_seen_paid') } catch { /* ignore */ }
    setFlash('You\u2019ve signed out successfully. See you again soon.')
    navigate('/', { replace: true })
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center md:items-center">
      <div onClick={busy ? undefined : onClose} className="absolute inset-0 bg-black/40" />
      <div role="dialog" aria-modal="true" aria-labelledby="signout-title" aria-describedby="signout-text"
        className="relative w-full max-w-md bg-[#F7F4EF] p-8 text-center md:p-10">
        {/* step 3 adds the front door and cat illustration here */}
        <h2 id="signout-title" className="font-display text-3xl">Leaving so soon?</h2>
        <p id="signout-text" className="mt-4 leading-relaxed text-neutral-600">
          Thank you for being part of HEEM. We hope to see you again soon.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button type="button" autoFocus onClick={onClose} disabled={busy}
            className="bg-[#1a1716] px-8 py-3.5 text-sm uppercase tracking-[0.2em] text-[#F7F4EF] transition-colors hover:bg-[#B08D57] disabled:opacity-40">
            Stay with HEEM
          </button>
          <button type="button" onClick={confirm} disabled={busy}
            className="border border-[#1a1716]/30 px-8 py-3.5 text-sm uppercase tracking-[0.2em] transition-colors hover:border-[#1a1716] disabled:opacity-40">
            {busy ? 'Signing out…' : 'Sign Out'}
          </button>
        </div>
      </div>
    </div>
  )
}