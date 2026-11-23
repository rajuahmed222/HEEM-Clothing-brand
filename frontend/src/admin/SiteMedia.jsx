import { useEffect, useRef, useState } from 'react'
import { adm, btnCls, btnGhost, cardCls, Msg, PageHead, useConfirm } from './ui.jsx'
import { errorText } from '../Api.jsx'
import { mediaUrl } from '../components/ProductCard.jsx'
import { resetSiteMedia } from '../lib/siteMedia.js'

function Preview({ file, product, label }) {
  if (!file && product?.image) return <img src={mediaUrl(product.image)} alt={product.name} className="h-full w-full object-cover" />
  if (!file) return <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-xs text-neutral-500">Default</div>
  const src = mediaUrl(file.url)
  return file.kind === 'video'
    ? <video src={src} muted loop playsInline autoPlay className="h-full w-full object-cover" />
    : <img src={src} alt={label} className="h-full w-full object-cover" />
}

function Slot({ slot, products, onChange, onError, ask }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const accept = slot.kind === 'video' ? '.mp4,.webm' : slot.kind === 'either' ? '.jpg,.jpeg,.png,.webp,.avif,.mp4,.webm' : '.jpg,.jpeg,.png,.webp,.avif'

  const upload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true); onError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      await adm(`media-slots/${slot.key}/`, { method: 'POST', body: fd })
      resetSiteMedia(); await onChange(`${slot.label} updated.`)
    } catch (err) { onError(errorText(err) || err.message) } finally { setBusy(false) }
  }
  const remove = async () => {
    if (!(await ask({ title: 'Remove this picture?', message: `“${slot.label}” goes back to the default look.`, confirmLabel: 'Remove', danger: true }))) return
    setBusy(true); onError('')
    try { await adm(`media-slots/${slot.key}/`, { method: 'DELETE' }); resetSiteMedia(); await onChange(`${slot.label} removed.`) }
    catch (err) { onError(errorText(err) || err.message) } finally { setBusy(false) }
  }

  const [text, setText] = useState({ label: slot.caption || '', link: slot.link || '' })
  const [touched, setTouched] = useState(false) // until the caption is edited, the box shows the product's name
  const patch = async (body) => {
    setBusy(true); onError('')
    try {
      await adm(`media-slots/${slot.key}/`, { method: 'PATCH', body })
      resetSiteMedia(); await onChange(`${slot.label} updated.`)
    } catch (err) { onError(errorText(err) || err.message) } finally { setBusy(false) }
  }
  const pickProduct = (e) => patch({ product: e.target.value || null })
  const shownCaption = touched ? text.label : (text.label || slot.product?.name || '')
  const dirty = (touched && text.label !== (slot.caption || '')) || text.link !== (slot.link || '')
  // A caption equal to the product's name is not stored, so the tile keeps following the product if it is renamed later
  const saveText = () => patch({ label: slot.product && text.label.trim() === slot.product.name ? '' : text.label, link: text.link }).then(() => setTouched(false))

  return (
    <div className={`${cardCls} flex gap-4 p-3`}>
      <div className="h-28 w-24 shrink-0 overflow-hidden border border-[#1a1716]/10"><Preview file={slot.file} product={slot.product} label={slot.label} /></div>
      <div className="min-w-0 flex-1">
        {/* the title follows what the tile shows: own caption, else the chosen product, else the place's own name */}
        <p className="text-sm font-medium">{slot.caption || slot.product?.name || slot.label}</p>
        {(slot.caption || slot.product) && <p className="text-xs text-neutral-500">{slot.label}</p>}
        <p className="mt-1 text-xs text-neutral-500">{slot.hint}</p>
        <input ref={input} type="file" accept={accept} onChange={upload} className="sr-only" aria-label={`Choose a file for ${slot.label}`} tabIndex={-1} />
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className={btnCls}>{busy ? 'Working…' : slot.file ? 'Replace' : 'Upload'}</button>
          {slot.file && <button type="button" disabled={busy} onClick={remove} className={btnGhost}>Remove</button>}
        </div>
        {slot.product_ok && (
          <label className="mt-3 block text-xs text-neutral-600">
            <span className="mb-1 block">Or show a product (the tile links to it)</span>
            <select value={slot.product?.id || ''} disabled={busy} onChange={pickProduct}
              className="w-full border border-[#1a1716]/25 bg-white px-2 py-1.5 text-sm outline-none focus:border-[#1a1716]">
              <option value="">No product</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {slot.product && !slot.file && <span className="mt-1 block text-neutral-500">Showing this product’s photo. Upload a picture above to use your own instead.</span>}
          </label>
        )}
        {slot.product_ok && (
          <div className="mt-3 space-y-2 border-t border-[#1a1716]/10 pt-3 text-xs text-neutral-600">
            <p>Own tile (not a product from the shop): upload a picture above, then add a caption and a link.</p>
            <input value={shownCaption} maxLength={80} onChange={(e) => { setTouched(true); setText({ ...text, label: e.target.value }) }} placeholder="Caption (e.g. Eid collection)" aria-label="Caption"
              className="w-full border border-[#1a1716]/25 bg-white px-2 py-1.5 text-sm outline-none focus:border-[#1a1716]" />
            <input value={text.link} maxLength={200} onChange={(e) => setText({ ...text, link: e.target.value })} placeholder="Link (e.g. /men or /product/silk-saree)" aria-label="Link"
              className="w-full border border-[#1a1716]/25 bg-white px-2 py-1.5 text-sm outline-none focus:border-[#1a1716]" />
            <button type="button" disabled={busy || !dirty} onClick={saveText} className={btnGhost}>Save caption and link</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SiteMedia() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [ask, confirmBox] = useConfirm()
  const load = () => adm('media-slots/').then(setData).catch((e) => setError(errorText(e) || e.message))
  useEffect(() => { load() }, [])
  const changed = async (msg) => { setOk(msg); await load() }

  return (
    <div>
      {confirmBox}
      <PageHead title="Site media" />
      <p className="mb-6 max-w-2xl text-sm text-neutral-600">
        Pictures and videos for the website itself (product photos stay in Products). A place with no file keeps its default look.
        Changes show on the website within a minute.
      </p>
      <Msg error={error} ok={ok} />
      {!data ? <p className="text-neutral-600">Loading…</p> : (
        <div className="space-y-10">
          {data.groups.map((g) => (
            <section key={g.title}>
              <h2 className="mb-4 font-display text-xl">{g.title}</h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {g.slots.map((s) => <Slot key={s.key} slot={s} products={data.products} onChange={changed} onError={setError} ask={ask} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}