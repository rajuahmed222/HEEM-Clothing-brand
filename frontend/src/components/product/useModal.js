import { useEffect, useRef } from 'react'

// Shared by the fullscreen image viewer and the size guide:
// locks page scroll, closes on Escape, and returns focus to the button that opened it.
export default function useModal(onClose) {
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const trigger = document.activeElement
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') close.current() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      trigger?.focus?.()
    }
  }, [])
}