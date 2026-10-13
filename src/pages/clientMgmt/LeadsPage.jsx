import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import { api, loadMe } from '@/utils/authSession'
import { API_BASE_URL } from '../../config/api'
import { money, fmtDate, StatusBadge, Empty, Loading, label } from '@/components/clientMgmt/common'

export const STAGES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']
export const SOURCES = ['manual', 'website', 'website_chat', 'referral', 'meta_form', 'email', 'phone', 'event', 'other']

export const LeadForm = ({ value, users, onSubmit, onCancel, busy }) => {
    const [f, setF] = useState(value || { name: '', company_name: '', email: '', phone: '', source: 'manual', value: '', currency: '', owner_id: '', next_follow_up: '', notes: '' })
    const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
    return (
        <form className="row g-2" onSubmit={(e) => { e.preventDefault(); onSubmit(f) }}>
            <div className="col-md-4"><label className="form-label">Contact name</label><input className="form-control" value={f.name} onChange={set('name')} required /></div>
            <div className="col-md-4"><label className="form-label">Company</label><input className="form-control" value={f.company_name || ''} onChange={set('company_name')} /></div>
            <div className="col-md-4"><label className="form-label">Owner</label>
                <select className="form-select" value={f.owner_id || ''} onChange={set('owner_id')}><option value="">Me</option>{users.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name || u.email}</option>)}</select></div>
            <div className="col-md-4"><label className="form-label">Email</label><input type="email" className="form-control" value={f.email || ''} onChange={set('email')} /></div>
            <div className="col-md-4"><label className="form-label">Phone</label><input className="form-control" value={f.phone || ''} onChange={set('phone')} /></div>
            <div className="col-md-4"><label className="form-label">Source</label>
                <select className="form-select" value={f.source} onChange={set('source')}>{SOURCES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></div>
            <div className="col-md-3"><label className="form-label">Expected value</label><input type="number" min="0" step="0.01" className="form-control" value={f.value ?? ''} onChange={set('value')} /></div>
            <div className="col-md-2"><label className="form-label">Currency</label><input className="form-control text-uppercase" maxLength={3} placeholder="USD" value={f.currency || ''} onChange={set('currency')} /></div>
            <div className="col-md-3"><label className="form-label">Next follow-up</label><input type="date" className="form-control" value={f.next_follow_up ? String(f.next_follow_up).slice(0, 10) : ''} onChange={set('next_follow_up')} /></div>
            <div className="col-12"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={f.notes || ''} onChange={set('notes')} /></div>
            <div className="col-12 d-flex gap-2"><button className="btn btn-primary" disabled={busy}>Save lead</button>{onCancel && <button type="button" className="btn btn-light" onClick={onCancel}>Cancel</button>}</div>
        </form>
    )
}

export const leadBody = (f) => ({
    name: f.name, company_name: f.company_name, email: f.email, phone: f.phone, source: f.source, notes: f.notes,
    value: f.value === '' || f.value == null ? null : Number(f.value), currency: f.currency || undefined,
    owner_id: f.owner_id ? Number(f.owner_id) : undefined, next_follow_up: f.next_follow_up || null,
})

/** Active staff of the workspace (for owner pickers). */
export const useAgencyUsers = () => {
    const [users, setUsers] = useState([])
    useEffect(() => {
        loadMe().then(async (me) => {
            const res = await fetch(`${API_BASE_URL}/api/users/by-agency?agency_id=${me.user.agency_id}`)
            const j = await res.json().catch(() => ({}))
            setUsers((j.data || []).filter((u) => (u.user_type || 'staff') === 'staff' && u.is_active !== false))
        }).catch(() => setUsers([]))
    }, [])
    return users
}

