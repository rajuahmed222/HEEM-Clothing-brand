// Same codes and labels as shopping/models.py. Used by the My Orders filters and badges.
export const ORDER_STATUSES = [
  ['placed', 'Order Placed'], ['confirmed', 'Confirmed'], ['processing', 'Processing'], ['packed', 'Packed'],
  ['shipped', 'Shipped'], ['in_transit', 'In Transit'], ['out_for_delivery', 'Out for Delivery'],
  ['delivered', 'Delivered'], ['cancelled', 'Cancelled'], ['return_requested', 'Return Requested'], ['returned', 'Returned'],
]
export const PAYMENT_STATUSES = [
  ['pending', 'Pending'], ['pending_verification', 'Pending Verification'], ['paid', 'Paid'], ['failed', 'Failed'],
  ['cod_pending', 'Cash on Delivery - Due'], ['refund_pending', 'Refund Pending'], ['refunded', 'Refunded'],
]

const ENDED = ['cancelled', 'returned']

// A cancelled Cash on Delivery order owes nothing, so do not show "Due".
export const payLabel = (o) => (o.payment_status === 'cod_pending' && ENDED.includes(o.status) ? 'No payment due' : o.payment_status_label)
export const orderTone = (s) => (s === 'delivered' ? 'done' : ['cancelled', 'returned', 'return_requested'].includes(s) ? 'warn' : 'plain')
export const payTone = (o) => (['paid', 'refunded'].includes(o.payment_status) ? 'done' : ['failed', 'refund_pending'].includes(o.payment_status) ? 'warn' : 'plain')

export const fmtDate = (d, withTime = true) =>
  new Date(d).toLocaleString('en-GB', withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' })

const TONES = {
  plain: 'border-[#1a1716]/30',
  done: 'border-[#1a1716] bg-[#1a1716] text-[#F7F4EF]',
  warn: 'border-[#8a6d3b] text-[#8a6d3b]',
}

export function Badge({ tone = 'plain', children }) {
  return <span className={`inline-block whitespace-nowrap border px-2.5 py-1 text-xs uppercase tracking-[0.12em] ${TONES[tone]}`}>{children}</span>
}