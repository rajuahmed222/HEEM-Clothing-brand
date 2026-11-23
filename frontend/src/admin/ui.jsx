import { useCallback, useEffect, useRef, useState } from 'react'
import { request, formatPrice } from '../Api.jsx'

// Every admin call goes to /api/admin/...
export const adm = (path, opts) => request(`admin/${path}`, opts)

export const inputCls = 'w-full border border-[#1a1716]/25 bg-white px-3 py-2 text-sm outline-none focus:border-[#1a1716]'
export const btnCls = 'inline-block border border-[#1a1716] bg-[#1a1716] px-4 py-2 text-sm text-[#F7F4EF] transition-opacity hover:opacity-85 disabled:opacity-40'
export const btnGhost = 'inline-block border border-[#1a1716]/30 px-4 py-2 text-sm transition-colors hover:border-[#1a1716] disabled:opacity-40'
export const cardCls = 'border border-[#1a1716]/15 bg-white p-5'

export const money = (n) => formatPrice(Number(n) || 0)
export const when = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '')

const TONE = {
  placed: 'bg-amber-100 text-amber-900', confirmed: 'bg-sky-100 text-sky-900', processing: 'bg-sky-100 text-sky-900',
  packed: 'bg-sky-100 text-sky-900', shipped: 'bg-indigo-100 text-indigo-900', in_transit: 'bg-indigo-100 text-indigo-900',
  out_for_delivery: 'bg-indigo-100 text-indigo-900', delivered: 'bg-emerald-100 text-emerald-900',
  cancelled: 'bg-neutral-200 text-neutral-700', returned: 'bg-neutral-200 text-neutral-700', return_requested: 'bg-orange-100 text-orange-900',
  paid: 'bg-emerald-100 text-emerald-900', verified: 'bg-emerald-100 text-emerald-900', refunded: 'bg-neutral-200 text-neutral-700',
  pending: 'bg-amber-100 text-amber-900', pending_verification: 'bg-amber-100 text-amber-900', submitted: 'bg-amber-100 text-amber-900',
  cod_pending: 'bg-amber-100 text-amber-900', refund_pending: 'bg-orange-100 text-orange-900',
  failed: 'bg-red-100 text-red-900', rejected: 'bg-red-100 text-red-900',
  new: 'bg-amber-100 text-amber-900', replied: 'bg-emerald-100 text-emerald-900', closed: 'bg-neutral-200 text-neutral-700',
}
export function Badge({ value, label }) {
  return <span className={`inline-block whitespace-nowrap px-2 py-0.5 text-xs ${TONE[value] || 'bg-neutral-100 text-neutral-700'}`}>{label || value}</span>
}

export function Msg({ error, ok }) {
  if (!error && !ok) return null
  return <p role={error ? 'alert' : 'status'} className={`mb-4 border px-3 py-2 text-sm ${error ? 'border-red-300 bg-red-50 text-red-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800'}`}>{error || ok}</p>
}

export function Pager({ data, onPage }) {
  if (!data || data.pages <= 1) return null
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-neutral-600">{data.count} results</span>
      <div className="flex items-center gap-2">
        <button type="button" className={btnGhost} disabled={data.page <= 1} onClick={() => onPage(data.page - 1)}>Previous</button>
        <span>{data.page} / {data.pages}</span>
        <button type="button" className={btnGhost} disabled={data.page >= data.pages} onClick={() => onPage(data.page + 1)}>Next</button>
      </div>
    </div>
  )
}

export function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t) }, [value, ms])
  return v
}

export function PageHead({ title, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-3xl">{title}</h1>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

// A confirmation box inside the page (instead of the browser's plain alert).
//   const [ask, confirmBox] = useConfirm()
//   if (!(await ask({ title: 'Delete this?', message: '…', confirmLabel: 'Delete', danger: true }))) return
//   …and render {confirmBox} once in the component.
export function useConfirm() {
  const [req, setReq] = useState(null) // { opts, resolve }
  const ask = useCallback((opts) => new Promise((resolve) => setReq({ opts, resolve })), [])
  const close = (answer) => { req?.resolve(answer); setReq(null) }
  return [ask, req && <ConfirmDialog opts={req.opts} onAnswer={close} />]
}

function ConfirmDialog({ opts, onAnswer }) {
  const cancel = useRef(null)
  const ok = useRef(null)
  const answer = useRef(onAnswer)
  answer.current = onAnswer // the box re-renders with its parent; the effect below must run only once
  const { title = 'Are you sure?', message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false } = opts

  useEffect(() => {
    const before = document.activeElement
    cancel.current?.focus() // the safe choice is focused first
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); answer.current(false) }
      if (e.key === 'Tab') { // keep focus inside the box
        const a = [cancel.current, ok.current]
        const i = a.indexOf(document.activeElement)
        e.preventDefault()
        a[(i + (e.shiftKey ? -1 : 1) + a.length) % a.length].focus()
      }
    }
    window.addEventListener('keydown', onKey, true)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey, true); document.body.style.overflow = prev; before?.focus?.() }
  }, [])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div onClick={() => onAnswer(false)} className="absolute inset-0 bg-black/40" aria-hidden="true" />
      <div role="alertdialog" aria-modal="true" aria-labelledby="cf-title" aria-describedby="cf-msg"
        className="relative w-full max-w-md border border-[#1a1716]/15 bg-[#F7F4EF] p-6 shadow-xl motion-safe:animate-[fadeIn_0.2s_ease_both]">
        <h2 id="cf-title" className="font-display text-2xl">{title}</h2>
        {message && <p id="cf-msg" className="mt-3 text-sm leading-relaxed text-neutral-700">{message}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button ref={cancel} type="button" onClick={() => onAnswer(false)} className={btnGhost}>{cancelLabel}</button>
          <button ref={ok} type="button" onClick={() => onAnswer(true)}
            className={danger
              ? 'inline-block border border-red-700 bg-red-700 px-4 py-2 text-sm text-white transition-opacity hover:opacity-85'
              : btnCls}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}