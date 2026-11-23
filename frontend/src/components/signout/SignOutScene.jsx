import { useState } from 'react'

// Put your photo here (portrait, about 4:5, e.g. 1600 x 2000): frontend/public/media/signout-door.jpg
// If the file exists it is shown automatically. If not, the illustrated scene below is shown instead.
const PHOTO = '/media/signout-door.jpg'

// The door leaf swings inward on its left hinge: closed -> partly open
const CLOSED = '190,40 330,40 330,372 190,372'
const OPEN = '190,40 240,30 240,382 190,372'
const RIM_CLOSED = '327,40 330,40 330,372 327,372'
const RIM_OPEN = '237,30 240,30 240,382 237,381'

const CSS = `
.hd-leg, .hd-arm { transform-box: fill-box; transform-origin: 50% 0; }
.hd-tail { transform-box: fill-box; transform-origin: 50% 50%; }
.hd-man { transform: translate(286px, 346px) scale(.72); }

@media (prefers-reduced-motion: no-preference) {
  .hd-fadein { animation: hd-in 2.6s ease .4s both; }
  .hd-shimmer { animation: hd-shimmer 8s ease-in-out infinite alternate; }
  .hd-man { animation: hd-walk 15s linear 2.8s infinite both; }
  .hd-leg { animation: hd-stride .6s ease-in-out infinite alternate; }
  .hd-leg.b, .hd-arm.a { animation-direction: alternate-reverse; }
  .hd-arm { animation: hd-stride .6s ease-in-out infinite alternate; }
  .hd-tail { animation: hd-flick 6s ease-in-out infinite; }
  .hd-mote { animation: hd-mote 11s ease-in-out infinite; }
  .hd-mote.m2 { animation-duration: 14s; animation-delay: -3s; }
  .hd-mote.m3 { animation-duration: 9s; animation-delay: -6s; }
  .hd-mote.m4 { animation-duration: 13s; animation-delay: -8s; }
  .hd-mote.m5 { animation-duration: 12s; animation-delay: -2s; }
  .hd-sun { animation: hd-sunpulse 9s ease-in-out infinite alternate; }
}

.hd-mote { opacity: 0; }
@keyframes hd-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes hd-shimmer { from { opacity: .86; transform: translateX(0); } to { opacity: 1; transform: translateX(3px); } }
@keyframes hd-walk {
  0%   { transform: translate(232px, 346px) scale(.72); opacity: 0; }
  8%   { opacity: 1; }
  88%  { opacity: 1; }
  100% { transform: translate(336px, 346px) scale(.72); opacity: 0; }
}
@keyframes hd-stride { from { transform: rotate(-22deg); } to { transform: rotate(22deg); } }
@keyframes hd-flick { 0%, 70% { transform: rotate(0); } 78% { transform: rotate(-6deg); } 88% { transform: rotate(4deg); } 100% { transform: rotate(0); } }
@keyframes hd-mote { 0% { transform: translate(0, 0); opacity: 0; } 25% { opacity: .85; } 70% { opacity: .5; } 100% { transform: translate(8px, -46px); opacity: 0; } }
@keyframes hd-sunpulse { from { opacity: .55; } to { opacity: 1; } }
`

function useCalm() {
  // true when the visitor asked for less motion: the door is simply shown open and nothing moves
  const [calm] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  return calm
}

