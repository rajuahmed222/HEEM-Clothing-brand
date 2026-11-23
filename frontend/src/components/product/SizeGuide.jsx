import useModal from './useModal.js'

// Bottom sheet on phones, right-hand drawer from md up. `chart` comes from the backend (SizeChart).
export default function SizeGuide({ chart, onClose }) {
  useModal(onClose)
  const unit = chart.unit === 'cm' ? 'centimetres' : chart.unit === 'in' ? 'inches' : chart.unit

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-labelledby="size-guide-title">
      <div onClick={onClose} className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-x-0 bottom-0 max-h-[90svh] overflow-y-auto bg-[#F7F4EF] p-6 md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[34rem] md:p-10">
        <div className="flex items-start justify-between gap-4">
          <h2 id="size-guide-title" className="font-display text-3xl">{chart.title}</h2>
          <button type="button" autoFocus onClick={onClose} aria-label="Close size guide"
            className="p-2 text-2xl leading-none transition-colors hover:text-[#B08D57] focus-visible:outline-2 focus-visible:outline-[#B08D57]">×</button>
        </div>
        <p className="mt-2 text-sm text-neutral-600">Measurements are in {unit}.</p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-max text-left text-sm">
            <caption className="sr-only">{chart.title}, in {unit}</caption>
            <thead>
              <tr className="border-b border-[#1a1716]/25">
                <th scope="col" className="py-3 pr-6 font-display font-semibold">Size</th>
                {chart.columns.map((c) => <th key={c.key} scope="col" className="py-3 pr-6 font-display font-semibold">{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {chart.rows.map((r) => (
                <tr key={r.size} className="border-b border-[#1a1716]/10">
                  <th scope="row" className="py-3 pr-6 font-normal">{r.size}</th>
                  {chart.columns.map((c) => <td key={c.key} className="py-3 pr-6 text-neutral-700">{r[c.key] || '—'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {chart.note && <p className="mt-6 text-sm text-neutral-600">{chart.note}</p>}
      </div>
    </div>
  )
}