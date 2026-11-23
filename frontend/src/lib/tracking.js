// Builds the 6 tracking stages from an order returned by GET /api/orders/<number>/.
// Everything comes from real order events and payment data. No dates or steps are invented.

const PROCESSING = ['processing', 'packed', 'shipped', 'in_transit', 'out_for_delivery', 'delivered']
const SHIPPED = ['shipped', 'in_transit', 'out_for_delivery', 'delivered']
const OUT = ['out_for_delivery', 'delivered']

export const isEnded = (o) => ['cancelled', 'returned'].includes(o.status)
export const isFinished = (o) => ['delivered', 'cancelled', 'returned'].includes(o.status)

// state: done | current | todo | failed | stopped
export function buildStages(o) {
  const events = o.timeline?.events || []
  const reached = new Set(events.map((e) => e.status))
  const has = (list) => list.some((s) => reached.has(s)) || list.includes(o.status)
  const at = (...s) => events.find((e) => s.includes(e.status))?.created_at || null
  const ended = isEnded(o)

  const stages = [{ key: 'placed', label: 'Order placed', state: 'done', time: at('placed') || o.created_at }]

  if (o.payment_method === 'cod') {
    stages.push({ key: 'payment', label: 'Pay on delivery', state: o.paid_at ? 'done' : 'todo', time: o.paid_at, passive: !o.paid_at })
  } else if (o.paid_at) {
    stages.push({ key: 'payment', label: 'Payment confirmed', state: 'done', time: o.paid_at })
  } else if (o.payment_status === 'failed') {
    stages.push({ key: 'payment', label: 'Payment not verified', state: 'failed', time: null })
  } else if (o.payment_status === 'pending_verification') {
    stages.push({ key: 'payment', label: 'Payment awaiting verification', state: 'current', time: null })
  } else {
    stages.push({ key: 'payment', label: 'Payment confirmed', state: 'todo', time: null })
  }

  const step = (key, label, list, first) => ({
    key, label, state: has(list) ? 'done' : 'todo', time: has(list) ? at(...first) : null,
  })
  stages.push(step('processing', 'Processing', PROCESSING, ['processing', 'packed']))
  stages.push(step('shipped', 'Shipped', SHIPPED, ['shipped', 'in_transit']))
  stages.push(step('out', 'Out for delivery', OUT, ['out_for_delivery']))
  stages.push(step('delivered', 'Delivered', ['delivered'], ['delivered']))

  if (ended) {
    stages.forEach((s) => { if (s.state === 'todo' || s.state === 'current') s.state = 'stopped' })
  } else if (!stages.some((s) => s.state === 'current' || s.state === 'failed')) {
    const next = stages.find((s) => s.state === 'todo' && !s.passive)
    if (next) next.state = 'current'
  }
  return stages
}

// A short message for cancelled / returned / return requested orders
export function endNotice(o) {
  const ev = (s) => o.timeline?.events.find((e) => e.status === s)
  if (o.status === 'cancelled') return { title: 'This order was cancelled', time: ev('cancelled')?.created_at, note: ev('cancelled')?.note }
  if (o.status === 'returned') return { title: 'This order was returned', time: ev('returned')?.created_at, note: ev('returned')?.note }
  if (o.status === 'return_requested') return { title: 'A return was requested', time: ev('return_requested')?.created_at, note: ev('return_requested')?.note }
  return null
}

export function paymentNotice(o) {
  if (o.payment_status === 'failed') return { tone: 'warn', text: `We could not verify your payment${o.payment?.review_note ? `: ${o.payment.review_note}` : '.'}`, action: true }
  if (o.payment_status === 'pending_verification') return { tone: 'plain', text: 'Your payment details are waiting to be checked against our account.' }
  if (o.payment_status === 'refund_pending') return { tone: 'plain', text: 'Your refund is being processed.' }
  if (o.payment_status === 'refunded') return { tone: 'plain', text: 'Your payment has been refunded.' }
  return null
}

export const shipmentDates = (o) => {
  const events = o.timeline?.events || []
  const at = (...s) => events.find((e) => s.includes(e.status))?.created_at || null
  return { shipped: at('shipped', 'in_transit'), delivered: at('delivered') }
}