/** F-031: leads pipeline (board + list). */
const LeadsPage = () => {
    const [rows, setRows] = useState(null)
    const [pipe, setPipe] = useState([])
    const [view, setView] = useState('board')
    const [filters, setFilters] = useState({ q: '', stage: '', source: '' })
    const [creating, setCreating] = useState(false)
    const [busy, setBusy] = useState(false)
    const users = useAgencyUsers()
    const navigate = useNavigate()

    const load = async () => {
        const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v))
        try {
            const [l, p] = await Promise.all([api(`/api/leads?${q}`), api('/api/leads/pipeline')])
            setRows(l); setPipe(p)
        } catch (e) { setRows([]); toast.error(e.message) }
    }
    useEffect(() => { load() }, [filters.stage, filters.source])

    const create = async (f) => {
        setBusy(true)
        try { const l = await api('/api/leads', { method: 'POST', body: leadBody(f) }); toast.success('Lead created'); setCreating(false); navigate(`/leads/view/${l.lead_id}`) } catch (e) { toast.error(e.message) } finally { setBusy(false) }
    }
    const move = async (lead, stage) => {
        if (stage === 'won') return navigate(`/leads/view/${lead.lead_id}?convert=1`)
        try { await api(`/api/leads/${lead.lead_id}/stage`, { method: 'PATCH', body: { stage } }); await load() } catch (e) { toast.error(e.message) }
    }

    return (
        <>
            <PageHeader>
                <div className="d-flex gap-2">
                    <div className="btn-group">
                        <button className={`btn btn-sm ${view === 'board' ? 'btn-primary' : 'btn-light'}`} onClick={() => setView('board')}>Board</button>
                        <button className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-light'}`} onClick={() => setView('list')}>List</button>
                    </div>
                    <button className="btn btn-sm btn-primary" onClick={() => setCreating(true)}>New lead</button>
                </div>
            </PageHeader>
            <div className="main-content">
                <div className="row">
                    {pipe.map((s) => (
                        <div className="col-6 col-md-4 col-xl-2" key={s.stage}>
                            <div className="card mb-3"><div className="card-body py-3">
                                <div className="fs-12 text-muted text-capitalize">{label(s.stage)}</div>
                                <div className="fs-18 fw-bold">{s.count}</div>
                                <div className="fs-11 text-muted">{money(s.value)}</div>
                            </div></div>
                        </div>
                    ))}
                </div>
                {creating && <div className="card mb-4"><div className="card-header"><h5 className="card-title mb-0">New lead</h5></div><div className="card-body"><LeadForm users={users} onSubmit={create} onCancel={() => setCreating(false)} busy={busy} /></div></div>}
                <div className="card mb-3"><div className="card-body d-flex gap-2 flex-wrap">
                    <form className="d-flex gap-2" onSubmit={(e) => { e.preventDefault(); load() }}>
                        <input className="form-control" placeholder="Search name, company, email" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
                        <button className="btn btn-light">Search</button>
                    </form>
                    <select className="form-select" style={{ maxWidth: 180 }} value={filters.stage} onChange={(e) => setFilters({ ...filters, stage: e.target.value })}><option value="">All stages</option>{STAGES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
                    <select className="form-select" style={{ maxWidth: 180 }} value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value })}><option value="">All sources</option>{SOURCES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
                </div></div>

                {rows === null ? <Loading /> : view === 'board' ? (
                    <div className="d-flex gap-3 overflow-auto pb-3">
                        {STAGES.filter((s) => !filters.stage || s === filters.stage).map((stage) => {
                            const col = rows.filter((l) => l.stage === stage)
                            return (
                                <div key={stage} style={{ minWidth: 260, flex: '1 0 260px' }}>
                                    <div className="d-flex justify-content-between mb-2"><b className="text-capitalize">{label(stage)}</b><span className="text-muted fs-12">{col.length}</span></div>
                                    {col.length === 0 && <div className="border rounded p-3 text-muted fs-12 text-center">Empty</div>}
                                    {col.map((l) => (
                                        <div key={l.lead_id} className="card mb-2"><div className="card-body p-3">
                                            <Link to={`/leads/view/${l.lead_id}`} className="fw-semibold d-block">{l.name}</Link>
                                            <div className="fs-12 text-muted">{l.company_name || '-'}</div>
                                            <div className="d-flex justify-content-between align-items-center mt-2">
                                                <span className="fs-12">{l.value != null ? money(l.value, l.currency) : ''}</span>
                                                {stage !== 'won' && (
                                                    <select className="form-select form-select-sm" style={{ width: 120 }} value={stage} onChange={(e) => move(l, e.target.value)} aria-label="Move to stage">
                                                        {STAGES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                                                    </select>
                                                )}
                                            </div>
                                            {l.next_follow_up && <div className="fs-11 text-muted mt-1">Follow up {fmtDate(l.next_follow_up)}</div>}
                                        </div></div>
                                    ))}
                                </div>
                            )
                        })}
                    </div>
                ) : rows.length === 0 ? <Empty>No leads yet.</Empty> : (
                    <div className="card"><div className="card-body p-0"><div className="table-responsive"><table className="table mb-0">
                        <thead><tr><th>Name</th><th>Company</th><th>Source</th><th>Owner</th><th className="text-end">Value</th><th>Follow-up</th><th>Stage</th></tr></thead>
                        <tbody>{rows.map((l) => (
                            <tr key={l.lead_id}>
                                <td><Link to={`/leads/view/${l.lead_id}`}>{l.name}</Link><div className="fs-11 text-muted">{l.email}</div></td>
                                <td>{l.company_name || '-'}</td><td className="text-capitalize">{label(l.source)}</td><td>{l.owner?.full_name || '-'}</td>
                                <td className="text-end">{l.value != null ? money(l.value, l.currency) : '-'}</td><td>{fmtDate(l.next_follow_up)}</td><td><StatusBadge status={l.stage} /></td>
                            </tr>
                        ))}</tbody>
                    </table></div></div></div>
                )}
            </div>
            <Footer />
        </>
    )
}

export default LeadsPage
