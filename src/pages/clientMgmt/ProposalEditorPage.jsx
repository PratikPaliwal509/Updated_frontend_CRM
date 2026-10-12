import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import { api } from '@/utils/authSession'
import { LineItemsEditor, previewTotals, TotalsBox, toInputDate, Loading } from '@/components/clientMgmt/common'

/** Create / edit a proposal (for a client or a lead). */
const ProposalEditorPage = () => {
    const { id } = useParams()
    const [params] = useSearchParams()
    const navigate = useNavigate()
    const [clients, setClients] = useState([])
    const [leads, setLeads] = useState([])
    const [f, setF] = useState(null)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        api('/api/clients').then(setClients).catch(() => setClients([]))
        api('/api/leads').then((l) => setLeads(l.filter((x) => x.stage !== 'won' && x.stage !== 'lost'))).catch(() => setLeads([]))
        if (id) {
            api(`/api/proposals/${id}`).then((p) => setF({
                title: p.title, client_id: p.client?.client_id || '', lead_id: p.lead?.lead_id || '', currency: p.currency,
                valid_until: toInputDate(p.valid_until), discount: Number(p.discount), tax_rate: Number(p.tax_rate), notes: p.notes || '', terms: p.terms || '',
                items: p.items.map((i) => ({ description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price) })),
            })).catch((e) => { toast.error(e.message); navigate('/proposal/list') })
        } else {
            setF({ title: '', client_id: params.get('client_id') || '', lead_id: params.get('lead_id') || '', currency: '', valid_until: '', discount: 0, tax_rate: 0, notes: '', terms: '', items: [{ description: '', quantity: 1, unit_price: 0 }] })
            // default to the workspace currency (Settings > Workspace)
            api('/api/workspace').then((w) => w.currency && setF((x) => (x && !x.currency ? { ...x, currency: String(w.currency).toUpperCase().slice(0, 3) } : x))).catch(() => {})
        }
    }, [id])

    if (!f) return <Loading />
    const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
    const t = previewTotals(f.items, f.discount, f.tax_rate)
    const submit = async (e) => {
        e.preventDefault()
        setBusy(true)
        try {
            const body = {
                title: f.title, client_id: f.client_id ? Number(f.client_id) : null, lead_id: f.lead_id ? Number(f.lead_id) : null,
                currency: f.currency || undefined, valid_until: f.valid_until || null, discount: Number(f.discount || 0), tax_rate: Number(f.tax_rate || 0),
                notes: f.notes, terms: f.terms, items: f.items.map((i) => ({ description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price) })),
            }
            const p = id ? await api(`/api/proposals/${id}`, { method: 'PUT', body }) : await api('/api/proposals', { method: 'POST', body })
            toast.success('Proposal saved')
            navigate(`/proposal/view/${p.proposal_id}`)
        } catch (err) { toast.error(err.message) } finally { setBusy(false) }
    }

    return (
        <>
            <PageHeader />
            <div className="main-content">
                <form onSubmit={submit}>
                    <div className="card"><div className="card-header"><h5 className="card-title mb-0">{id ? 'Edit proposal' : 'New proposal'}</h5></div>
                        <div className="card-body">
                            <div className="row g-3 mb-3">
                                <div className="col-md-6"><label className="form-label">Title</label><input className="form-control" value={f.title} onChange={set('title')} required /></div>
                                <div className="col-md-3"><label className="form-label">Client</label>
                                    <select className="form-select" value={f.client_id} onChange={set('client_id')}><option value="">-</option>{clients.map((c) => <option key={c.client_id} value={c.client_id}>{c.company_name}</option>)}</select></div>
                                <div className="col-md-3"><label className="form-label">or Lead</label>
                                    <select className="form-select" value={f.lead_id} onChange={set('lead_id')}><option value="">-</option>{leads.map((l) => <option key={l.lead_id} value={l.lead_id}>{l.name}{l.company_name ? ` (${l.company_name})` : ''}</option>)}</select></div>
                                <div className="col-md-2"><label className="form-label">Currency</label><input className="form-control text-uppercase" maxLength={3} placeholder="Workspace" value={f.currency} onChange={set('currency')} /></div>
                                <div className="col-md-3"><label className="form-label">Valid until</label><input type="date" className="form-control" value={f.valid_until} onChange={set('valid_until')} /></div>
                                <div className="col-md-2"><label className="form-label">Discount</label><input type="number" min="0" step="0.01" className="form-control" value={f.discount} onChange={set('discount')} /></div>
                                <div className="col-md-2"><label className="form-label">Tax %</label><input type="number" min="0" max="100" step="0.01" className="form-control" value={f.tax_rate} onChange={set('tax_rate')} /></div>
                            </div>
                            <LineItemsEditor items={f.items} onChange={(items) => setF({ ...f, items })} currency={f.currency || undefined} />
                            <TotalsBox t={t} currency={f.currency || undefined} taxRate={f.tax_rate} />
                            <div className="row g-3 mt-2">
                                <div className="col-md-6"><label className="form-label">Notes (shown on the proposal)</label><textarea className="form-control" rows={3} value={f.notes} onChange={set('notes')} /></div>
                                <div className="col-md-6"><label className="form-label">Terms</label><textarea className="form-control" rows={3} value={f.terms} onChange={set('terms')} /></div>
                            </div>
                        </div>
                        <div className="card-footer d-flex gap-2"><button className="btn btn-primary" disabled={busy}>Save proposal</button><button type="button" className="btn btn-light" onClick={() => navigate(-1)}>Cancel</button></div>
                    </div>
                </form>
            </div>
            <Footer />
        </>
    )
}

export default ProposalEditorPage
