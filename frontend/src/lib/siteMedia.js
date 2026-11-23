import { useEffect, useState } from 'react'
import { request } from '../Api.jsx'
import { mediaUrl } from '../components/ProductCard.jsx'

// Pictures and videos the owner uploads in Admin > Site media. One shared request, cached for a minute.
let cache = null
let inflight = null
const TTL = 60_000

function load() {
  if (cache && Date.now() - cache.at < TTL) return Promise.resolve(cache.map)
  if (!inflight) {
    inflight = request('admin/site-media/', { auth: false })
      .then((map) => { cache = { at: Date.now(), map: map || {} }; return cache.map })
      .finally(() => { inflight = null })
  }
  return inflight
}

export function resetSiteMedia() { cache = null }

// const media = useSiteMedia();
//   media.url('home_men')  -> full URL of the uploaded file, or '' (the page keeps its default)
//   media.tile('nav_men_1') -> { src, to, label } for a menu/search tile: the uploaded picture, or the chosen product's photo;
//                              `to` and `label` come from the tile's own link/caption, else from the chosen product. null when never set up.
export default function useSiteMedia() {
  const [map, setMap] = useState(() => cache?.map || {})
  useEffect(() => {
    let live = true
    load().then((m) => live && setMap(m)).catch(() => {})
    return () => { live = false }
  }, [])
  const tile = (key) => {
    const e = map[key]
    if (!e) return null
    const p = e.product
    // own caption and link win over the chosen product's; the uploaded picture wins over the product's photo
    return { src: e.url ? mediaUrl(e.url) : (p?.image ? mediaUrl(p.image) : ''), to: e.link || (p ? `/product/${p.slug}` : ''), label: e.label || p?.name || '' }
  }
  return { url: (key) => (map[key]?.url ? mediaUrl(map[key].url) : ''), kind: (key) => map[key]?.kind || '', tile }
}