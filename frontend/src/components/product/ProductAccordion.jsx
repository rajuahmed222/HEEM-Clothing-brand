import { useState } from 'react'

// items: [{ id, title, body }] - the page only passes sections that have real content.
export default function ProductAccordion({ items }) {
  const [open, setOpen] = useState(items[0]?.id ?? null)
  return (
    <div className="border-t border-[#1a1716]/15">
      {items.map((it) => {
        const on = open === it.id
        return (
          <div key={it.id} className="border-b border-[#1a1716]/15">
            <h3>
              <button type="button" id={`acc-${it.id}`} aria-expanded={on} aria-controls={`acc-${it.id}-panel`}
                onClick={() => setOpen(on ? null : it.id)}
                className="flex w-full items-center justify-between py-5 text-left font-display text-[1.15rem] font-semibold focus-visible:outline-2 focus-visible:outline-[#B08D57]">
                {it.title}<span aria-hidden="true">{on ? '−' : '+'}</span>
              </button>
            </h3>
            <div id={`acc-${it.id}-panel`} role="region" aria-labelledby={`acc-${it.id}`}
              className={`grid transition-[grid-template-rows] duration-300 motion-reduce:transition-none ${on ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div className="overflow-hidden" inert={!on}>
                <div className="max-w-2xl pb-6 leading-relaxed text-neutral-600">{it.body}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}