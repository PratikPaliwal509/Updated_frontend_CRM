import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import PerfectScrollbar from 'react-perfect-scrollbar'
import Footer from '@/components/shared/Footer'
import { api, loadMe } from '@/utils/authSession'
import { API_BASE_URL } from '../../config/api'
import { fmtDateTime, Empty, Loading } from '@/components/clientMgmt/common'

const PAGE = 50
const blank = { q: '', user_id: '', entity_type: '', action: '', from: '', to: '' }

/** F-037: workspace activity / audit log (Settings). Filters, paging, CSV export. */
const ActivityLogPage = () => {
    const [f, setF] = useState(blank)
    const [applied, setApplied] = useState(blank)
    const [offset, setOffset] = useState(0)
    const [data, setData] = useState(null)
    const [total, setTotal] = useState(0)
    const [facets, setFacets] = useState({ entity_types: [], actions: [] })
    const [users, setUsers] = useState([])
    const qs = (extra = {}) => new URLSearchParams(Object.entries({ ...applied, ...extra }).filter(([, v]) => v !== '' && v !== undefined)).toString()

    useEffect(() => {
        api('/api/activityLogs/facets').then(setFacets).catch(() => {})
        loadMe().then(async (me) => {
            const r = await fetch(`${API_BASE_URL}/api/users/by-agency?agency_id=${me.user.agency_id}`)
            const j = await r.json().catch(() => ({}))
            setUsers(j.data || [])
        }).catch(() => {})
    }, [])
    useEffect(() => {
        setData(null)
        fetch(`${API_BASE_URL}/api/activityLogs?${qs({ limit: PAGE, offset })}`).then(async (r) => {
            const j = await r.json().catch(() => ({}))
            if (!r.ok) throw new Error(j.message || 'Could not load the activity log')
            setData(j.data || []); setTotal(j.total || 0)
        }).catch((e) => { setData([]); toast.error(e.message) })
    }, [applied, offset])

    const exportCsv = async () => {
        try {
            const r = await fetch(`${API_BASE_URL}/api/activityLogs/export?${qs()}`)
            if (!r.ok) throw new Error('Export failed')
            const blob = await r.blob()
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = `activity-log-${new Date().toISOString().slice(0, 10)}.csv`
            a.click()
            URL.revokeObjectURL(a.href)
        } catch (e) { toast.error(e.message) }
    }
    const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

    return (
        <div className="content-area">
            <PerfectScrollbar>
                <div className="page-header">
                    <div className="page-header-left"><h5 className="m-b-10 mb-0">Activity log</h5></div>
                    <div className="page-header-right ms-auto"><button className="btn btn-sm btn-light" onClick={exportCsv}>Export CSV</button></div>
                </div>
                <div className="content-area-body">
                    <form className="card mb-3" onSubmit={(e) => { e.preventDefault(); setOffset(0); setApplied(f) }}>
                        <div className="card-body row g-2 align-items-end">
                            <div className="col-md-3"><label className="form-label">Search</label><input className="form-control" value={f.q} onChange={set('q')} placeholder="Name, action, person" /></div>
                            <div className="col-md-2"><label className="form-label">Person</label>
                                <select className="form-select" value={f.user_id} onChange={set('user_id')}><option value="">Anyone</option>{users.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name || u.email}</option>)}</select></div>
                            <div className="col-md-2"><label className="form-label">Record type</label>
                                <select className="form-select" value={f.entity_type} onChange={set('entity_type')}><option value="">All</option>{facets.entity_types.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                            <div className="col-md-2"><label className="form-label">Action</label>
                                <select className="form-select" value={f.action} onChange={set('action')}><option value="">All</option>{facets.actions.map((t) => <option key={t} value={t}>{t.toLowerCase()}</option>)}</select></div>
                            <div className="col-md-1"><label className="form-label">From</label><input type="date" className="form-control" value={f.from} onChange={set('from')} /></div>
                            <div className="col-md-1"><label className="form-label">To</label><input type="date" className="form-control" value={f.to} onChange={set('to')} /></div>
                            <div className="col-md-1 d-flex gap-1"><button className="btn btn-primary">Filter</button></div>
                        </div>
                    </form>
                    <div className="card mb-0">
                        <div className="card-body p-0">
                            {data === null ? <Loading /> : data.length === 0 ? <Empty>No activity matches.</Empty> : (
                                <div className="table-responsive"><table className="table mb-0">
                                    <thead><tr><th>When</th><th>Person</th><th>Action</th><th>Record</th><th>IP address</th></tr></thead>
                                    <tbody>{data.map((r) => (
                                        <tr key={r.log_id}>
                                            <td className="text-nowrap">{fmtDateTime(r.created_at)}</td>
                                            <td>{r.user_name || r.user_email || '-'}</td>
                                            <td className="text-capitalize">{String(r.action).toLowerCase()}</td>
                                            <td>{r.entity_type}{r.entity_name ? `: ${r.entity_name}` : ` #${r.entity_id}`}</td>
                                            <td>{r.ip_address || '-'}</td>
                                        </tr>
                                    ))}</tbody>
                                </table></div>
                            )}
                        </div>
                        <div className="card-footer d-flex justify-content-between align-items-center">
                            <span className="fs-12 text-muted">{total ? `${offset + 1}-${Math.min(offset + PAGE, total)} of ${total}` : ''}</span>
                            <span>
                                <button className="btn btn-sm btn-light me-2" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Newer</button>
                                <button className="btn btn-sm btn-light" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>Older</button>
                            </span>
                        </div>
                    </div>
                </div>
                <Footer />
            </PerfectScrollbar>
        </div>
    )
}

export default ActivityLogPage
