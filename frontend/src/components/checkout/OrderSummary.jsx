import { formatPrice } from '../../Api.jsx'
import { Img } from '../ProductCard.jsx'

// charge === null means "district not chosen yet"
export default function OrderSummary({ items, subtotal, charge, total }) {
  return (
    <div>
      <ul className="divide-y divide-[#1a1716]/10">
        {items.map((it, i) => (
          <li key={it.variant_id} className="flex gap-4 py-4 first:pt-0">
            <div className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden">
              <Img src={it.image} alt={it.name} i={i} />
              <span className="absolute right-0 top-0 bg-[#1a1716] px-1.5 text-xs text-[#F7F4EF]" aria-hidden="true">{it.quantity}</span>
            </div>
            <div className="min-w-0 flex-1 text-sm">
              <p className="uppercase tracking-[0.1em]">{it.name}</p>
              <p className="mt-1 text-neutral-500">{[it.color, it.size && `Size ${it.size}`].filter(Boolean).join(' / ')}</p>
              <p className="mt-1 text-neutral-500">Qty {it.quantity} x {formatPrice(it.price)}</p>
            </div>
            <p className="whitespace-nowrap text-sm">{formatPrice(it.line_total)}</p>
          </li>
        ))}
      </ul>
      <dl className="mt-5 space-y-3 border-t border-[#1a1716]/15 pt-5 text-sm">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div>
        <div className="flex justify-between">
          <dt>Delivery</dt>
          <dd className={charge === null ? 'text-neutral-500' : ''}>{charge === null ? 'Choose a district' : charge === 0 ? 'Free' : formatPrice(charge)}</dd>
        </div>
        <div className="flex justify-between border-t border-[#1a1716]/15 pt-4 text-base">
          <dt>{charge === null ? 'Total before delivery' : 'Total'}</dt>
          <dd className="text-lg">{formatPrice(total)}</dd>
        </div>
      </dl>
    </div>
  )
}