import { Eyebrow, Frame, Reveal, pad } from './parts.jsx'

// Editorial introduction: big headline, two short paragraphs, a quiet credits list, one portrait.
export default function Intro({ intro, src }) {
  return (
    <section className={`${pad} py-24 md:py-44`}>
      <div className="grid items-start gap-14 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-7 md:pr-10">
          <Reveal><Eyebrow>{intro.eyebrow}</Eyebrow></Reveal>
          <Reveal delay={120}>
            <h2 className="mt-8 font-display text-[clamp(2.6rem,7.5vw,6.5rem)] uppercase leading-[0.95]">{intro.title}</h2>
          </Reveal>
          <div className="mt-10 max-w-xl space-y-6 text-base leading-[1.85] text-neutral-400 md:mt-14 md:text-lg">
            {intro.body.map((t, i) => <Reveal key={i} delay={200 + i * 120}><p>{t}</p></Reveal>)}
          </div>
          <Reveal delay={500}>
            <dl className="mt-12 grid max-w-xl grid-cols-2 gap-x-6 gap-y-6 border-t border-white/15 pt-8">
              {intro.credits.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">{k}</dt>
                  <dd className="mt-1 text-sm text-white/90">{v}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
        <Reveal className="md:col-span-5 md:mt-24">
          <div className="group mx-auto max-w-md md:max-w-none"><Frame src={src} alt="Campaign portrait" ratio="aspect-[4/5]" pos="object-top" tone={1} /></div>
        </Reveal>
      </div>
    </section>
  )
}