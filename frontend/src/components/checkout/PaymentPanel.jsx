import { useEffect, useRef, useState } from 'react'
import { formatPrice } from '../../Api.jsx'
import { Field } from './AddressForm.jsx'

function CopyNumber({ number, label }) {
  const [state, setState] = useState('idle') // idle | copied | failed
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    clearTimeout(timer.current)
    try {
      await navigator.clipboard.writeText(number)
      setState('copied')
    } catch {
      setState('failed') // never claim success when the browser refused (e.g. not a secure page)
    }
    timer.current = setTimeout(() => setState('idle'), 4000)
  }

  return (
    <div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="select-all font-display text-2xl tracking-[0.08em]" aria-label={`${label} number ${number}`}>{number}</span>
        <button type="button" onClick={copy}
          className="flex items-center gap-2 border border-[#1a1716]/30 px-4 py-2.5 text-sm uppercase tracking-[0.15em] transition-colors hover:border-[#1a1716] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B08D57]">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
            <rect x="9" y="9" width="11" height="11" rx="1" /><path d="M5 15V5a1 1 0 0 1 1-1h10" />
          </svg>
          {state === 'copied' ? 'Copied!' : 'Copy number'}
        </button>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {state === 'copied' ? `${label} number copied.` : state === 'failed' ? 'Could not copy the number. Please select it and copy it manually.' : ''}
      </p>
      {state === 'failed' && (
        <p className="mt-2 text-sm text-[#8a6d3b]">We could not copy it automatically. Select the number above and copy it yourself.</p>
      )}
    </div>
  )
}

export default function PaymentPanel({ methods, method, setMethod, total, pay, setPay, onAmountEdit, errors }) {
  const current = methods.find((m) => m.code === method)
  const mobile = current?.kind === 'mobile'
  const err = (k) => errors[`pay.${k}`]
  const set = (k) => (e) => {
    if (k === 'amount_sent') onAmountEdit()
    setPay({ ...pay, [k]: e.target.value })
  }
  const differs = mobile && total != null && pay.amount_sent !== '' && Number(pay.amount_sent) !== Number(total)

  return (
    <fieldset id="payment-method" tabIndex={-1}>
      <legend className="sr-only">Payment method</legend>
      <div className="grid gap-3">
        {methods.map((m) => (
          <label key={m.code}
            className={`flex cursor-pointer items-center gap-3 border p-4 transition-colors ${method === m.code ? 'border-[#1a1716]' : 'border-[#1a1716]/20 hover:border-[#1a1716]/50'}`}>
            <input type="radio" name="payment_method" value={m.code} checked={method === m.code}
              onChange={() => setMethod(m.code)} className="h-4 w-4 accent-[#1a1716]" />
            <span>{m.label}</span>
            <span className="ml-auto text-right text-xs text-neutral-500">{m.kind === 'mobile' ? 'Send money, then enter your TrxID' : 'Pay when you receive'}</span>
          </label>
        ))}
      </div>
      {errors.payment_method && <p role="alert" className="mt-2 text-sm text-[#8a6d3b]">{errors.payment_method}</p>}

      {current && !mobile && (
        <p className="mt-6 text-sm leading-relaxed text-neutral-600">
          Pay in cash when your order arrives. No payment details are needed now.
          Your order is marked paid only after our team confirms the cash was collected.
        </p>
      )}

      {mobile && (
        <div className="mt-6 border border-[#1a1716]/15 p-5 md:p-6">
          {total == null ? (
            <p className="text-sm text-neutral-600">Choose your delivery district first, so we can show the exact amount to send.</p>
          ) : (
            <>
              <p className="text-sm text-neutral-600">Send exactly <strong className="font-medium text-[#1a1716]">{formatPrice(total)}</strong> to this {current.label} number:</p>
              <CopyNumber number={current.number} label={current.label} />
              <ol className="mt-5 list-decimal space-y-1 pl-5 text-sm text-neutral-600">
                <li>Open your {current.label} app and choose Send Money.</li>
                <li>Enter the number above and send exactly {formatPrice(total)}.</li>
                <li>Come back here and enter your payment details below.</li>
              </ol>
              <p className="mt-4 text-sm text-[#8a6d3b]">
                Check the number carefully before you send. HEEM will never ask for your PIN, OTP or password.
              </p>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <Field id="pay-sender_number" label="Number you paid from" error={err('sender_number')}>
                  {(p) => <input {...p} type="tel" inputMode="tel" placeholder="01XXXXXXXXX" value={pay.sender_number} onChange={set('sender_number')} autoComplete="tel" />}
                </Field>
                <Field id="pay-trx_id" label="Transaction ID (TrxID)" error={err('trx_id')} hint="Find it in your payment confirmation message.">
                  {(p) => <input {...p} value={pay.trx_id} onChange={set('trx_id')} autoComplete="off" autoCapitalize="characters" spellCheck="false" />}
                </Field>
                <Field id="pay-amount_sent" label="Amount sent (৳)" error={err('amount_sent')}>
                  {(p) => <input {...p} inputMode="decimal" value={pay.amount_sent} onChange={set('amount_sent')} autoComplete="off" />}
                </Field>
                <Field id="pay-note" label="Note" optional error={err('note')}>
                  {(p) => <input {...p} value={pay.note} onChange={set('note')} maxLength={200} autoComplete="off" />}
                </Field>
              </div>
              {differs && (
                <p role="status" className="mt-4 text-sm text-[#8a6d3b]">
                  This is different from your order total ({formatPrice(total)}). We can still take your order, but the payment will need a manual review.
                </p>
              )}
              <p className="mt-4 text-xs text-neutral-500">Your order stays pending until our team verifies the payment in our {current.label} account.</p>
            </>
          )}
        </div>
      )}
    </fieldset>
  )
}