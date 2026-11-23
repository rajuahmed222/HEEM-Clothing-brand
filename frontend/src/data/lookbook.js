// Lookbook content. Temporary editorial copy until the real campaign is written.
// Pictures are NOT here: upload them in Admin > Site media > "Lookbook page" (each `key` below is a slot).
// Products are NOT copied here either: `picks` are slugs of products that already exist in the shop database.
// If a slug is missing (or a look has fewer than 3 picks), real products from the shop fill the look automatically.

export const CAMPAIGN = {
  name: 'Origin',
  season: 'Autumn / Winter',
  year: '2026',
  line: 'Where silence becomes silhouette',
  to: '/new',
}

export const INTRO = {
  eyebrow: 'The Campaign',
  title: 'Quiet is the new loud.',
  body: [
    'Origin begins where the noise stops. Heavy cotton, washed linen and hand-finished silk, cut with a patient hand and worn the way you wear a place you love.',
    'Shot across the soft light of a Dhaka winter, the collection moves from dawn tailoring to evening drape. Nothing is shouted. Everything is remembered.',
  ],
  credits: [
    ['Photography', 'Studio HEEM'],
    ['Styling', 'HEEM Atelier'],
    ['Fabric', 'Cotton · Linen · Silk'],
    ['Location', 'Dhaka'],
  ],
}

// One entry per gallery frame, in reading order. Layout classes live in components/lookbook/Gallery.jsx.
export const GALLERY = [
  { key: 'lb_g1', view: 'Front', who: 'Women', alt: 'Woman in a long camel coat, full length, front view' },
  { key: 'lb_g2', view: 'Landscape', who: 'Men', alt: 'Man walking in a canvas jacket at dawn' },
  { key: 'lb_g3', view: 'Back', who: 'Women', alt: 'Back view of a draped silk shirt' },
  { key: 'lb_g4', view: 'Fabric', who: 'Women', alt: 'Close-up of heavy cotton weave' },
  { key: 'lb_g5', view: 'Front', who: 'Men', alt: 'Man in a relaxed linen panjabi, full length' },
  { key: 'lb_g6', view: 'Landscape', who: 'Women', alt: 'Two women in tonal layers by a window' },
  { key: 'lb_g7', view: 'Back', who: 'Men', alt: 'Back view of a structured jacket' },
  { key: 'lb_g8', view: 'Detail', who: 'Men', alt: 'Detail of a hand-stitched collar' },
]

export const QUOTE = {
  text: 'We design the garment you will still reach for in ten years.',
  by: 'The HEEM Atelier',
}

export const LOOKS = [
  { key: 'lb_look1', no: 'I', title: 'The Dawn Coat', note: 'Layered neutrals for the first light of the day.', picks: [] },
  { key: 'lb_look2', no: 'II', title: 'Studio Hours', note: 'Relaxed tailoring that works from desk to dinner.', picks: [] },
  { key: 'lb_look3', no: 'III', title: 'Evening Drape', note: 'Soft silk and clean lines for after dark.', picks: [] },
]

export const CAMPAIGNS = [
  { key: 'lb_c1', title: 'Origin', season: 'Autumn / Winter', year: '2026', current: true, to: '/new' },
  { key: 'lb_c2', title: 'Monsoon Linen', season: 'Spring / Summer', year: '2026', to: '/collections' },
  { key: 'lb_c3', title: 'Eid Atelier', season: 'Festive', year: '2026', to: '/collections' },
  { key: 'lb_c4', title: 'First Light', season: 'Autumn / Winter', year: '2025', to: '/collections' },
]