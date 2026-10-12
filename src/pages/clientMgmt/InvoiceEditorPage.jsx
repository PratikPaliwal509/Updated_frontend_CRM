import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import { api } from '@/utils/authSession'
import { LineItemsEditor, previewTotals, TotalsBox, toInputDate, money, fmtDate, Loading } from '@/components/clientMgmt/common'

/** Create an invoice from billable time and/or manual lines; edit drafts. */
const InvoiceEditorPage = () => {
    const { id } = useParams()
    const [params] = useSearchParams()
    const navigate = useNavigate()
    const [clients, setClients] = useState([])
    const [f, setF] = useState(null)
    const [billable, setBillable] = useState([])
    const [picked, setPicked] = useState({})
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        api('/api/clients').then(setClients).catch(() => setClients([]))
        if (id) {
            api(`/api/invoices/${id}`).then((i) => {
                if (i.status !== 'draft') { toast.info('Only draft invoices can be edited'); return navigate(`/invoices/view/${id}`) }
                setF({ client_id: i.client.client_id, currency: i.currency, issue_date: toInputDate(i.issue_date), due_date: toInputDate(i.due_date), discount: Number(i.discount), tax_rate: Number(i.tax_rate), notes: i.notes || '', terms: i.terms || '', items: i.items.map((x) => ({ description: x.description, quantity: Number(x.quantity), unit_price: Number(x.unit_price), project_id: x.project_id })) })
            }).catch((e) => { toast.error(e.message); navigate('/invoices/list') })
        } else {
            setF({ client_id: params.get('client_id') || '', currency: '', issue_date: toInputDate(new Date()), due_date: '', discount: 0, tax_rate: 0, notes: '', terms: '', items: [] })
            // default to the workspace currency (Settings > Workspace)
            api('/api/workspace').then((w) => w.currency && setF((x) => (x && !x.currency ? { ...x, currency: String(w.currency).toUpperCase().slice(0, 3) } : x))).catch(() => {})
        }
    }, [id])

    useEffect(() => {
        if (id || !f?.client_id) { setBillable([]); return }
        api(`/api/invoices/billable?client_id=${f.client_id}`).then((b) => {
            setBillable(b)
            setPicked(Object.fromEntries(b.flatMap((p) => p.logs.map((l) => [l.log_id, true]))))
        }).catch(() => setBillable([]))
    }, [f?.client_id, id])

    if (!f) return <Loading />
    const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
    const timeLines = billable.map((p) => {
        const logs = p.logs.filter((l) => picked[l.log_id])
        const amount = logs.reduce((s, l) => s + Math.round((l.minutes / 60) * Math.round(l.rate * 100)), 0) / 100
        return { project: p, logs, amount, hours: Math.round(logs.reduce((s, l) => s + l.minutes, 0) / 60 * 100) / 100 }
    }).filter((x) => x.logs.length)
    const preview = previewTotals([...timeLines.map((x) => ({ quantity: 1, unit_price: x.amount })), ...f.items], f.discount, f.tax_rate)

    const submit = async (e) => {
        e.preventDefault()
        setBusy(true)
        try {
            const items = f.items.filter((i) => i.description).map((i) => ({ description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price), project_id: i.project_id }))
            const common = { currency: f.currency || undefined, issue_date: f.issue_date || undefined, due_date: f.due_date || undefined, discount: Number(f.discount || 0), tax_rate: Number(f.tax_rate || 0), notes: f.notes, terms: f.terms }
            const inv = id
                ? await api(`/api/invoices/${id}`, { method: 'PUT', body: { ...common, items } })
                : await api('/api/invoices', { method: 'POST', body: { ...common, client_id: Number(f.client_id), items, time_log_ids: timeLines.flatMap((x) => x.logs.map((l) => l.log_id)) } })
            toast.success('Invoice saved')
            navigate(`/invoices/view/${inv.invoice_id}`)
        } catch (err) { toast.error(err.message) } finally { setBusy(false) }
    }

    return (
        <>
            <PageHeader />
            <div className="main-content">
                <form onSubmit={submit}>
                    <div className="card"><div className="card-header"><h5 className="card-title mb-0">{id ? 'Edit draft invoice' : 'New invoice'}</h5></div>
                        <div className="card-body">
                            <div className="row g-3 mb-4">
                                <div className="col-md-4"><label className="form-label">Client</label>
                                    <select className="form-select" value={f.client_id} onChange={set('client_id')} required disabled={!!id}><option value="">Choose a client</option>{clients.map((c) => <option key={c.client_id} value={c.client_id}>{c.company_name}</option>)}</select></div>
                                <div className="col-md-2"><label className="form-label">Currency</label><input className="form-control text-uppercase" maxLength={3} placeholder="Workspace" value={f.currency} onChange={set('currency')} /></div>
                                <div className="col-md-2"><label className="form-label">Issue date</label><input type="date" className="form-control" value={f.issue_date} onChange={set('issue_date')} /></div>
                                <div className="col-md-2"><label className="form-label">Due date</label><input type="date" className="form-control" value={f.due_date} onChange={set('due_date')} placeholder="Payment terms" /></div>
                                <div className="col-md-1"><label className="form-label">Discount</label><input type="number" min="0" step="0.01" className="form-control" value={f.discount} onChange={set('discount')} /></div>
                                <div className="col-md-1"><label className="form-label">Tax %</label><input type="number" min="0" max="100" step="0.01" className="form-control" value={f.tax_rate} onChange={set('tax_rate')} /></div>
                            </div>
                            {!id && f.client_id && (
                                <div className="mb-4">
                                    <h6>Billable time (approved, not yet invoiced)</h6>
                                    {billable.length === 0 ? <div className="text-muted fs-12">No billable time for this client.</div> : billable.map((p) => (
                                        <details key={p.project_id} className="border rounded p-2 mb-2" open>
                                            <summary><b>{p.project_name}</b> · {p.hours} h · {money(p.amount, f.currency || undefined)}</summary>
                                            {p.logs.map((l) => (
                                                <label key={l.log_id} className="d-flex gap-2 fs-12 mt-1">
                                                    <input type="checkbox" checked={!!picked[l.log_id]} onChange={(e) => setPicked({ ...picked, [l.log_id]: e.target.checked })} />
                                                    {fmtDate(l.date)} · {l.user || '-'} · {l.task || '-'} · {Math.round(l.minutes / 6) / 10} h @ {l.rate}
                                                </label>
                                            ))}
                                        </details>
                                    ))}
                                </div>
                            )}
                            <h6>{id ? 'Lines' : 'Other lines'}</h6>
                            <LineItemsEditor items={f.items} onChange={(items) => setF({ ...f, items })} currency={f.currency || undefined} />
                            <TotalsBox t={preview} currency={f.currency || undefined} taxRate={f.tax_rate} />
                            <div className="row g-3 mt-2">
                                <div className="col-md-6"><label className="form-label">Notes</label><textarea className="form-control" rows={3} value={f.notes} onChange={set('notes')} /></div>
                                <div className="col-md-6"><label className="form-label">Payment terms / bank details</label><textarea className="form-control" rows={3} value={f.terms} onChange={set('terms')} /></div>
                            </div>
                            {!f.due_date && !id && <div className="fs-11 text-muted mt-2">Leave the due date empty to use the client's payment terms.</div>}
                        </div>
                        <div className="card-footer d-flex gap-2"><button className="btn btn-primary" disabled={busy}>Save as draft</button><button type="button" className="btn btn-light" onClick={() => navigate(-1)}>Cancel</button></div>
                    </div>
                </form>
            </div>
            <Footer />
        </>
    )
}

export default InvoiceEditorPage
