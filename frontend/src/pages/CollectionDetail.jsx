import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard.jsx'
import { request } from '../Api.jsx'
import usePageMeta from '../lib/usePageMeta.js'

export default function CollectionDetail() {
  const { slug } = useParams()
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading') // loading | ok | missing | error
  const [attempt, setAttempt] = useState(0)

  usePageMeta(data?.name || 'Collection', data ? `Pieces from the ${data.name} collection by HEEM.` : 'A HEEM collection.')

  useEffect(() => {
    let live = true
    setState('loading')
    request(`collections/${slug}/`, { auth: false })
      .then((d) => { if (live) { setData(d); setState('ok') } })
      .catch((e) => { if (live) setState(e.status === 404 ? 'missing' : 'error') })
    return () => { live = false }
  }, [slug, attempt])

  if (state === 'missing') {
    return (
      <section className="px-[2.5vw] py-32 text-center">
        <h1 className="font-display text-3xl md:text-4xl">We could not find this collection</h1>
        <Link to="/collections" className="mt-8 inline-block border-b border-current pb-1 text-sm uppercase tracking-[0.18em] hover:text-[#B08D57]">All collections</Link>
      </section>
    )
  }
  if (state === 'error') {
    return (
      <section className="px-[2.5vw] py-32 text-center">
        <h1 className="font-display text-3xl md:text-4xl">We could not load this collection</h1>
        <button type="button" onClick={() => setAttempt((a) => a + 1)} className="mt-8 border-b border-current pb-1 text-sm uppercase tracking-[0.18em] hover:text-[#B08D57]">Try again</button>
      </section>
    )
  }

  return (
    <section className="px-[2.5vw] py-12 md:py-20">
      <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
        <Link to="/collections" className="hover:text-[#B08D57]">Collections</Link>
      </p>
      <h1 className="mt-4 font-display text-5xl uppercase md:text-7xl">{data?.name || ' '}</h1>

      <div className="mt-12" aria-busy={state === 'loading'}>
        {state === 'loading' ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className="aspect-[3/4] animate-pulse bg-[#1a1716]/[0.06]" />)}
          </div>
        ) : data.products.length === 0 ? (
          <p className="text-neutral-600">No pieces in this collection yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {data.products.map((p, i) => <ProductCard key={p.id} p={p} i={i} />)}
          </div>
        )}
      </div>
    </section>
  )
}