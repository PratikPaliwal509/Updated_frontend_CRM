import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import { api, cachedMe } from '@/utils/authSession'
import { downloadSalesPdf } from '@/utils/salesPdf'
import { money, fmtDate, fmtDateTime, StatusBadge, TotalsBox, Loading, label, toInputDate } from '@/components/clientMgmt/common'

export const METHODS = ['bank_transfer', 'upi', 'card', 'cash', 'cheque', 'paypal', 'stripe', 'razorpay', 'other']

export const PaymentForm = ({ invoice, onDone }) => {
    const balance = Number(invoice.balance)
    const [f, setF] = useState({ amount: balance.toFixed(2), method: 'bank_transfer', reference: '', paid_at: toInputDate(new Date()), notes: '' })
    const [busy, setBusy] = useState(false)
    const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
    const submit = async (e) => {
        e.preventDefault()
        setBusy(true)
        try {
            await api('/api/payments', { method: 'POST', body: { invoice_id: invoice.invoice_id, amount: Number(f.amount), method: f.method, reference: f.reference, paid_at: f.paid_at, notes: f.notes } })
            toast.success('Payment recorded')
            onDone()
        } catch (err) { toast.error(err.message) } finally { setBusy(false) }
    }
    return (
        <form className="row g-2 align-items-end" onSubmit={submit}>
            <div className="col-md-2"><label className="form-label">Amount</label><input type="number" min="0.01" max={balance} step="0.01" className="form-control" value={f.amount} onChange={set('amount')} required /></div>
            <div className="col-md-2"><label className="form-label">Method</label><select className="form-select" value={f.method} onChange={set('method')}>{METHODS.map((m) => <option key={m} value={m}>{label(m)}</option>)}</select></div>
            <div className="col-md-3"><label className="form-label">Reference (UTR, cheque no.)</label><input className="form-control" value={f.reference} onChange={set('reference')} /></div>
            <div className="col-md-2"><label className="form-label">Date received</label><input type="date" className="form-control" value={f.paid_at} onChange={set('paid_at')} required /></div>
            <div className="col-md-3"><button className="btn btn-success w-100" disabled={busy}>Record payment</button></div>
            <div className="col-12 fs-11 text-muted">Records money you already received. No card or bank details are stored.</div>
        </form>
    )
}

