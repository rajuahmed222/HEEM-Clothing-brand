import { useId, useRef, useState } from 'react'

// Accessible accordion. items: [{ id, title, content }]. One panel open at a time.
// Enter/Space toggle (native button); Arrow Up/Down, Home and End move between questions.
export default function Accordion({ items, headingLevel = 'h3', className = '' }) {
  const [open, setOpen] = useState(null)
  const refs = useRef({})
  const base = useId()
  const H = headingLevel

  const onKey = (e, i) => {
    const target = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: items.length - 1 }[e.key]
    if (target === undefined) return
    e.preventDefault()
    refs.current[items[(target + items.length) % items.length].id]?.focus()
  }

  return (
    <div className={`divide-y divide-[#1a1716]/15 border-y border-[#1a1716]/15 ${className}`}>
      {items.map((it, i) => {
        const isOpen = open === it.id
        const btnId = `${base}-b-${it.id}`
        const panelId = `${base}-p-${it.id}`
        return (
          <div key={it.id}>
            <H>
              <button type="button" id={btnId} ref={(el) => { refs.current[it.id] = el }}
                aria-expanded={isOpen} aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : it.id)} onKeyDown={(e) => onKey(e, i)}
                className="flex w-full items-center justify-between gap-6 py-5 text-left text-lg transition-colors hover:text-[#B08D57] focus-visible:text-[#B08D57] md:py-6">
                <span>{it.title}</span>
                <span aria-hidden="true" className="shrink-0 text-xl leading-none">{isOpen ? '−' : '+'}</span>
              </button>
            </H>
            <div id={panelId} role="region" aria-labelledby={btnId}
              className={`grid transition-[grid-template-rows] duration-300 motion-reduce:transition-none ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div className={`overflow-hidden transition-[visibility] duration-300 ${isOpen ? 'visible' : 'invisible'}`}>
                <div className="max-w-2xl space-y-3 pb-6 leading-relaxed text-neutral-600">{it.content}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}