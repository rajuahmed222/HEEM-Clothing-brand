// Small uppercase label, big serif title, optional intro. One look for every editorial section.
export default function SectionHeading({ eyebrow, title, intro, as: H = 'h2', id, className = '' }) {
  return (
    <div className={className}>
      {eyebrow && <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">{eyebrow}</p>}
      <H id={id} className="mt-3 font-display text-3xl leading-tight md:text-5xl">{title}</H>
      {intro && <p className="mt-5 max-w-xl leading-relaxed text-neutral-600">{intro}</p>}
    </div>
  )
}