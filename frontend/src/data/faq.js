import { formatPrice } from '../Api.jsx'

export const FAQ_CATEGORIES = ['Orders', 'Payments', 'Shipping & Delivery', 'Returns & Exchange', 'Products & Sizing', 'Account & Website']

// Every answer below comes from how the site actually works today (checkout, payment methods, order statuses, store rules).
// If a business rule changes, change it here. Numbers (delivery charge, return window) come from the backend policy.
// a: array of paragraphs. link: optional { to, label }.
export function buildFaq(policy) {
  const { dhaka, outside, freeOver, returnDays } = policy

  const deliveryCost = (dhaka !== null && outside !== null)
    ? [`Delivery within Dhaka is ${formatPrice(dhaka)} and delivery outside Dhaka is ${formatPrice(outside)}.${freeOver !== null ? ` The free-delivery threshold is ${formatPrice(freeOver)}.` : ''}`,
       'The exact charge for your order is always shown at checkout, before you place it.']
    : ['The delivery charge depends on your delivery district. The exact amount is always shown at checkout, before you place your order.']

  const returnWindow = returnDays !== null
    ? `Returns have a window of ${returnDays} days. `
    : ''

  return [
    // Orders
    { id: 'place', cat: 'Orders', q: 'How do I place an order?',
      a: ['Choose your size and colour on the product page, add the piece to your bag, then go to checkout. You will be asked to sign in or create a HEEM account to complete the order, and anything already in your bag is kept.'] },
    { id: 'cancel', cat: 'Orders', q: 'Can I modify or cancel an order?',
      a: ['You can cancel an order yourself from its page in your account while it is still new, that is, before our team starts processing it. Once processing has started the order can no longer be cancelled, but after delivery you can request a return.',
          'The items and delivery address of an order cannot be edited online. If you need a change, cancel the order while that is still possible and place a new one, or contact us.'],
      link: { to: '/account/orders', label: 'Go to my orders' } },
    { id: 'track', cat: 'Orders', q: 'How can I track my order?',
      a: ['Open the order from My Orders in your account. You will see its progress step by step. Once the order has been handed to a courier, the courier name and tracking code appear on the same page.'],
      link: { to: '/account/tracking', label: 'Track an order' } },

    // Payments
    { id: 'methods', cat: 'Payments', q: 'Which payment methods are accepted?',
      a: ['We support Cash on Delivery and mobile payments through bKash, Nagad and Rocket. The options available to you are shown at checkout.'] },
    { id: 'cod', cat: 'Payments', q: 'Is Cash on Delivery available?',
      a: ['Cash on Delivery is a supported payment method. If it is available for your order, you will see it as an option at checkout, and the amount due is shown on your order page.'] },
    { id: 'mobile', cat: 'Payments', q: 'How does mobile payment work?',
      a: ['At checkout you send the order total to the number shown for your chosen wallet, then enter the number you paid from, the transaction ID (TrxID) and the amount you sent. Our team checks the payment and your order is confirmed once it is verified.',
          'We will never ask for your PIN, OTP or password.'] },
    { id: 'rejected', cat: 'Payments', q: 'What if my payment could not be verified?',
      a: ['Your order page will say so and show the reason. You can send corrected payment details from that page and we will check again.'] },

    // Shipping & Delivery
    { id: 'time', cat: 'Shipping & Delivery', q: 'How long does delivery take?',
      a: ['Delivery time depends on your location and on when your order is handed to the courier. Your order page shows each step as it happens, so you can always see where it stands.'],
      link: { to: '/shipping-delivery', label: 'Shipping & Delivery' } },
    { id: 'cost', cat: 'Shipping & Delivery', q: 'How much does delivery cost?',
      a: deliveryCost, link: { to: '/shipping-delivery', label: 'Shipping & Delivery' } },

    // Returns & Exchange
    { id: 'return', cat: 'Returns & Exchange', q: 'How can I return an order?',
      a: [`${returnWindow}After your order is delivered, open it from My Orders and choose "Request a return". Our team reviews the request and gets in touch with the next steps.`],
      link: { to: '/returns-exchange', label: 'Returns & Exchange' } },
    { id: 'exchange', cat: 'Returns & Exchange', q: 'How can I request a size exchange?',
      a: ['Please contact us with your order number and the size you would like. We will tell you what is possible for that piece.'],
      link: { to: '/contact', label: 'Contact us' } },
    { id: 'damaged', cat: 'Returns & Exchange', q: 'What should I do if I receive a damaged or incorrect item?',
      a: ['Contact us as soon as you can with your order number and a short description of the problem, and we will help.'],
      link: { to: '/contact', label: 'Contact us' } },

    // Products & Sizing
    { id: 'size', cat: 'Products & Sizing', q: 'How do I choose the correct size?',
      a: ['Use our size guide, and check the product page for the intended fit and the size the model is wearing.'],
      link: { to: '/size-guide', label: 'Open the size guide' } },
    { id: 'care', cat: 'Products & Sizing', q: 'How should I care for my garment?',
      a: ['Follow the care instructions on the product page and the label inside the garment. They are the best guide for that particular piece.'],
      link: { to: '/heem-standard', label: 'Read The HEEM Standard' } },

    // Account & Website
    { id: 'account', cat: 'Account & Website', q: 'Do I need an account to place an order?',
      a: ['You can browse, build a bag and keep a wishlist without an account. To check out and follow your orders you need to sign in or create an account.'],
      link: { to: '/signup', label: 'Create an account' } },
    { id: 'update', cat: 'Account & Website', q: 'How can I update my account information?',
      a: ['Sign in, open your account and choose Personal information to change your details, or Addresses to add, edit or remove delivery addresses.'],
      link: { to: '/account/profile', label: 'Personal information' } },
  ]
}