const InvoiceViewPage = () => {
    const { id } = useParams()
    const [inv, setInv] = useState(null)
    const [paying, setPaying] = useState(false)
    const [busy, setBusy] = useState(false)
    const navigate = useNavigate()
    const load = () => api(`/api/invoices/${id}`).then(setInv).catch((e) => { toast.error(e.message); navigate('/invoices/list') })
    useEffect(() => { load() }, [id])
    const run = async (fn, msg) => { setBusy(true); try { await fn(); if (msg) toast.success(msg); await load() } catch (e) { toast.error(e.message) } finally { setBusy(false) } }
    const status = (s, confirmText) => (!confirmText || window.confirm(confirmText)) && run(() => api(`/api/invoices/${id}/status`, { method: 'PATCH', body: { status: s } }), 'Invoice updated')

    if (!inv) return <Loading />
    const c = inv.client
    return (
        <>
            <PageHeader>
                <div className="d-flex gap-2 flex-wrap">
                    <button className="btn btn-sm btn-light" onClick={() => downloadSalesPdf('invoice', inv, cachedMe()?.workspace?.agency_name)}>Download PDF</button>
                    {inv.status === 'draft' && <Link className="btn btn-sm btn-light" to={`/invoices/edit/${inv.invoice_id}`}>Edit</Link>}
                    {inv.status === 'draft' && <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => status('sent')}>Mark as sent</button>}
                    {['sent', 'partially_paid'].includes(inv.status) && <button className="btn btn-sm btn-success" onClick={() => setPaying(true)}>Record payment</button>}
                    {inv.status === 'sent' && inv.payments.length === 0 && <button className="btn btn-sm btn-light" disabled={busy} onClick={() => status('draft')}>Back to draft</button>}
                    {['draft', 'sent'].includes(inv.status) && inv.payments.length === 0 && <button className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => status('void', 'Void this invoice? Its time entries become billable again.')}>Void</button>}
                    {inv.status === 'draft' && <button className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => window.confirm('Delete this draft?') && run(async () => { await api(`/api/invoices/${id}`, { method: 'DELETE' }); navigate('/invoices/list') })}>Delete</button>}
                </div>
            </PageHeader>
            <div className="main-content">
                {paying && <div className="card mb-3"><div className="card-body"><PaymentForm invoice={inv} onDone={() => { setPaying(false); load() }} /></div></div>}
                <div className="card"><div className="card-body">
                    <div className="d-flex justify-content-between flex-wrap mb-4">
                        <div>
                            <h4 className="mb-1">Invoice {inv.number}</h4>
                            <div className="text-muted">Issued {fmtDate(inv.issue_date)} · due {fmtDate(inv.due_date)}{inv.proposal && <> · from <Link to={`/proposal/view/${inv.proposal.proposal_id}`}>{inv.proposal.number}</Link></>}</div>
                        </div>
                        <div className="text-end"><StatusBadge status={inv.display_status} /><div className="fs-12 text-muted mt-1">{inv.sent_at && `Sent ${fmtDateTime(inv.sent_at)}`}{inv.paid_at && ` · Paid ${fmtDate(inv.paid_at)}`}{inv.voided_at && ` · Voided ${fmtDateTime(inv.voided_at)}`}</div></div>
                    </div>
                    <div className="mb-4">
                        <div className="fs-12 text-muted">Bill to</div>
                        <Link to={`/clients/view/${c.client_id}`} className="fw-semibold">{c.company_name}</Link>
                        <div className="fs-12">{[c.billing_address || c.address, c.city, c.state, c.postal_code, c.country].filter(Boolean).join(', ')}</div>
                        <div className="fs-12">{c.billing_email}{c.tax_id && ` · Tax ID ${c.tax_id}`}</div>
                    </div>
                    <table className="table">
                        <thead><tr><th>Description</th><th className="text-end">Qty</th><th className="text-end">Unit price</th><th className="text-end">Amount</th></tr></thead>
                        <tbody>{inv.items.map((i) => <tr key={i.item_id}><td>{i.description}</td><td className="text-end">{Number(i.quantity)}</td><td className="text-end">{money(i.unit_price, inv.currency)}</td><td className="text-end">{money(i.amount, inv.currency)}</td></tr>)}</tbody>
                    </table>
                    <TotalsBox t={{ subtotal: inv.subtotal, discount: inv.discount, tax_amount: inv.tax_amount, total: inv.total }} currency={inv.currency} taxRate={inv.tax_rate} paid={inv.amount_paid} />
                    {inv.notes && <div className="mt-4"><b>Notes</b><div style={{ whiteSpace: 'pre-wrap' }}>{inv.notes}</div></div>}
                    {inv.terms && <div className="mt-3"><b>Payment terms</b><div style={{ whiteSpace: 'pre-wrap' }}>{inv.terms}</div></div>}
                </div></div>
                <div className="card"><div className="card-header"><h5 className="card-title mb-0">Payments</h5></div><div className="card-body p-0">
                    {inv.payments.length === 0 ? <div className="text-muted p-4">No payments recorded.</div> : (
                        <table className="table mb-0"><thead><tr><th>Date</th><th>Method</th><th>Reference</th><th>Recorded by</th><th className="text-end">Amount</th><th /></tr></thead>
                            <tbody>{inv.payments.map((p) => (
                                <tr key={p.payment_id}><td>{fmtDate(p.paid_at)}</td><td className="text-capitalize">{label(p.method)}</td><td>{p.reference || '-'}</td><td>{p.recorder?.full_name || '-'}</td><td className="text-end">{money(p.amount, inv.currency)}</td>
                                    <td className="text-end"><button className="btn btn-sm btn-link text-danger" onClick={() => window.confirm('Delete this payment?') && run(() => api(`/api/payments/${p.payment_id}`, { method: 'DELETE' }), 'Payment deleted')}>Delete</button></td></tr>
                            ))}</tbody></table>
                    )}
                </div></div>
            </div>
            <Footer />
        </>
    )
}

export default InvoiceViewPage
