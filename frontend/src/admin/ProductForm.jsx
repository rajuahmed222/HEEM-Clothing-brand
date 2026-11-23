import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { adm, btnCls, btnGhost, cardCls, inputCls, Msg, PageHead, useConfirm } from './ui.jsx'
import { errorText, fieldErrors } from '../Api.jsx'
import { mediaUrl } from '../components/ProductCard.jsx'

const MAX_PER_COLOUR = 6 // the product page shows at most 6 photos per colour (ProductDetail.jsx: .slice(0, 6))
// Same normalisation the backend applies to colours ("off-white" -> "Off-White"), so groups match.
const norm = (c) => (c || '').trim().toLowerCase().replace(/(^|[^a-z])([a-z])/g, (m, p, l) => p + l.toUpperCase())

const EMPTY = {
  name: '', short_description: '', description: '', price: '', compare_at_price: '', category: '', placements: [], collection: '',
  season: 'all', tags: '', sku: '', fabric: '', fit: '', model_height: '', model_wears: '', care: '',
  is_signature: false, is_new: false, is_active: true,
}

function Field({ label, hint, error, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-neutral-700">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-neutral-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-700">{error}</span>}
    </label>
  )
}

export default function ProductForm() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const [opts, setOpts] = useState({ categories: [], collections: [], sizes: [] })
  const [f, setF] = useState(EMPTY)
  const [variants, setVariants] = useState([{ size: '', color: '', stock: 0, sku: '' }])
  const [images, setImages] = useState([]) // saved photos
  const [files, setFiles] = useState([])   // chosen, not uploaded yet: { file, url, color }
  const [loading, setLoading] = useState(!isNew)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [errs, setErrs] = useState({})
  const picker = useRef(null)
  const [ask, confirmBox] = useConfirm()

  const apply = useCallback((p) => {
    setF({
      ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, p[k] ?? EMPTY[k]])),
      category: p.category ?? '', collection: p.collection ?? '',
      price: p.price ?? '', compare_at_price: p.compare_at_price ?? '',
    })
    setVariants(p.variants.length ? p.variants.map((v) => ({ id: v.id, size: v.size, color: v.color, stock: v.stock, sku: v.sku })) : [{ size: '', color: '', stock: 0, sku: '' }])
    setImages(p.images)
  }, [])

  useEffect(() => { adm('options/').then(setOpts).catch((e) => setError(errorText(e))) }, [])
  useEffect(() => {
    if (isNew) return
    adm(`products/${id}/`).then(apply).catch((e) => setError(errorText(e))).finally(() => setLoading(false))
  }, [id, isNew, apply])
  useEffect(() => () => files.forEach((x) => URL.revokeObjectURL(x.url)), []) // eslint-disable-line react-hooks/exhaustive-deps

  const colors = useMemo(() => [...new Set(variants.map((v) => v.color.trim()).filter(Boolean))], [variants])
  const togglePlace = (id) => setF((s) => ({ ...s, placements: s.placements.includes(id) ? s.placements.filter((x) => x !== id) : [...s.placements, id] }))
  // Every menu item the product can also appear in, grouped like the website menu: Section > Group > items
  const places = (() => {
    const out = {}
    opts.categories.filter((c) => !c.is_parent).forEach((c) => {
      const g = ((out[c.section] ||= {})[c.group || 'More'] ||= [])
      g.push(c)
    })
    return out
  })()
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const setVar = (i, k, v) => setVariants((vs) => vs.map((x, n) => (n === i ? { ...x, [k]: v } : x)))

  // Add photos to one colour group ('' = shared by all colours).
  // Saved product: upload right away. New product: keep them here and upload on Save.
  const addPhotos = async (color, list) => {
    setError(''); setOk('')
    const good = []
    for (const file of Array.from(list)) {
      if (!file.type.startsWith('image/')) { setError(`"${file.name}" is not an image.`); continue }
      if (file.size > 5 * 1024 * 1024) { setError(`"${file.name}" is bigger than 5 MB.`); continue }
      good.push(file)
    }
    if (!good.length) return
    const have = images.filter((x) => norm(x.color) === color).length + files.filter((x) => x.color === color).length
    if (have + good.length > MAX_PER_COLOUR) { setError(`At most ${MAX_PER_COLOUR} photos per colour.`); return }
    if (isNew) {
      setFiles((x) => [...x, ...good.map((file) => ({ file, url: URL.createObjectURL(file), color }))])
      return
    }
    setBusy(true)
    try {
      const fd = new FormData()
      good.forEach((file) => fd.append('images', file))
      fd.append('color', color)
      const p = await adm(`products/${id}/images/`, { method: 'POST', body: fd })
      setImages(p.images)
      setOk(`${good.length} photo(s) added.`)
    } catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }

  const save = async (e) => {
    e.preventDefault()
    setError(''); setOk(''); setErrs({})
    if (!f.category) { setErrs({ category: 'Choose a category.' }); setError('Please fix the highlighted fields.'); return }
    setBusy(true)
    let productId = isNew ? null : id
    try {
      const body = { ...f, collection: f.collection || null, compare_at_price: f.compare_at_price === '' ? null : f.compare_at_price }
      const saved = await adm(isNew ? 'products/' : `products/${id}/`, { method: isNew ? 'POST' : 'PATCH', body })
      productId = saved.id
      const rows = variants.filter((v) => v.size.trim() || v.color.trim() || Number(v.stock) > 0 || v.id)
      await adm(`products/${productId}/variants/`, { method: 'PUT', body: { variants: rows } })
      // one upload per colour, so every photo keeps the colour you gave it
      const groups = {}
      files.forEach((x) => { (groups[x.color] ||= []).push(x) })
      for (const [color, list] of Object.entries(groups)) {
        const fd = new FormData()
        list.forEach((x) => fd.append('images', x.file))
        fd.append('color', color)
        await adm(`products/${productId}/images/`, { method: 'POST', body: fd })
      }
      files.forEach((x) => URL.revokeObjectURL(x.url))
      setFiles([])
      if (isNew) { navigate(`/admin/products/${productId}`, { replace: true }); return }
      apply(await adm(`products/${productId}/`))
      setOk('Saved.')
    } catch (err) {
      setErrs(fieldErrors(err))
      setError(errorText(err))
      // the product itself may already be saved: go to its page so nothing is saved twice
      if (isNew && productId) navigate(`/admin/products/${productId}`, { replace: true })
    } finally { setBusy(false) }
  }

  const photoAction = async (fn, done) => {
    setError(''); setOk('')
    try { const p = await fn(); if (p) setImages(p.images); setOk(done) } catch (e) { setError(errorText(e)) }
  }
  const makeMain = (img) => {
    // Move this photo to the front of its own colour group. The order of other colours is untouched.
    const group = norm(img.color)
    const ids = images.map((x) => x.id).filter((i) => i !== img.id)
    const firstOfGroup = ids.findIndex((i) => norm(images.find((x) => x.id === i).color) === group)
    ids.splice(firstOfGroup === -1 ? ids.length : firstOfGroup, 0, img.id)
    return photoAction(() => adm(`products/${id}/images/reorder/`, { method: 'POST', body: { ids } }), 'Main photo changed.')
  }
  // Swap a photo with its neighbour inside ONE colour. Only that colour's photos are sent; other colours stay put.
  const step = (group, i, dir) => {
    const ids = group.map((x) => x.id)
    ;[ids[i], ids[i + dir]] = [ids[i + dir], ids[i]]
    return photoAction(() => adm(`products/${id}/images/reorder/`, { method: 'POST', body: { ids } }), 'Photo order saved.')
  }
  const remove = async (img) => (await ask({ title: 'Delete this photo?', message: 'The photo is removed from this product.', confirmLabel: 'Delete photo', danger: true })) && photoAction(async () => {
    await adm(`images/${img.id}/`, { method: 'DELETE' })
    return { images: images.filter((x) => x.id !== img.id) }
  }, 'Photo deleted.')
  const setImgColor = (img, color) => adm(`images/${img.id}/`, { method: 'PATCH', body: { color } })
    .then((r) => setImages((xs) => xs.map((x) => (x.id === img.id ? { ...x, color: r.color } : x)))).catch((e) => setError(errorText(e)))

  // Photo groups: shared first, then one block per colour of the variants (plus any colour that already has photos)
  const groups = useMemo(() => {
    const names = [...new Set([...variants.map((v) => norm(v.color)), ...images.map((x) => norm(x.color)), ...files.map((x) => x.color)].filter(Boolean))]
    return ['', ...names]
  }, [variants, images, files])

  const deleteProduct = async () => {
    const yes = await ask({ title: `Delete “${f.name || 'this product'}”?`,
      message: 'The product, its sizes, photos and any wishlist entries are removed for good. This cannot be undone. If you only want to hide it from the website, untick “Show on the website” instead.',
      confirmLabel: 'Delete product', danger: true })
    if (!yes) return
    setBusy(true); setError(''); setOk('')
    try { await adm(`products/${id}/`, { method: 'DELETE' }); navigate('/admin/products', { replace: true }) }
    catch (e) { setError(errorText(e) || e.message); setBusy(false) }
  }

  if (loading) return <p className="text-neutral-600">Loading…</p>

  return (
    <form onSubmit={save} noValidate>
      {confirmBox}
      <PageHead title={isNew ? 'New product' : f.name || 'Edit product'}>
        <Link to="/admin/products" className={btnGhost}>← Products</Link>
        {!isNew && <button type="button" onClick={deleteProduct} disabled={busy} className="inline-block border border-red-300 px-4 py-2 text-sm text-red-700 transition-colors hover:bg-red-50 disabled:opacity-40">Delete</button>}
        <button type="submit" className={btnCls} disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button>
      </PageHead>
      <Msg error={error} ok={ok} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className={`${cardCls} space-y-4`}>
            <h2 className="font-display text-xl">Basics</h2>
            <Field label="Product name" error={errs.name}><input className={inputCls} value={f.name} onChange={set('name')} maxLength={160} required /></Field>
            <Field label="Short description" hint="One line under the name." error={errs.short_description}><input className={inputCls} value={f.short_description} onChange={set('short_description')} maxLength={240} /></Field>
            <Field label="Description" error={errs.description}><textarea className={inputCls} rows={5} value={f.description} onChange={set('description')} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" error={errs.category}>
                <select className={inputCls} value={f.category} onChange={set('category')}>
                  <option value="">Choose…</option>
                  {opts.categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Collection" hint="Optional.">
                <select className={inputCls} value={f.collection} onChange={set('collection')}>
                  <option value="">None</option>
                  {opts.collections.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Season">
                <select className={inputCls} value={f.season} onChange={set('season')}>
                  {(opts.seasons || []).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </Field>
              <Field label="Tags" hint="Comma separated, e.g. oversized, linen" error={errs.tags}><input className={inputCls} value={f.tags} onChange={set('tags')} maxLength={200} /></Field>
            </div>
          </section>

          <section className={cardCls}>
            <h2 className="mb-1 font-display text-xl">Also show in</h2>
            <p className="mb-4 text-sm text-neutral-600">
              The category above is the main place. Tick any other menu items where this product should also appear,
              for example Men &gt; Featured &gt; New Arrivals, or the same product under Women or Kids.
            </p>
            {Object.keys(places).length === 0 ? <p className="text-sm text-neutral-500">No menu items yet. Add some in Categories.</p> : (
              <div className="space-y-5">
                {Object.entries(places).map(([section, groups]) => (
                  <div key={section}>
                    <p className="mb-2 font-display text-lg">{section}</p>
                    <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                      {Object.entries(groups).map(([group, items]) => (
                        <fieldset key={group}>
                          <legend className="mb-1 text-xs uppercase tracking-wide text-neutral-500">{group}</legend>
                          {items.map((c) => {
                            const main = String(f.category) === String(c.id)
                            return (
                              <label key={c.id} className="flex items-center gap-2 py-0.5 text-sm">
                                <input type="checkbox" checked={main || f.placements.includes(c.id)} disabled={main} onChange={() => togglePlace(c.id)} />
                                <span>{c.name}{main && <span className="ml-1 text-xs text-neutral-500">(main)</span>}</span>
                              </label>
                            )
                          })}
                        </fieldset>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={`${cardCls} space-y-4`}>
            <h2 className="font-display text-xl">Price</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Price (৳)" error={errs.price}><input className={inputCls} type="number" min="1" step="1" value={f.price} onChange={set('price')} required /></Field>
              <Field label="Original price (৳)" hint="Fill ONLY for a real discount. Must be higher than the price." error={errs.compare_at_price}><input className={inputCls} type="number" min="1" step="1" value={f.compare_at_price} onChange={set('compare_at_price')} /></Field>
            </div>
          </section>

          <section className={cardCls}>
            <h2 className="mb-1 font-display text-xl">Sizes, colours and stock</h2>
            <p className="mb-3 text-sm text-neutral-600">One row per size and colour. Leave size empty for items without sizes.</p>
            <Msg error={errs.variants} />
            <datalist id="sizes">{(opts.sizes || []).map((s) => <option key={s} value={s} />)}</datalist>
            <div className="space-y-2">
              {variants.map((v, i) => (
                <div key={v.id || `n${i}`} className="grid grid-cols-[1fr_1fr_5rem_auto] items-center gap-2">
                  <input className={inputCls} list="sizes" placeholder="Size (M)" aria-label="Size" value={v.size} onChange={(e) => setVar(i, 'size', e.target.value)} maxLength={10} />
                  <input className={inputCls} placeholder="Colour (Black)" aria-label="Colour" value={v.color} onChange={(e) => setVar(i, 'color', e.target.value)} maxLength={40} />
                  <input className={inputCls} type="number" min="0" step="1" aria-label="Stock" value={v.stock} onChange={(e) => setVar(i, 'stock', e.target.value)} />
                  <button type="button" className="px-2 text-lg text-neutral-500 hover:text-red-700" aria-label="Remove row" onClick={() => setVariants((vs) => vs.filter((_, n) => n !== i))}>×</button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={btnGhost} onClick={() => setVariants((vs) => [...vs, { size: '', color: vs[vs.length - 1]?.color || '', stock: 0, sku: '' }])}>+ Add row</button>
              <button type="button" className={btnGhost} onClick={() => {
                const color = variants[0]?.color || ''
                const have = new Set(variants.map((v) => `${v.size}|${v.color}`))
                setVariants((vs) => [...vs.filter((v) => v.size || v.color || v.id), ...(opts.sizes || []).filter((s) => !have.has(`${s}|${color}`)).map((s) => ({ size: s, color, stock: 0, sku: '' }))])
              }}>+ Add all sizes (XS–XXL)</button>
            </div>
            <p className="mt-3 text-xs text-neutral-500">A size that was sold before cannot be deleted. It is kept with stock 0 so old orders stay correct.</p>
          </section>

          <section className={cardCls}>
            <h2 className="mb-1 font-display text-xl">Photos by colour</h2>
            <p className="mb-4 text-sm text-neutral-600">
              Each colour has its own photos (up to {MAX_PER_COLOUR}). The product page shows the photos of the colour the customer picks, in this order. Photos under "All colours" are shown only for a colour that has no photos of its own.
              Add the colours in the table above first, then they appear here. {isNew ? 'Photos are uploaded when you press Save.' : 'Photos are uploaded as soon as you choose them.'}
            </p>
            <div className="space-y-6">
              {groups.map((g) => (
                <PhotoGroup key={g || 'shared'} color={g} colours={groups.filter(Boolean)} busy={busy}
                  saved={images.filter((x) => norm(x.color) === g)} pending={files.map((x, i) => ({ ...x, i })).filter((x) => x.color === g)}
                  onAdd={(list) => addPhotos(g, list)} onMain={makeMain} onStep={step} onRemove={remove} onMove={setImgColor}
                  onDropPending={(i) => { URL.revokeObjectURL(files[i].url); setFiles((fs) => fs.filter((_, n) => n !== i)) }} />
              ))}
            </div>
            {errs.images && <p className="mt-2 text-xs text-red-700">{errs.images}</p>}
          </section>

          <section className={`${cardCls} space-y-4`}>
            <h2 className="font-display text-xl">Details <span className="text-sm text-neutral-500">(all optional)</span></h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Product code (SKU)"><input className={inputCls} value={f.sku} onChange={set('sku')} maxLength={40} /></Field>
              <Field label="Fabric"><input className={inputCls} value={f.fabric} onChange={set('fabric')} maxLength={200} placeholder="100% organic cotton" /></Field>
              <Field label="Fit"><input className={inputCls} value={f.fit} onChange={set('fit')} maxLength={80} placeholder="Relaxed" /></Field>
              <Field label="Model height"><input className={inputCls} value={f.model_height} onChange={set('model_height')} maxLength={40} placeholder="6'0&quot; or 183 cm" /></Field>
              <Field label="Size the model wears"><input className={inputCls} value={f.model_wears} onChange={set('model_wears')} maxLength={10} /></Field>
            </div>
            <Field label="Care instructions" hint="One per line."><textarea className={inputCls} rows={3} value={f.care} onChange={set('care')} /></Field>
          </section>
        </div>

        <div className="space-y-6">
          <section className={`${cardCls} space-y-3`}>
            <h2 className="font-display text-xl">Visibility</h2>
            {[['is_active', 'Show on the website'], ['is_new', 'Mark as New'], ['is_signature', 'Show in HEEM Signature']].map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f[k]} onChange={set(k)} />{l}</label>
            ))}
          </section>

        </div>
      </div>

      <div className="mt-6 flex justify-end"><button type="submit" className={btnCls} disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button></div>
    </form>
  )
}

function PhotoGroup({ color, colours, saved, pending, busy, onAdd, onMain, onStep, onRemove, onMove, onDropPending }) {
  const picker = useRef(null)
  const total = saved.length + pending.length
  return (
    <div className="border border-[#1a1716]/15 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{color || 'All colours (shared photos)'} <span className="font-normal text-neutral-500">· {total} photo{total === 1 ? '' : 's'}</span></h3>
        <button type="button" className={btnGhost} disabled={busy} onClick={() => picker.current?.click()}>+ Add photos</button>
        <input ref={picker} type="file" accept="image/*" multiple hidden onChange={(e) => { onAdd(e.target.files); e.target.value = '' }} />
      </div>
      {total === 0 ? (
        <p className="text-xs text-neutral-500">{color ? `No photos for ${color} yet.` : 'Optional. Used only for colours that have no photos of their own.'}</p>
      ) : (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {saved.map((img, i) => (
            <li key={img.id} className="text-xs">
              <img src={mediaUrl(img.image)} alt={img.alt || ''} className="aspect-[4/5] w-full object-cover" />
              <p className="mt-1">{i === 0 ? 'First' : `#${i + 1}`}</p>
              <select className="mt-1 w-full border border-[#1a1716]/25 bg-white px-1 py-0.5" value={color} aria-label="Move photo to colour"
                onChange={(e) => onMove(img, e.target.value)}>
                <option value="">All colours</option>
                {colours.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="mt-1 flex items-center justify-between">
                <button type="button" className="px-1 disabled:opacity-30" disabled={i === 0} aria-label="Move earlier" onClick={() => onStep(saved, i, -1)}>←</button>
                <button type="button" className="px-1 disabled:opacity-30" disabled={i === saved.length - 1} aria-label="Move later" onClick={() => onStep(saved, i, 1)}>→</button>
                <button type="button" className="text-red-700 underline" onClick={() => onRemove(img)}>Delete</button>
              </div>
            </li>
          ))}
          {pending.map((x) => (
            <li key={x.url} className="text-xs">
              <img src={x.url} alt="" className="aspect-[4/5] w-full border border-dashed border-[#B08D57] object-cover" />
              <p className="mt-1 text-neutral-500">Not saved yet</p>
              <button type="button" className="text-red-700 underline" onClick={() => onDropPending(x.i)}>Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}