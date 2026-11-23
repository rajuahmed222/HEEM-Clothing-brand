import { DIVISIONS } from '../../data/bdLocations.js'

export const PHONE = /^(?:\+?88)?01[3-9]\d{8}$|^\+?\d{7,15}$/
export const BD_MOBILE = /^(?:\+?88)?01[3-9]\d{8}$/
export const clean = (s) => String(s || '').replace(/[\s-]/g, '')

export const input = (bad) =>
  `w-full border bg-transparent px-4 py-3 text-[0.95rem] outline-none transition-colors placeholder:text-neutral-400 focus:border-[#1a1716] ${bad ? 'border-[#8a6d3b]' : 'border-[#1a1716]/20'}`

// children is a function that receives the props every input needs (id, aria-invalid, aria-describedby)
export function Field({ id, label, error, hint, optional, children }) {
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm">
        {label}{optional && <span className="ml-1 text-neutral-400">(optional)</span>}
      </label>
      {children({ id, name: id, 'aria-invalid': !!error, 'aria-describedby': describedBy, className: input(!!error) })}
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-neutral-500">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="mt-1 text-sm text-[#8a6d3b]">{error}</p>}
    </div>
  )
}

export const EMPTY_ADDRESS = {
  recipient_name: '', phone: '', division: '', district: '', upazila: '', area: '',
  house: '', road: '', landmark: '', postal_code: '',
}

// A saved address keeps house + road together in `street`, so it all goes into the road field.
export const fromSaved = (a) => ({
  recipient_name: a.recipient_name || '', phone: a.phone || '', division: a.division || '',
  district: a.district || '', upazila: a.upazila || '', area: a.area || '', house: '',
  road: a.street || '', landmark: a.landmark || '', postal_code: a.postal_code || '',
})

export const toPayload = (v) => ({
  recipient_name: v.recipient_name.trim(),
  phone: clean(v.phone),
  country: 'Bangladesh',
  division: v.division,
  district: v.district,
  upazila: v.upazila.trim(),
  area: v.area.trim(),
  street: [v.house.trim(), v.road.trim()].filter(Boolean).join(', '),
  landmark: v.landmark.trim(),
  postal_code: v.postal_code.trim(),
})

// Returns { 'addr.phone': 'message', ... } (prefix says which form the keys belong to)
export function validateAddress(v, prefix) {
  const e = {}
  if (!v.recipient_name.trim()) e[`${prefix}.recipient_name`] = 'Enter the full name.'
  if (!clean(v.phone)) e[`${prefix}.phone`] = 'Enter a mobile number.'
  else if (!PHONE.test(clean(v.phone))) e[`${prefix}.phone`] = 'Enter a valid mobile number, e.g. 01XXXXXXXXX.'
  if (!v.division) e[`${prefix}.division`] = 'Choose a division.'
  if (!v.district) e[`${prefix}.district`] = 'Choose a district.'
  if (!v.upazila.trim()) e[`${prefix}.upazila`] = 'Enter the upazila / thana or city.'
  if (!v.road.trim()) e[`${prefix}.road`] = 'Enter the road or street.'
  if (v.postal_code.trim() && !/^\d{4}$/.test(v.postal_code.trim())) e[`${prefix}.postal_code`] = 'Bangladesh postal codes have 4 digits.'
  return e
}

export default function AddressForm({ prefix, value, onChange, errors, nameLabel = 'Full name', autoFill = true }) {
  const id = (k) => `${prefix}-${k}`
  const err = (k) => errors[`${prefix}.${k}`]
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value, ...(k === 'division' ? { district: '' } : {}) })
  const ac = (token) => (autoFill ? token : 'off')

  const divisions = Object.keys(DIVISIONS)
  if (value.division && !divisions.includes(value.division)) divisions.push(value.division)
  const districts = [...(DIVISIONS[value.division] || [])]
  if (value.district && !districts.includes(value.district)) districts.push(value.district)

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Field id={id('recipient_name')} label={nameLabel} error={err('recipient_name')}>
        {(p) => <input {...p} value={value.recipient_name} onChange={set('recipient_name')} autoComplete={ac('name')} />}
      </Field>
      <Field id={id('phone')} label="Mobile number" error={err('phone')}>
        {(p) => <input {...p} type="tel" inputMode="tel" placeholder="01XXXXXXXXX" value={value.phone} onChange={set('phone')} autoComplete={ac('tel')} />}
      </Field>
      <Field id={id('division')} label="Division" error={err('division')}>
        {(p) => (
          <select {...p} value={value.division} onChange={set('division')}>
            <option value="">Select division</option>
            {divisions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
      </Field>
      <Field id={id('district')} label="District" error={err('district')}>
        {(p) => (
          <select {...p} value={value.district} onChange={set('district')} disabled={!value.division}>
            <option value="">{value.division ? 'Select district' : 'Choose a division first'}</option>
            {districts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
      </Field>
      <Field id={id('upazila')} label="Upazila / Thana or City" error={err('upazila')}>
        {(p) => <input {...p} value={value.upazila} onChange={set('upazila')} autoComplete="off" />}
      </Field>
      <Field id={id('area')} label="Area / Locality" optional error={err('area')}>
        {(p) => <input {...p} value={value.area} onChange={set('area')} autoComplete="off" />}
      </Field>
      <Field id={id('house')} label="House / Building number" optional>
        {(p) => <input {...p} value={value.house} onChange={set('house')} autoComplete="off" />}
      </Field>
      <Field id={id('road')} label="Road / Street / Village" error={err('road') || err('street')}>
        {(p) => <input {...p} value={value.road} onChange={set('road')} autoComplete={ac('address-line1')} />}
      </Field>
      <div className="md:col-span-2">
        <Field id={id('landmark')} label="Apartment, floor or landmark" optional error={err('landmark')}>
          {(p) => <input {...p} value={value.landmark} onChange={set('landmark')} autoComplete={ac('address-line2')} />}
        </Field>
      </div>
      <Field id={id('postal_code')} label="Postal code" optional error={err('postal_code')}>
        {(p) => <input {...p} inputMode="numeric" maxLength={4} value={value.postal_code} onChange={set('postal_code')} autoComplete={ac('postal-code')} />}
      </Field>
    </div>
  )
}