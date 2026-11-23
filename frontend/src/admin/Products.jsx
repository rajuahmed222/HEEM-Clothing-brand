import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { adm, Badge, btnCls, inputCls, Msg, money, PageHead, Pager, useDebounced } from './ui.jsx'
import { errorText } from '../Api.jsx'
import { mediaUrl } from '../components/ProductCard.jsx'

export default function Products() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const dq = useDebounced(q)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const active = params.get('active') || ''
  const stock = params.get('stock') || ''
  const page = params.get('page') || '1'

  const set = (k, v) => {
    const next = new URLSearchParams(params)
    v ? next.set(k, v) : next.delete(k)
    if (k !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }
  useEffect(() => {
    if (dq !== (params.get('q') || '')) set('q', dq)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq])
  useEffect(() => {
    setError('')
    const qs = new URLSearchParams({ page })
    if (active) qs.set('active', active)
    if (stock) qs.set('stock', stock)
    if (params.get('q')) qs.set('q', params.get('q'))
    adm(`products/?${qs}`).then(setData).catch((e) => setError(errorText(e)))
  }, [active, stock, page, params])

  const toggle = async (p) => {
    try {
      await adm(`products/${p.id}/`, { method: 'PATCH', body: { is_active: !p.is_active } })
      setData((d) => ({ ...d, results: d.results.map((x) => (x.id === p.id ? { ...x, is_active: !p.is_active } : x)) }))
    } catch (e) { setError(errorText(e)) }
  }

  return (
    <>
      <PageHead title="Products"><Link to="/admin/products/new" className={btnCls}>+ New product</Link></PageHead>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <input className={inputCls} placeholder="Search name, code, tag…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
        <select className={inputCls} value={active} onChange={(e) => set('active', e.target.value)} aria-label="Visibility">
          <option value="">Visible and hidden</option><option value="1">Visible on the website</option><option value="0">Hidden</option>
        </select>
        <select className={inputCls} value={stock} onChange={(e) => set('stock', e.target.value)} aria-label="Stock">
          <option value="">Any stock</option><option value="low">Low stock</option><option value="out">Sold out</option>
        </select>
      </div>
      <Msg error={error} />
      <div className="overflow-x-auto border border-[#1a1716]/15 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-[#1a1716]/15 text-xs uppercase tracking-wider text-neutral-500">
            <tr><th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Flags</th><th className="p-3">On website</th></tr>
          </thead>
          <tbody>
            {!data ? <tr><td className="p-4 text-neutral-500" colSpan={6}>Loading…</td></tr>
              : data.results.length === 0 ? <tr><td className="p-4 text-neutral-500" colSpan={6}>No products. Add your first one.</td></tr>
              : data.results.map((p) => (
                <tr key={p.id} className="border-b border-[#1a1716]/10 last:border-0 hover:bg-[#F7F4EF]">
                  <td className="p-3">
                    <Link to={`/admin/products/${p.id}`} className="flex items-center gap-3">
                      {p.thumbnail ? <img src={mediaUrl(p.thumbnail)} alt="" className="h-14 w-11 object-cover" /> : <div className="flex h-14 w-11 items-center justify-center bg-neutral-200 text-[10px] text-neutral-500">No photo</div>}
                      <span className="underline underline-offset-2">{p.name}</span>
                    </Link>
                  </td>
                  <td className="p-3 text-neutral-600">{p.category_name}{p.collection_name ? ` · ${p.collection_name}` : ''}</td>
                  <td className="p-3">{money(p.price)}</td>
                  <td className="p-3">{p.variant_count === 0 ? <span className="text-red-700">No sizes yet</span> : p.stock === 0 ? <span className="text-red-700">Sold out</span> : p.stock}</td>
                  <td className="p-3 space-x-1">{p.is_new && <Badge value="confirmed" label="New" />}{p.is_signature && <Badge value="shipped" label="Signature" />}</td>
                  <td className="p-3">
                    <button type="button" role="switch" aria-checked={p.is_active} aria-label={`Show ${p.name} on the website`} onClick={() => toggle(p)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${p.is_active ? 'bg-emerald-600' : 'bg-neutral-300'}`}>
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${p.is_active ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Pager data={data} onPage={(p) => set('page', String(p))} />
    </>
  )
}