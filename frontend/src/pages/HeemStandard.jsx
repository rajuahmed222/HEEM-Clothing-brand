import { Link } from 'react-router-dom'
import EditorialHero from '../components/editorial/EditorialHero.jsx'
import SectionHeading from '../components/editorial/SectionHeading.jsx'
import Reveal from '../components/editorial/Reveal.jsx'
import usePageMeta from '../lib/usePageMeta.js'

// IMPORTANT: this page states principles, not certifications. It makes no claim about handmade work, sustainability,
// origin or specific materials. When you can verify such details, add them here (or on each product's Fabric / Care fields).
const PRINCIPLES = [
  {
    id: 'fabric', n: '01', title: 'Fabric and material selection',
    text: 'A garment begins with its cloth. We choose fabrics for how they feel, hang and age, and we publish each piece\'s fabric details on its product page so you can see what you are buying before you buy it.',
    more: { label: 'Browse the collection', to: '/collections' },
  },
  {
    id: 'fit', n: '02', title: 'Fit and comfort',
    text: 'Good fit is what makes clothes feel effortless. Product pages show the intended fit, the size the model is wearing and the model\'s height, and our size guide helps you choose your size.',
    more: { label: 'Open the size guide', to: '/size-guide' },
  },
  {
    id: 'finish', n: '03', title: 'Construction and finishing',
    text: 'Quality shows in the small things: seams, hems, stitching and trims. These are the details we look at closely when we decide whether a piece belongs in HEEM.',
  },
  {
    id: 'timeless', n: '04', title: 'Timeless design',
    text: 'We design for the long run. Clean lines and considered proportions keep a piece relevant well beyond the season it arrives in.',
    more: { label: 'Read our story', to: '/our-story' },
  },
  {
    id: 'care', n: '05', title: 'Garment care and longevity',
    text: 'How you look after a garment decides how long it lasts. Always follow the care instructions listed on the product page and on the garment label. As general advice, wash similar colours together, avoid harsh heat and store pieces clean and dry.',
  },
]

export default function HeemStandard() {
  usePageMeta('The HEEM Standard', 'The principles behind every HEEM piece: fabric, fit, finishing, timeless design and garment care.')

  return (
    <>
      <EditorialHero
        eyebrow="OUR PRINCIPLES"
        title="The HEEM Standard"
        intro="Thoughtful clothing comes from considered decisions. These are the principles we hold every piece to."
      />

      <div className="px-[2.5vw] py-20 md:py-32">
        <SectionHeading as="h2" title="Five things we care about." intro="A standard is only useful if you can check it. Wherever we can, the detail is on the product page, not just on this one." />

        <ol className="mt-16 divide-y divide-[#1a1716]/15 border-y border-[#1a1716]/15">
          {PRINCIPLES.map((p) => (
            <li key={p.id}>
              <Reveal as="section" className="grid gap-6 py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:gap-20 md:py-16" >
                <div>
                  <p className="font-display text-xl text-[#B08D57]">{p.n}</p>
                  <h3 className="mt-3 font-display text-3xl leading-tight md:text-4xl">{p.title}</h3>
                </div>
                <div>
                  <p className="max-w-xl leading-relaxed text-neutral-600">{p.text}</p>
                  {p.more && (
                    <Link to={p.more.to} className="mt-6 inline-block border-b border-current pb-1 text-sm uppercase tracking-[0.18em] transition-colors hover:text-[#B08D57] focus-visible:text-[#B08D57]">
                      {p.more.label}
                    </Link>
                  )}
                </div>
              </Reveal>
            </li>
          ))}
        </ol>

        <p className="mt-10 max-w-xl text-sm text-neutral-500">
          Questions about a specific garment? Visit the <Link to="/faq" className="underline underline-offset-4 hover:text-[#B08D57]">FAQ</Link> or{' '}
          <Link to="/contact" className="underline underline-offset-4 hover:text-[#B08D57]">contact us</Link>.
        </p>
      </div>

      <section aria-labelledby="standard-cta" className="bg-[#1a1716] px-[2.5vw] py-24 text-center text-[#F7F4EF] md:py-32">
        <h2 id="standard-cta" className="font-display text-3xl md:text-5xl">See it for yourself.</h2>
        <Link to="/collections"
          className="mt-10 inline-block border border-white/70 px-8 py-3.5 text-sm uppercase tracking-[0.2em] transition-colors hover:bg-white hover:text-[#1a1716] focus-visible:bg-white focus-visible:text-[#1a1716]">
          EXPLORE OUR COLLECTIONS
        </Link>
      </section>
    </>
  )
}