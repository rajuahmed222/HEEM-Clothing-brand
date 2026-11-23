import { useEffect, useRef, useState } from 'react'

// Fades a block in once when it scrolls into view. Uses the .reveal / .in classes from index.css,
// which already switch the effect off for visitors who prefer reduced motion.
export default function Reveal({ as: Tag = 'div', delay = 0, className = '', children }) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (!('IntersectionObserver' in window)) { setSeen(true); return undefined }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setSeen(true); io.disconnect() }
    }, { threshold: 0.12 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag ref={ref} style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`reveal ${seen ? 'in' : ''} ${className}`}>
      {children}
    </Tag>
  )
}