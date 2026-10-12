import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import { api } from '@/utils/authSession'
import { money, fmtDate, fmtDateTime, StatusBadge, Loading, label } from '@/components/clientMgmt/common'
import { LeadForm, leadBody, useAgencyUsers, STAGES } from './LeadsPage'

/** Lead detail: edit, move stage, mark lost, convert to client, proposals. */
const LeadViewPage = () => {
    const { id } = useParams()
    const [params] = useSearchParams()
    const [lead, setLead] = useState(null)
    const [editing, setEditing] = useState(false)
    const [converting, setConverting] = useState(params.get('convert') === '1')
    const [clients, setClients] = useState([])
    const [conv, setConv] = useState({ mode: 'new', company_name: '', client_id: '' })
    const [busy, setBusy] = useState(false)
    const users = useAgencyUsers()
    const navigate = useNavigate()

    const load = () => api(`/api/leads/${id}`).then((l) => { setLead(l); setConv((c) => ({ ...c, company_name: l.company_name || l.name })) }).catch((e) => { toast.error(e.message); navigate('/leads/list') })
    useEffect(() => { load() }, [id])
    useEffect(() => { if (converting) api('/api/clients').then(setClients).catch(() => setClients([])) }, [converting])

    const run = async (fn, msg) => {
        setBusy(true)
        try { await fn(); if (msg) toast.success(msg); await load() } catch (e) { toast.error(e.message) } finally { setBusy(false) }
    }
    const save = (f) => run(async () => { await api(`/api/leads/${id}`, { method: 'PUT', body: leadBody(f) }); setEditing(false) }, 'Lead saved')
    const stage = (s) => {
        if (s === 'won') return setConverting(true)
        const lost_reason = s === 'lost' ? window.prompt('Why was this lead lost? (optional)') || undefined : undefined
        run(() => api(`/api/leads/${id}/stage`, { method: 'PATCH', body: { stage: s, lost_reason } }))
    }
    const convert = (e) => {
        e.preventDefault()
        run(async () => {
            const body = conv.mode === 'existing' ? { client_id: Number(conv.client_id) } : { company_name: conv.company_name }
            const l = await api(`/api/leads/${id}/convert`, { method: 'POST', body })
            setConverting(false)
            toast.success('Lead won - client ready')
            navigate(`/clients/view/${l.client.client_id}`)
        })
    }
    const remove = () => window.confirm('Delete this lead?') && run(async () => { await api(`/api/leads/${id}`, { method: 'DELETE' }); navigate('/leads/list') })

    if (!lead) return <Loading />
    return (
        <>
            <PageHeader>
                <div className="d-flex gap-2">
                    <Link className="btn btn-sm btn-light" to={`/proposal/create?lead_id=${lead.lead_id}`}>New proposal</Link>
                    {lead.stage !== 'won' && <button className="btn btn-sm btn-success" onClick={() => setConverting(true)}>Convert to client</button>}
                </div>
            </PageHeader>
            <div className="main-content">
                <div className="row">
                    <div className="col-lg-8">
                        <div className="card">
                            <div className="card-header d-flex justify-content-between align-items-center">
                                <h5 className="card-title mb-0">{lead.name} {lead.company_name && <span className="text-muted fw-normal">· {lead.company_name}</span>}</h5>
                                <StatusBadge status={lead.stage} />
                            </div>
                            <div className="card-body">
                                {editing ? (
                                    <LeadForm value={{ ...lead, owner_id: lead.owner?.user_id || '' }} users={users} onSubmit={save} onCancel={() => setEditing(false)} busy={busy} />
                                ) : (
                                    <>
                                        <dl className="row mb-0">
                                            <dt className="col-sm-3">Email</dt><dd className="col-sm-9">{lead.email ? <a href={`mailto:${lead.email}`}>{lead.email}</a> : '-'}</dd>
                                            <dt className="col-sm-3">Phone</dt><dd className="col-sm-9">{lead.phone || '-'}</dd>
                                            <dt className="col-sm-3">Source</dt><dd className="col-sm-9 text-capitalize">{label(lead.source)}</dd>
                                            <dt className="col-sm-3">Value</dt><dd className="col-sm-9">{lead.value != null ? money(lead.value, lead.currency) : '-'}</dd>
                                            <dt className="col-sm-3">Owner</dt><dd className="col-sm-9">{lead.owner?.full_name || '-'}</dd>
                                            <dt className="col-sm-3">Next follow-up</dt><dd className="col-sm-9">{fmtDate(lead.next_follow_up)}</dd>
                                            {lead.stage === 'lost' && <><dt className="col-sm-3">Lost reason</dt><dd className="col-sm-9">{lead.lost_reason || '-'}</dd></>}
                                            {lead.client && <><dt className="col-sm-3">Client</dt><dd className="col-sm-9"><Link to={`/clients/view/${lead.client.client_id}`}>{lead.client.company_name}</Link> (converted {fmtDateTime(lead.converted_at)})</dd></>}
                                            <dt className="col-sm-3">Notes</dt><dd className="col-sm-9" style={{ whiteSpace: 'pre-wrap' }}>{lead.notes || '-'}</dd>
                                        </dl>
                                        <div className="d-flex gap-2 mt-3">
                                            <button className="btn btn-sm btn-light" onClick={() => setEditing(true)}>Edit</button>
                                            {lead.stage !== 'won' && <button className="btn btn-sm btn-outline-danger" onClick={remove}>Delete</button>}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        {converting && lead.stage !== 'won' && (
                            <div className="card border-success">
                                <div className="card-header"><h5 className="card-title mb-0">Convert to client</h5></div>
                                <div className="card-body">
                                    <form onSubmit={convert}>
                                        <div className="d-flex gap-3 mb-3">
                                            <label className="d-flex gap-1 align-items-center"><input type="radio" checked={conv.mode === 'new'} onChange={() => setConv({ ...conv, mode: 'new' })} /> Create a new client</label>
                                            <label className="d-flex gap-1 align-items-center"><input type="radio" checked={conv.mode === 'existing'} onChange={() => setConv({ ...conv, mode: 'existing' })} /> Link to an existing client</label>
                                        </div>
                                        {conv.mode === 'new'
                                            ? <input className="form-control mb-3" value={conv.company_name} onChange={(e) => setConv({ ...conv, company_name: e.target.value })} placeholder="Client company name" required />
                                            : <select className="form-select mb-3" value={conv.client_id} onChange={(e) => setConv({ ...conv, client_id: e.target.value })} required><option value="">Choose a client</option>{clients.map((c) => <option key={c.client_id} value={c.client_id}>{c.company_name}</option>)}</select>}
                                        <p className="fs-12 text-muted">{lead.name} becomes a contact of the client, and this lead's proposals move to the client.</p>
                                        <button className="btn btn-success me-2" disabled={busy}>Convert</button>
                                        <button type="button" className="btn btn-light" onClick={() => setConverting(false)}>Cancel</button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="col-lg-4">
                        {lead.stage !== 'won' && (
                            <div className="card"><div className="card-header"><h5 className="card-title mb-0">Stage</h5></div><div className="card-body d-flex flex-wrap gap-2">
                                {STAGES.map((s) => <button key={s} className={`btn btn-sm text-capitalize ${lead.stage === s ? 'btn-primary' : 'btn-light'}`} disabled={busy || lead.stage === s} onClick={() => stage(s)}>{label(s)}</button>)}
                            </div></div>
                        )}
                        <div className="card"><div className="card-header"><h5 className="card-title mb-0">Proposals</h5></div><div className="card-body">
                            {lead.proposals.length === 0 ? <div className="text-muted fs-12">None yet.</div> : lead.proposals.map((p) => (
                                <div key={p.proposal_id} className="d-flex justify-content-between mb-2"><Link to={`/proposal/view/${p.proposal_id}`}>{p.number} · {p.title}</Link><StatusBadge status={p.status} /></div>
                            ))}
                        </div></div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    )
}

export default LeadViewPage
