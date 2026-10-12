import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import { api, cachedMe } from '@/utils/authSession'
import { downloadSalesPdf } from '@/utils/salesPdf'
import { money, fmtDate, fmtDateTime, StatusBadge, TotalsBox, Loading } from '@/components/clientMgmt/common'

const NEXT = { draft: ['sent'], sent: ['accepted', 'declined', 'expired', 'draft'], expired: ['sent', 'draft'], declined: ['draft'], accepted: [] }
const VERB = { sent: 'Mark as sent', accepted: 'Mark accepted', declined: 'Mark declined', expired: 'Mark expired', draft: 'Back to draft' }

const ProposalViewPage = () => {
    const { id } = useParams()
    const [p, setP] = useState(null)
    const [busy, setBusy] = useState(false)
    const navigate = useNavigate()
    const load = () => api(`/api/proposals/${id}`).then(setP).catch((e) => { toast.error(e.message); navigate('/proposal/list') })
    useEffect(() => { load() }, [id])
    const run = async (fn, msg) => { setBusy(true); try { await fn(); if (msg) toast.success(msg); await load() } catch (e) { toast.error(e.message) } finally { setBusy(false) } }

    if (!p) return <Loading />
    const editable = ['draft', 'sent', 'expired'].includes(p.status)
    return (
        <>
            <PageHeader>
                <div className="d-flex gap-2 flex-wrap">
                    <button className="btn btn-sm btn-light" onClick={() => downloadSalesPdf('proposal', p, cachedMe()?.workspace?.agency_name)}>Download PDF</button>
                    {editable && <Link className="btn btn-sm btn-light" to={`/proposal/edit/${p.proposal_id}`}>Edit</Link>}
                    {(NEXT[p.status] || []).map((s) => <button key={s} className="btn btn-sm btn-primary" disabled={busy} onClick={() => run(() => api(`/api/proposals/${id}/status`, { method: 'PATCH', body: { status: s } }), 'Status updated')}>{VERB[s]}</button>)}
                    {p.status === 'accepted' && p.invoices.length === 0 && <button className="btn btn-sm btn-success" disabled={busy} onClick={() => run(async () => { const inv = await api(`/api/proposals/${id}/invoice`, { method: 'POST', body: {} }); navigate(`/invoices/view/${inv.invoice_id}`) })}>Create invoice</button>}
                    {p.status === 'draft' && <button className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => window.confirm('Delete this draft?') && run(async () => { await api(`/api/proposals/${id}`, { method: 'DELETE' }); navigate('/proposal/list') })}>Delete</button>}
                </div>
            </PageHeader>
            <div className="main-content">
                <div className="card"><div className="card-body">
                    <div className="d-flex justify-content-between flex-wrap mb-4">
                        <div>
                            <h4 className="mb-1">{p.title}</h4>
                            <div className="text-muted">{p.number} · issued {fmtDate(p.issue_date)}{p.valid_until ? ` · valid until ${fmtDate(p.valid_until)}` : ''}</div>
                        </div>
                        <div className="text-end"><StatusBadge status={p.status} /><div className="fs-12 text-muted mt-1">{p.sent_at && `Sent ${fmtDateTime(p.sent_at)}`}{p.responded_at && ` · Answered ${fmtDateTime(p.responded_at)}`}</div></div>
                    </div>
                    <div className="mb-4">
                        <div className="fs-12 text-muted">For</div>
                        {p.client ? <Link to={`/clients/view/${p.client.client_id}`}>{p.client.company_name}</Link> : p.lead ? <Link to={`/leads/view/${p.lead.lead_id}`}>{p.lead.name} (lead)</Link> : '-'}
                    </div>
                    <table className="table">
                        <thead><tr><th>Description</th><th className="text-end">Qty</th><th className="text-end">Unit price</th><th className="text-end">Amount</th></tr></thead>
                        <tbody>{p.items.map((i) => <tr key={i.item_id}><td style={{ whiteSpace: 'pre-wrap' }}>{i.description}</td><td className="text-end">{Number(i.quantity)}</td><td className="text-end">{money(i.unit_price, p.currency)}</td><td className="text-end">{money(i.amount, p.currency)}</td></tr>)}</tbody>
                    </table>
                    <TotalsBox t={{ subtotal: p.subtotal, discount: p.discount, tax_amount: p.tax_amount, total: p.total }} currency={p.currency} taxRate={p.tax_rate} />
                    {p.notes && <div className="mt-4"><b>Notes</b><div style={{ whiteSpace: 'pre-wrap' }}>{p.notes}</div></div>}
                    {p.terms && <div className="mt-3"><b>Terms</b><div style={{ whiteSpace: 'pre-wrap' }}>{p.terms}</div></div>}
                    {p.invoices.length > 0 && <div className="mt-4 fs-12">Invoiced as {p.invoices.map((i) => <Link key={i.invoice_id} className="me-2" to={`/invoices/view/${i.invoice_id}`}>{i.number}</Link>)}</div>}
                </div></div>
            </div>
            <Footer />
        </>
    )
}

export default ProposalViewPage
