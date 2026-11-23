import { Link } from 'react-router-dom'

// onConfirm signs out; "Stay with HEEM" simply goes back to the dashboard. Nothing happens by opening the page.
export default function SignOutActions({ busy, error, onConfirm, onForce }) {
  return (
    <div className="mt-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
        <button type="button" onClick={onConfirm} disabled={busy}
          className="w-full bg-[#171717] px-9 py-4 text-sm uppercase tracking-[0.2em] text-[#F3EFE7] transition-colors duration-300 hover:bg-[#B08D57] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B08D57] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#171717] sm:w-auto">
          {busy ? 'Signing you out…' : <>Yes, sign me out <span aria-hidden="true">&rarr;</span></>}
        </button>
        <Link to="/account"
          className="text-center text-sm uppercase tracking-[0.2em] underline underline-offset-[6px] transition-colors hover:text-[#B08D57] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B08D57] sm:text-left">
          Stay with HEEM
        </Link>
      </div>

      {error && (
        <div role="alert" className="mt-6 max-w-md text-sm leading-relaxed text-[#8a6d3b]">
          <p>{error}</p>
          <button type="button" onClick={onForce} className="mt-2 underline underline-offset-4 hover:text-[#171717]">
            Sign out on this device anyway
          </button>
        </div>
      )}
    </div>
  )
}