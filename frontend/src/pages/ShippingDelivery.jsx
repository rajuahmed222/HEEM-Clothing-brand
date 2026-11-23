import { Link } from 'react-router-dom'
import EditorialHero from '../components/editorial/EditorialHero.jsx'
import Reveal from '../components/editorial/Reveal.jsx'
import { formatPrice } from '../Api.jsx'
import { usePolicy } from '../lib/policy.js'
import { SHIPPING } from '../data/business.js'
import usePageMeta from '../lib/usePageMeta.js'

const linkCls = 'underline underline-offset-4 transition-colors hover:text-[#B08D57]'

function Block({ id, title, children }) {
  return (
    <Reveal as="section" className="grid gap-5 py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] md:gap-20 md:py-16">
      <h2 id={id} className="font-display text-3xl leading-tight md:text-4xl">{title}</h2>
      <div className="max-w-xl space-y-4 leading-relaxed text-neutral-600">{children}</div>
    </Reveal>
  )
}

export default function ShippingDelivery() {
  usePageMeta('Shipping & Delivery', 'How HEEM delivers across Bangladesh: coverage, delivery charges, tracking and what to do if something goes wrong.')
  const { dhaka, outside, freeOver } = usePolicy()
  const hasCharges = dhaka !== null && outside !== null

  return (
    <>
      <EditorialHero size="compact" eyebrow="CLIENT SERVICES" title="Shipping & Delivery"
        intro="We deliver across Bangladesh. Here is how delivery works, from your order to your door." />

      <div className="divide-y divide-[#1a1716]/15 px-[2.5vw] py-8 md:py-16">
        <Block id="ship-coverage" title="Delivery coverage">
          <p>We deliver to addresses across Bangladesh. Your delivery charge depends on whether your address is inside or outside Dhaka, and it is based on the district you choose at checkout.</p>
        </Block>

        <Block id="ship-processing" title="Order processing">
          <p>{SHIPPING.processing || 'After you place an order, our team prepares it for dispatch. If you paid by bKash, Nagad or Rocket, the order is confirmed once your payment has been verified.'}</p>
          <p>Every step is recorded on your order page, so you always know where your order stands.</p>
        </Block>

        <Block id="ship-times" title="Estimated delivery times">
          {SHIPPING.dhakaTime || SHIPPING.outsideTime ? (
            <ul className="space-y-2">
              {SHIPPING.dhakaTime && <li><span className="text-[#1a1716]">Inside Dhaka:</span> {SHIPPING.dhakaTime}</li>}
              {SHIPPING.outsideTime && <li><span className="text-[#1a1716]">Outside Dhaka:</span> {SHIPPING.outsideTime}</li>}
            </ul>
          ) : (
            <p>Delivery time depends on your location and on when your order is handed to the courier. We do not promise a fixed date, but your order page shows each step as it happens.</p>
          )}
        </Block>

        <Block id="ship-charges" title="Delivery charges">
          {hasCharges ? (
            <ul className="space-y-2">
              <li><span className="text-[#1a1716]">Inside Dhaka:</span> {formatPrice(dhaka)}</li>
              <li><span className="text-[#1a1716]">Outside Dhaka:</span> {formatPrice(outside)}</li>
              {freeOver !== null && <li><span className="text-[#1a1716]">Free delivery threshold:</span> {formatPrice(freeOver)}</li>}
            </ul>
          ) : (
            <p>The delivery charge depends on your delivery district.</p>
          )}
          <p>The exact charge for your order is always shown at checkout, before you place it.</p>
        </Block>

        <Block id="ship-tracking" title="Tracking your order">
          <p>Sign in and open your order to see its progress. Once your order has been handed to a courier, the courier name and tracking code appear on the same page.</p>
          <p className="flex flex-wrap gap-x-6 gap-y-2">
            <Link to="/account/tracking" className={linkCls}>Track an order</Link>
            <Link to="/account/orders" className={linkCls}>My orders</Link>
          </p>
        </Block>

        <Block id="ship-issues" title="Delays and unsuccessful deliveries">
          <p>Please make sure the phone number and address on your order are correct, so the courier can reach you. If your order is late, or a delivery could not be completed, contact us with your order number and we will look into it.</p>
          <p><Link to="/contact" className={linkCls}>Contact us</Link></p>
        </Block>
      </div>

      <section aria-labelledby="ship-more" className="bg-[#1a1716] px-[2.5vw] py-20 text-center text-[#F7F4EF] md:py-28">
        <h2 id="ship-more" className="font-display text-3xl md:text-5xl">More to know</h2>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link to="/returns-exchange" className="border border-white/70 px-8 py-3.5 text-sm uppercase tracking-[0.2em] transition-colors hover:bg-white hover:text-[#1a1716]">Returns &amp; Exchange</Link>
          <Link to="/faq" className="border border-white/70 px-8 py-3.5 text-sm uppercase tracking-[0.2em] transition-colors hover:bg-white hover:text-[#1a1716]">FAQ</Link>
        </div>
      </section>
    </>
  )
}