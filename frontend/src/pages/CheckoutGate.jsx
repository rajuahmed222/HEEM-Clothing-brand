import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useShop } from '../context/ShopContext.jsx'
import Checkout from './Checkout.jsx'

const card = 'flex flex-col border border-[#1a1716]/20 p-8 md:p-10'
const solid = 'block w-full bg-[#1a1716] py-4 text-center text-sm uppercase tracking-[0.2em] text-[#F7F4EF] transition-colors hover:bg-[#B08D57]'
const ghost = 'block w-full border border-[#1a1716]/30 py-4 text-center text-sm uppercase tracking-[0.2em] transition-colors hover:border-[#1a1716]'

// /checkout for everyone. Signed in = the normal checkout. Signed out = choose: sign in / create account, or continue as a guest.
export default function CheckoutGate() {
  const { user, ready } = useAuth()
  const { cart, loaded } = useShop()

  useEffect(() => { document.title = 'Checkout - HEEM' }, [])

  if (!ready) return <section className="px-[2.5vw] py-24" aria-busy="true"><div className="h-10 w-48 animate-pulse bg-[#1a1716]/[0.06]" /></section>
  if (user) return <Checkout />

  if (loaded && cart.items.length === 0) {
    return (
      <section className="px-[2.5vw] py-32 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Checkout</p>
        <h1 className="mt-4 font-display text-3xl md:text-4xl">Your bag is empty</h1>
        <Link to="/search" className="mt-10 inline-block bg-[#1a1716] px-10 py-4 text-sm uppercase tracking-[0.2em] text-[#F7F4EF] transition-colors hover:bg-[#B08D57]">Discover the Collection</Link>
      </section>
    )
  }

  return (
    <section className="px-[2.5vw] pb-24">
      <header className="pb-10 pt-12 md:pt-16">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Secure checkout</p>
        <h1 className="mt-4 font-display text-5xl uppercase leading-none md:text-6xl">How would you like to continue?</h1>
      </header>

      <div className="grid max-w-4xl gap-6 md:grid-cols-2">
        <div className={card}>
          <h2 className="font-display text-2xl">Sign in or create an account</h2>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">Save your addresses, follow every order in one place and check out faster next time. Your bag is kept.</p>
          <div className="mt-auto space-y-3 pt-8">
            <Link to="/login" state={{ from: '/checkout' }} className={solid}>Sign in</Link>
            <Link to="/signup" className={ghost}>Create account</Link>
          </div>
        </div>

        <div className={card}>
          <h2 className="font-display text-2xl">Continue as guest</h2>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">No password and no account. Enter your delivery details, pay, and we email you a private link to follow your order.</p>
          <div className="mt-auto pt-8">
            <Link to="/checkout/guest" className={solid}>Continue as guest</Link>
          </div>
        </div>
      </div>

      <p className="mt-8 text-sm text-neutral-500">Already ordered? <Link to="/track" className="underline underline-offset-4 hover:text-[#B08D57]">Track your order</Link>.</p>
    </section>
  )
}