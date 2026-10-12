import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { api } from '@/utils/authSession'
import { Loading, StatusBadge, fmtDate } from './common'

/** F-021: per-client onboarding checklist; its progress sets the client's onboarding status. */
const ClientOnboardingTab = ({ clientId }) => {
    const [d, setD] = useState(null)
    const [title, setTitle] = useState('')
    const load = () => api(`/api/clients/${clientId}/onboarding`).then(setD).catch((e) => toast.error(e.message))
    useEffect(() => { load() }, [clientId])
    const run = async (p) => { try { setD(await p) } catch (e) { toast.error(e.message) } }

    if (!d) return <Loading />
    const pct = d.total ? Math.round((d.done / d.total) * 100) : 0
    return (
        <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">Onboarding checklist</h5>
                <span><StatusBadge status={d.status} /> <span className="fs-12 text-muted ms-2">{d.done} of {d.total} done</span></span>
            </div>
            <div className="card-body">
                <div className="progress mb-4" style={{ height: 6 }}><div className="progress-bar" style={{ width: `${pct}%` }} /></div>
                {d.items.map((it) => (
                    <div key={it.item_id} className="d-flex align-items-center justify-content-between border-bottom py-2">
                        <label className="d-flex align-items-center gap-2 mb-0">
                            <input type="checkbox" checked={!!it.done_at} onChange={() => run(api(`/api/client-onboarding/${it.item_id}`, { method: 'PATCH', body: { done: !it.done_at } }))} />
                            <span className={it.done_at ? 'text-decoration-line-through text-muted' : ''}>{it.title}</span>
                        </label>
                        <span className="fs-11 text-muted text-nowrap">
                            {it.done_at && `${it.done_by_user?.full_name || ''} · ${fmtDate(it.done_at)}`}
                            <button className="btn btn-link btn-sm text-danger p-0 ms-3" onClick={() => window.confirm('Remove this step?') && run(api(`/api/client-onboarding/${it.item_id}`, { method: 'DELETE' }))}>Remove</button>
                        </span>
                    </div>
                ))}
                <form className="d-flex gap-2 mt-3" onSubmit={(e) => { e.preventDefault(); run(api(`/api/clients/${clientId}/onboarding`, { method: 'POST', body: { title } })); setTitle('') }}>
                    <input className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a step, e.g. LinkedIn page access" required />
                    <button className="btn btn-primary text-nowrap">Add step</button>
                </form>
            </div>
        </div>
    )
}

export default ClientOnboardingTab
