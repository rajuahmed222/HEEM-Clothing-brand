import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

const KEY = 'heem_flash'

// Call before navigating: the message appears once on the next page.
export function setFlash(text) {
  try { sessionStorage.setItem(KEY, text) } catch { /* storage blocked: no message, nothing else breaks */ }
}

// Mount once in App.jsx
export default function Flash() {
  const { pathname } = useLocation()
  const [text, setText] = useState('')
  const timer = useRef(null)

  useEffect(() => {
    let value = null
    try { value = sessionStorage.getItem(KEY); if (value) sessionStorage.removeItem(KEY) } catch { /* ignore */ }
    if (!value) return
    setText(value)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setText(''), 6000)
  }, [pathname])
  useEffect(() => () => clearTimeout(timer.current), [])

  if (!text) return null
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[90] flex justify-center px-4">
      <p className="pointer-events-auto flex items-center gap-4 bg-[#1a1716] px-6 py-3 text-sm text-[#F7F4EF]">
        {text}
        <button type="button" onClick={() => setText('')} aria-label="Dismiss message" className="text-lg leading-none opacity-70 hover:opacity-100">×</button>
      </p>
    </div>
  )
}