function Illustration({ calm }) {
  const open = (closed, opened, attr) => (calm ? null : (
    <animate attributeName={attr} dur="3s" begin="0s" fill="freeze" calcMode="spline"
      keyTimes="0;.15;1" keySplines="0 0 1 1;.4 0 .2 1" values={`${closed};${closed};${opened}`} />
  ))
  return (
    <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="so-wall" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#DCCFB9" /><stop offset=".7" stopColor="#EADFCB" /><stop offset="1" stopColor="#F2E7D1" />
        </linearGradient>
        <linearGradient id="so-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D8C6A8" /><stop offset="1" stopColor="#C9B494" />
        </linearGradient>
        <linearGradient id="so-outside" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF6DA" /><stop offset=".55" stopColor="#FCE4A8" /><stop offset="1" stopColor="#F1D186" />
        </linearGradient>
        <radialGradient id="so-glare" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#FFFDF2" stopOpacity=".95" /><stop offset="1" stopColor="#FFFDF2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="so-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFD37A" stopOpacity=".85" /><stop offset="1" stopColor="#FFD37A" stopOpacity=".12" />
        </linearGradient>
        <linearGradient id="so-leaf" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#22140C" /><stop offset="1" stopColor="#4B301F" />
        </linearGradient>
        <pattern id="so-grain" width="9" height="40" patternUnits="userSpaceOnUse">
          <rect width="9" height="40" fill="none" />
          <path d="M2 0 V40 M6.5 0 V40" stroke="#120A05" strokeOpacity=".35" strokeWidth=".7" />
        </pattern>
        <linearGradient id="so-rim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#F2C86B" stopOpacity="0" /><stop offset="1" stopColor="#F2C86B" stopOpacity=".7" />
        </linearGradient>
        <radialGradient id="so-vignette" cx=".5" cy=".45" r=".75">
          <stop offset=".6" stopColor="#2B1B10" stopOpacity="0" /><stop offset="1" stopColor="#2B1B10" stopOpacity=".28" />
        </radialGradient>
        <clipPath id="so-opening"><rect x="190" y="40" width="140" height="332" /></clipPath>
      </defs>

      {/* interior */}
      <rect width="400" height="372" fill="url(#so-wall)" />
      <rect y="358" width="400" height="14" fill="#CBBCA3" />
      <rect y="372" width="400" height="128" fill="url(#so-floor)" />
      <g stroke="#B9A582" strokeOpacity=".45" strokeWidth=".8">
        <line x1="0" y1="396" x2="400" y2="396" /><line x1="0" y1="424" x2="400" y2="424" />
        <line x1="0" y1="458" x2="400" y2="458" /><line x1="0" y1="498" x2="400" y2="498" />
        <line x1="70" y1="396" x2="70" y2="424" /><line x1="210" y1="424" x2="210" y2="458" /><line x1="120" y1="458" x2="120" y2="498" />
      </g>

      {/* doorway: frame, golden day outside */}
      <rect x="176" y="26" width="168" height="346" fill="#3B281C" />
      <rect x="190" y="40" width="140" height="332" fill="url(#so-outside)" />
      <g clipPath="url(#so-opening)">
        <circle cx="318" cy="96" r="92" fill="url(#so-glare)" />
        <path d="M190 300 V262 H214 V280 H238 V250 H262 V288 H292 V268 H330 V300 Z" fill="#E9CD90" opacity=".6" />
        <circle cx="308" cy="282" r="24" fill="#D8B56A" opacity=".5" />
        <circle cx="326" cy="292" r="17" fill="#D8B56A" opacity=".5" />
        <rect x="190" y="332" width="140" height="40" fill="#EAD090" />
        <path d="M190 346 L330 338" stroke="#FFF2CC" strokeOpacity=".7" strokeWidth="2" />

        {/* the man, walking past outside (he comes out from behind the open door) */}
        <g className="hd-man">
          <rect className="hd-leg a" x="-8" y="-52" width="9" height="52" rx="3" fill="#17181C" />
          <rect className="hd-leg b" x="-1" y="-52" width="9" height="52" rx="3" fill="#1D1E23" />
          <path d="M-13 -126 L10 -126 L17 -46 L-18 -46 Z" fill="#1B1C21" stroke="#F6D58A" strokeOpacity=".4" strokeWidth=".8" />
          <rect className="hd-arm a" x="-4" y="-122" width="7" height="46" rx="3" fill="#202127" />
          <rect x="-3" y="-136" width="6" height="12" fill="#1B1C21" />
          <circle cx="1" cy="-142" r="10" fill="#17181C" stroke="#F6D58A" strokeOpacity=".4" strokeWidth=".8" />
          <rect className="hd-arm b" x="-4" y="-122" width="7" height="46" rx="3" fill="#2A2B32" />
        </g>
      </g>

      {/* the dark walnut door, partly open inward */}
      <polygon points={OPEN} fill="url(#so-leaf)">{open(CLOSED, OPEN, 'points')}</polygon>
      <polygon points={OPEN} fill="url(#so-grain)">{open(CLOSED, OPEN, 'points')}</polygon>
      <polygon points={RIM_OPEN} fill="#F2C86B" fillOpacity=".55">{open(RIM_CLOSED, RIM_OPEN, 'points')}</polygon>
      <circle cx="226" cy="206" r="3.6" fill="#B08D57">{open('316', '226', 'cx')}</circle>
      <rect x="187" y="80" width="5" height="16" fill="#B08D57" /><rect x="187" y="310" width="5" height="16" fill="#B08D57" />
      <rect x="176" y="370" width="168" height="5" fill="#BFAE92" />

      {/* golden light across the floor, long shadows inside it */}
      <g className="hd-fadein">
        <g className="hd-shimmer">
          <polygon points="190,372 330,372 150,500 -30,500" fill="url(#so-beam)" />
        </g>
        <polygon points="190,372 240,382 130,490 20,472" fill="#2B1B10" opacity=".2" />
        <polygon points="272,374 292,374 214,456 188,450" fill="#2B1B10" opacity=".15" />
        <ellipse cx="62" cy="466" rx="58" ry="7" transform="rotate(13 62 466)" fill="#2B1B10" opacity=".26" />
        <g fill="#FFF1C9">
          <circle className="hd-mote" cx="200" cy="430" r="1.6" />
          <circle className="hd-mote m2" cx="150" cy="450" r="1.2" />
          <circle className="hd-mote m3" cx="250" cy="410" r="1.8" />
          <circle className="hd-mote m4" cx="120" cy="470" r="1.3" />
          <circle className="hd-mote m5" cx="230" cy="455" r="1.1" />
        </g>
      </g>

      {/* the black cat, sitting near the doorway, looking out */}
      <g transform="translate(112 448)">
        <path className="hd-tail" d="M-34 -4 C-62 6 -34 18 18 12" fill="none" stroke="#111010" strokeWidth="8" strokeLinecap="round" />
        <path d="M-34 0 C-40 -32 -28 -70 -4 -82 C12 -88 26 -80 30 -64 C34 -46 32 -20 30 0 Z" fill="#121110" />
        <path d="M-34 0 C-40 -32 -28 -70 -4 -82 C12 -88 26 -80 30 -64 C34 -46 32 -20 30 0" fill="none" stroke="url(#so-rim)" strokeWidth="1.6" />
        <path d="M24 -48 L24 0" stroke="#26231F" strokeWidth="1.2" />
        <circle cx="14" cy="-96" r="16" fill="#121110" />
        <path d="M2 -106 L4 -128 L18 -110 Z" fill="#121110" />
        <path d="M16 -110 L30 -127 L31 -104 Z" fill="#121110" />
        <path d="M30 -127 L31 -104" stroke="#F2C86B" strokeOpacity=".5" strokeWidth="1.2" />
        <ellipse cx="22" cy="-97" rx="1.7" ry="2.8" fill="#F2C86B" />
      </g>

      <rect width="400" height="500" fill="url(#so-vignette)" />
    </svg>
  )
}

export default function SignOutScene() {
  const calm = useCalm()
  const [photo, setPhoto] = useState(false)
  return (
    <div role="img"
      aria-label="A black cat sits beside a partly open wooden door while a man walks past outside in golden sunlight."
      className="hd-signout relative aspect-[4/5] max-h-[56svh] w-full overflow-hidden bg-[#E6D9C3] lg:max-h-[78svh]">
      <style>{CSS}</style>
      <Illustration calm={calm} />
      <img src={PHOTO} alt="" decoding="async" onLoad={() => setPhoto(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${photo ? 'opacity-100' : 'opacity-0'}`} />
      {photo && (
        <div aria-hidden="true" className="hd-sun pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(circle at 78% 20%, rgba(255,214,130,.38), transparent 58%)', mixBlendMode: 'soft-light' }} />
      )}
    </div>
  )
}