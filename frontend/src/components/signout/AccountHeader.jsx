import { Link } from 'react-router-dom'

export default function AccountHeader() {
  return (
    <header className="flex items-center justify-between px-[5vw] py-6">
      <Link to="/account" aria-label="HEEM, back to my account"
        className="font-display text-2xl tracking-[0.32em] pl-[0.32em] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B08D57]">
        HEEM
      </Link>
      <p className="text-[0.7rem] uppercase tracking-[0.28em] text-neutral-500">Account / Sign out</p>
    </header>
  )
}