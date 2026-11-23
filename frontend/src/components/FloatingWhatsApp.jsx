import { useLocation } from 'react-router-dom'
import { useContactSettings, waLink } from '../lib/contactSettings.js'

// Pages where a floating button would sit on top of something the customer must press
const HIDDEN_ON = ['/checkout', '/cart', '/order-confirmation']

export function WhatsAppIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.2a8.8 8.8 0 0 0-7.5 13.4L3.3 20.7l4.2-1.1A8.8 8.8 0 1 0 12 3.2z" />
      <path d="M9.2 8.4c-.4.4-.5 1.1-.2 1.9.7 1.9 2.7 3.9 4.7 4.7.8.3 1.5.2 1.9-.2l.5-.7c.1-.2.1-.4-.1-.5l-1.6-.8c-.2-.1-.4 0-.5.1l-.5.6c-.9-.4-1.9-1.4-2.3-2.3l.6-.5c.1-.1.2-.3.1-.5l-.8-1.6c-.1-.2-.3-.2-.5-.1l-.7.5z" />
    </svg>
  )
}

export default function FloatingWhatsApp() {
  const { data } = useContactSettings()
  const { pathname } = useLocation()
  if (!data?.floating_whatsapp || !data.whatsapp) return null
  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null

  // On a phone, product pages have a sticky "Add to bag" bar at the bottom: sit above it
  const lifted = pathname.startsWith('/product/')
  return (
    <a
      href={waLink(data.whatsapp, data.whatsapp_message)}
      target="_blank" rel="noopener noreferrer"
      aria-label="Chat with HEEM on WhatsApp (opens in a new tab)"
      className={`group fixed right-4 z-30 flex items-center gap-3 print:hidden motion-safe:animate-[fadeIn_0.6s_ease_both] md:right-6 ${lifted ? 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-6' : 'bottom-[max(1.25rem,env(safe-area-inset-bottom))] md:bottom-6'}`}
    >
      <span className="pointer-events-none hidden translate-x-2 bg-[#F7F4EF] px-3 py-2 text-xs uppercase tracking-[0.18em] text-[#1a1716] opacity-0 shadow-sm transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 md:block">
        Chat on WhatsApp
      </span>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1a1716] text-[#F7F4EF] shadow-lg ring-1 ring-[#B08D57]/70 transition-colors duration-300 group-hover:bg-[#B08D57] group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-[#B08D57]">
        <WhatsAppIcon className="h-7 w-7" />
      </span>
    </a>
  )
}