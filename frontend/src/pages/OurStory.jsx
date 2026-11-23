import { Link } from 'react-router-dom'
import EditorialHero from '../components/editorial/EditorialHero.jsx'
import SectionHeading from '../components/editorial/SectionHeading.jsx'
import Reveal from '../components/editorial/Reveal.jsx'
import { Img } from '../components/ProductCard.jsx'
import usePageMeta from '../lib/usePageMeta.js'

// Put real photographs in frontend/public/images/ and set the paths here, e.g. '/images/our-story-hero.jpg'.
// While a value is null the page shows a quiet tonal placeholder instead of a broken image.
const IMAGES = { hero: null, intro: null, silhouettes: null, styling: null, versatility: null, selection: null }

const PHILOSOPHY = [
  ['01', 'Individuality', 'No two people wear a piece the same way. We leave room in every design for you to make it yours.'],
  ['02', 'Timeless style', 'We favour considered silhouettes over fast-moving trends, so a piece still feels right next season and the one after.'],
  ['03', 'Thoughtful design', 'Proportion, fit and detail are decided on purpose. If a detail has no reason to be there, it does not belong.'],
  ['04', 'Everyday confidence', 'Luxury is not only for occasions. It is how a garment feels on an ordinary day.'],
]

const APPROACH = [
  { key: 'silhouettes', title: 'Silhouettes', alt: 'A HEEM garment showing its silhouette',
    text: 'We start with shape. A clean line and honest proportions let the wearer, not the garment, take centre stage.' },
  { key: 'styling', title: 'Styling', alt: 'A HEEM outfit styled for everyday wear',
    text: 'Every piece is designed to sit comfortably next to the others, so building an outfit feels natural rather than like a puzzle.' },
  { key: 'versatility', title: 'Versatility', alt: 'The same HEEM piece worn in two different ways',
    text: 'The best clothes move between settings. We look for pieces that work from morning to evening and across seasons.' },
  { key: 'selection', title: 'Garment selection', alt: 'A close view of a HEEM garment',
    text: 'We would rather offer fewer pieces we believe in than many we do not. Each one has to earn its place in the collection.' },
]

const VISION = [
  'A wardrobe of pieces that work together, season after season.',
  'Clear fit and product details, so every order is a confident one.',
  'A brand that keeps growing with the people who wear it.',
]

function Photo({ src, alt, className = '' }) {
  return <div className={`aspect-[4/5] overflow-hidden bg-[#1a1716]/[0.05] ${className}`}><Img src={src} alt={alt} /></div>
}

export default function OurStory() {
  usePageMeta('Our Story', 'HEEM is clothing for people who dress as an expression of who they are. Discover our philosophy and approach to design.')

  return (
    <>
      <EditorialHero
        size="tall"
        eyebrow="THE WORLD OF HEEM"
        title="More Than What You Wear."
        intro="HEEM is clothing for people who dress as an expression of who they are, designed to be worn often and styled your way."
        image={IMAGES.hero} imageAlt="HEEM editorial photograph"
        cta={{ label: 'DISCOVER OUR PHILOSOPHY', target: 'introduction' }}
      />

      {/* Brand introduction */}
      <section id="introduction" aria-labelledby="intro-title" className="grid gap-12 px-[2.5vw] py-20 md:grid-cols-2 md:items-center md:gap-20 md:py-32">
        <Reveal><Photo src={IMAGES.intro} alt="A HEEM piece worn in everyday life" /></Reveal>
        <Reveal delay={150}>
          <SectionHeading eyebrow="What HEEM stands for" as="h2" id="intro-title" title="Clothing is how identity becomes visible." />
          <p className="mt-6 max-w-xl leading-relaxed text-neutral-600">
            HEEM begins with a simple idea: what you wear should feel like you. Not a trend you are keeping up with, but a quiet,
            confident expression of who you are.
          </p>
          <p className="mt-4 max-w-xl leading-relaxed text-neutral-600">
            We design pieces to be lived in, styled in your own way, and worn again and again. Our tagline says it plainly:
            wear your identity.
          </p>
        </Reveal>
      </section>

      {/* Philosophy */}
      <section aria-labelledby="philosophy-title" className="border-y border-[#1a1716]/15 px-[2.5vw] py-20 md:py-28">
        <SectionHeading eyebrow="Our philosophy" id="philosophy-title" title="Four ideas we design around." />
        <div className="mt-14 grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {PHILOSOPHY.map(([n, t, text], i) => (
            <Reveal key={n} delay={i * 100} className="border-t border-[#1a1716]/30 pt-6">
              <p className="font-display text-xl text-[#B08D57]">{n}</p>
              <h3 className="mt-4 font-display text-2xl">{t}</h3>
              <p className="mt-3 leading-relaxed text-neutral-600">{text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Design approach: alternating image and text */}
      <section aria-labelledby="approach-title" className="px-[2.5vw] py-20 md:py-32">
        <SectionHeading eyebrow="Design approach" id="approach-title" title="How we think about a garment." />
        <div className="mt-16 space-y-20 md:space-y-28">
          {APPROACH.map((a, i) => (
            <Reveal key={a.key} className={`grid items-center gap-10 md:grid-cols-2 md:gap-20 ${i % 2 ? 'md:[&>*:first-child]:order-2' : ''}`}>
              <Photo src={IMAGES[a.key]} alt={a.alt} className="md:aspect-[4/5]" />
              <div>
                <h3 className="font-display text-3xl md:text-4xl">{a.title}</h3>
                <p className="mt-5 max-w-md leading-relaxed text-neutral-600">{a.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Vision: stated as aims, not as achievements */}
      <section aria-labelledby="vision-title" className="bg-[#1a1716] px-[2.5vw] py-20 text-[#F7F4EF] md:py-28">
        <p className="text-xs uppercase tracking-[0.3em] text-[#c9b48a]">The HEEM vision</p>
        <h2 id="vision-title" className="mt-3 max-w-3xl font-display text-3xl leading-tight md:text-5xl">What we are building towards.</h2>
        <ul className="mt-12 grid gap-8 md:grid-cols-3">
          {VISION.map((v) => <li key={v} className="border-t border-white/25 pt-6 leading-relaxed text-white/80">{v}</li>)}
        </ul>
        <p className="mt-10 text-sm text-white/50">These are our aims for the brand, not milestones we have already reached.</p>
      </section>

      {/* Closing call to action */}
      <section aria-labelledby="cta-title" className="px-[2.5vw] py-24 text-center md:py-36">
        <h2 id="cta-title" className="font-display text-4xl md:text-6xl">Find Your Expression.</h2>
        <Link to="/collections"
          className="mt-10 inline-block bg-[#1a1716] px-8 py-3.5 text-sm uppercase tracking-[0.2em] text-[#F7F4EF] transition-colors hover:bg-[#B08D57] focus-visible:bg-[#B08D57]">
          EXPLORE THE COLLECTION
        </Link>
      </section>
    </>
  )
}