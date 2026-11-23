import { useEffect, useMemo, useState } from 'react'
import { adm, btnCls, btnGhost, cardCls, inputCls, Msg, PageHead, useConfirm } from './ui.jsx'
import { errorText } from '../Api.jsx'
import { resetCategories } from '../lib/categories.js'

const SHOWING = {
  live: ['Live', 'bg-emerald-100 text-emerald-900'],
  coming_soon: ['Coming soon page', 'bg-amber-100 text-amber-900'],
  hidden: ['Hidden', 'bg-neutral-200 text-neutral-700'],
}
const SHORT = { auto: 'Automatic', active: 'Active', coming_soon: 'Coming soon', hidden: 'Hidden' }
const link = 'underline underline-offset-4 hover:text-[#B08D57]'

function Showing({ state }) {
  const [label, tone] = SHOWING[state] || SHOWING.live
  return <span className={`inline-block whitespace-nowrap px-2 py-0.5 text-xs ${tone}`}>{label}</span>
}

export default function Categories() {
  const [ask, confirmBox] = useConfirm()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(null)
  const [add, setAdd] = useState({ parent: '', group: '', name: '' })
  const [edit, setEdit] = useState(null)   // { id, name, group }
  const [gEdit, setGEdit] = useState(null) // { parent, from, to }

  const load = () => adm('categories/').then(setData).catch((e) => setError(errorText(e) || e.message))
  useEffect(() => { load() }, [])

  const run = async (id, fn, done) => {
    setBusy(id); setError(''); setOk('')
    try { await fn(); resetCategories(); setOk(done); await load(); return true }
    catch (e) { setError(errorText(e) || e.message); return false }
    finally { setBusy(null) }
  }
  const patch = (r, body, done) => run(r.id, () => adm(`categories/${r.id}/`, { method: 'PATCH', body }), done)

  // Section > groups > items, in the order the website menu shows them
  const tree = useMemo(() => {
    if (!data) return []
    const sections = data.results.filter((r) => !r.depth)
    return sections.map((s) => {
      const groups = []
      data.results.filter((r) => r.parent === s.id).forEach((r) => {
        let g = groups.find((x) => x.name === r.group)
        if (!g) groups.push(g = { name: r.group, items: [] })
        g.items.push(r)
      })
      return { ...s, groups }
    })
  }, [data])

  const groupNames = useMemo(() => {
    const sec = tree.find((s) => String(s.id) === String(add.parent))
    return sec ? sec.groups.map((g) => g.name).filter(Boolean) : []
  }, [tree, add.parent])

  const remove = async (r) => {
    const yes = await ask({ title: `Delete “${r.name}”?`, message: 'It will be removed from the menu. This cannot be undone.', confirmLabel: 'Delete', danger: true })
    if (!yes) return
    run(r.id, () => adm(`categories/${r.id}/`, { method: 'DELETE' }), `${r.name} was deleted.`)
  }
  const create = async (e) => {
    e.preventDefault()
    if (await run('new', () => adm('categories/', { method: 'POST', body: add }), `${add.name.trim()} was added.`)) setAdd({ ...add, name: '' })
  }
  const saveItem = async (r) => { if (await patch(r, { name: edit.name, group: edit.group }, 'Saved.')) setEdit(null) }
  const saveGroup = async (e) => {
    e.preventDefault()
    if (await run('g', () => adm('categories/groups/', { method: 'POST', body: gEdit }), `Group renamed to ${gEdit.to.trim()}.`)) setGEdit(null)
  }
  const move = (r, dir) => run(r.id, () => adm(`categories/${r.id}/move/`, { method: 'POST', body: { dir } }), 'Order changed.')

  const statusSelect = (r) => (
    <select aria-label={`Status of ${r.name}`} value={r.status} disabled={busy === r.id}
      onChange={(e) => patch(r, { status: e.target.value }, `${r.name} is now set to ${SHORT[e.target.value]}.`)}
      className="border border-[#1a1716]/25 bg-white px-2 py-1.5 text-sm outline-none focus:border-[#1a1716]">
      {data.statuses.map((s) => <option key={s.value} value={s.value}>{SHORT[s.value]}</option>)}
    </select>
  )

  return (
    <div>
      {confirmBox}
      <PageHead title="Categories" />
      <p className="mb-6 max-w-2xl text-sm text-neutral-600">
        This is your website menu. Each section (Men, Women, Kids, Lifestyle) has groups (the columns: Clothing, Featured, Accessories…) and
        items inside them. Add, rename, reorder or delete them here. Choose which products appear in an item on the product page
        (<b>Also show in</b>). <b>Automatic</b> shows an item once it has a product and the Coming Soon page until then.
      </p>
      <Msg error={error} ok={ok} />

      {data && (
        <form onSubmit={create} className={`${cardCls} mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[10rem_1fr_1fr_auto] lg:items-end`}>
          <label className="block text-sm"><span className="mb-1 block text-neutral-700">Section</span>
            <select required value={add.parent} onChange={(e) => setAdd({ ...add, parent: e.target.value, group: '' })} className={inputCls}>
              <option value="">Choose…</option>
              {tree.filter((s) => !s.fixed).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <label className="block text-sm"><span className="mb-1 block text-neutral-700">Group (menu column)</span>
            <input list="cat-groups" maxLength={60} value={add.group} onChange={(e) => setAdd({ ...add, group: e.target.value })} placeholder="e.g. Featured, or a new group" className={inputCls} />
            <datalist id="cat-groups">{groupNames.map((g) => <option key={g} value={g} />)}</datalist>
          </label>
          <label className="block text-sm"><span className="mb-1 block text-neutral-700">Item name</span>
            <input required maxLength={80} value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} placeholder="e.g. Kurta" className={inputCls} />
          </label>
          <button type="submit" disabled={busy === 'new'} className={btnCls}>{busy === 'new' ? 'Adding…' : 'Add item'}</button>
        </form>
      )}

      {!data ? <p className="text-neutral-600">Loading…</p> : (
        <div className="space-y-6">
          {tree.map((s) => (
            <section key={s.id} className={`${cardCls} p-0`}>
              <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#1a1716]/15 bg-[#F7F4EF] px-4 py-3">
                <h2 className="font-display text-xl">{s.name}</h2>
                <Showing state={s.state} />
                <span className="text-xs text-neutral-500">{s.products_total} product(s)</span>
                <span className="ml-auto text-sm">
                  {s.fixed ? <span className="text-xs text-neutral-500">{s.note}</span> : statusSelect(s)}
                </span>
              </header>

              {!s.fixed && s.groups.length === 0 && <p className="p-4 text-sm text-neutral-500">Nothing here yet. Add an item above.</p>}
              {s.groups.map((g) => (
                <div key={g.name || '_'} className="border-b border-[#1a1716]/10 last:border-0">
                  <div className="flex items-center gap-3 bg-neutral-50 px-4 py-2 text-xs uppercase tracking-wide text-neutral-600">
                    {gEdit && gEdit.parent === s.id && gEdit.from === g.name ? (
                      <form onSubmit={saveGroup} className="flex flex-wrap items-center gap-2 normal-case">
                        <input autoFocus required maxLength={60} value={gEdit.to} onChange={(e) => setGEdit({ ...gEdit, to: e.target.value })} aria-label="Group name" className={inputCls + ' !w-48'} />
                        <button type="submit" disabled={busy === 'g'} className={btnCls}>Save</button>
                        <button type="button" onClick={() => setGEdit(null)} className={btnGhost}>Cancel</button>
                      </form>
                    ) : (
                      <>
                        <span>{g.name || 'No group (shown as “More”)'}</span>
                        {g.name && <button type="button" onClick={() => setGEdit({ parent: s.id, from: g.name, to: g.name })} className={`normal-case ${link}`}>Rename group</button>}
                      </>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <tbody>
                        {g.items.map((r, k) => {
                          const editing = edit?.id === r.id
                          return (
                            <tr key={r.id} className="border-t border-[#1a1716]/10">
                              <td className="w-[28%] p-3 pl-6">
                                {editing ? (
                                  <form onSubmit={(e) => { e.preventDefault(); saveItem(r) }} className="flex flex-wrap gap-2">
                                    <input autoFocus required maxLength={80} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} aria-label="Item name" className={inputCls} />
                                    <input list="cat-groups" maxLength={60} value={edit.group} onChange={(e) => setEdit({ ...edit, group: e.target.value })} aria-label="Group" placeholder="Group" className={inputCls} />
                                    <button type="submit" disabled={busy === r.id} className={btnCls}>Save</button>
                                    <button type="button" onClick={() => setEdit(null)} className={btnGhost}>Cancel</button>
                                  </form>
                                ) : r.name}
                              </td>
                              <td className="p-3 text-neutral-600">{r.products} product(s)</td>
                              <td className="p-3"><Showing state={r.state} /></td>
                              <td className="p-3">{statusSelect(r)}</td>
                              <td className="whitespace-nowrap p-3 text-right">
                                {!editing && (
                                  <>
                                    <button type="button" aria-label={`Move ${r.name} up`} disabled={k === 0 || busy === r.id} onClick={() => move(r, 'up')} className="mr-1 px-1.5 disabled:opacity-30">↑</button>
                                    <button type="button" aria-label={`Move ${r.name} down`} disabled={k === g.items.length - 1 || busy === r.id} onClick={() => move(r, 'down')} className="mr-4 px-1.5 disabled:opacity-30">↓</button>
                                    <button type="button" onClick={() => { setAdd((a) => ({ ...a, parent: s.id })); setEdit({ id: r.id, name: r.name, group: r.group }) }} className={`mr-4 ${link}`}>Edit</button>
                                    <button type="button" disabled={busy === r.id} onClick={() => remove(r)} className="text-red-700 underline underline-offset-4 hover:text-red-900">Delete</button>
                                  </>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}