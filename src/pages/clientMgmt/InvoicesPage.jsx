import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import { api } from '@/utils/authSession'
import { money, fmtDate, StatusBadge, Empty, Loading, label } from '@/components/clientMgmt/common'

const FILTERS = ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'void']

/** F-030: invoices list with outstanding / overdue / collected totals. */
const InvoicesPage = () => {
    const [rows, setRows] = useState(null)
    const [sum, setSum] = useState([])
    const [status, setStatus] = useState('')
    const [clients, setClients] = useState([])
    const [clientId, setClientId] = useState('')
    const load = () => {
        const q = new URLSearchParams(Object.entries({ status, client_id: clientId }).filter(([, v]) => v))
        api(`/api/invoices?${q}`).then(setRows).catch((e) => { setRows([]); toast.error(e.message) })
        api('/api/invoices/summary').then(setSum).catch(() => setSum([]))
    }
    useEffect(() => { api('/api/clients').then(setClients).catch(() => setClients([])) }, [])
    useEffect(() => { load() }, [status, clientId])
    return (
        <>
            <PageHeader><Link className="btn btn-sm btn-primary" to="/invoices/create">New invoice</Link></PageHeader>
            <div className="main-content">
                <div className="row">
                    {(sum.length ? sum : [{ currency: null, outstanding: 0, overdue: 0, paid_this_month: 0, open_invoices: 0 }]).map((s) => (
                        <React.Fragment key={s.currency || 'none'}>
                            <div className="col-md-4"><div className="card mb-3"><div className="card-body"><div className="fs-12 text-muted">Outstanding {s.currency && `(${s.currency})`}</div><div className="fs-20 fw-bold">{money(s.outstanding, s.currency)}</div><div className="fs-11 text-muted">{s.open_invoices} open invoice(s)</div></div></div></div>
                            <div className="col-md-4"><div className="card mb-3"><div className="card-body"><div className="fs-12 text-muted">Overdue</div><div className="fs-20 fw-bold text-danger">{money(s.overdue, s.currency)}</div></div></div></div>
                            <div className="col-md-4"><div className="card mb-3"><div className="card-body"><div className="fs-12 text-muted">Collected this month</div><div className="fs-20 fw-bold text-success">{money(s.paid_this_month, s.currency)}</div></div></div></div>
                        </React.Fragment>
                    ))}
                </div>
                <div className="card mb-3"><div className="card-body d-flex gap-2 flex-wrap">
                    <select className="form-select" style={{ maxWidth: 200 }} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{FILTERS.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
                    <select className="form-select" style={{ maxWidth: 260 }} value={clientId} onChange={(e) => setClientId(e.target.value)}><option value="">All clients</option>{clients.map((c) => <option key={c.client_id} value={c.client_id}>{c.company_name}</option>)}</select>
                </div></div>
                <div className="card"><div className="card-body p-0">
                    {rows === null ? <Loading /> : rows.length === 0 ? <Empty>No invoices.</Empty> : (
                        <div className="table-responsive"><table className="table mb-0">
                            <thead><tr><th>Number</th><th>Client</th><th>Issued</th><th>Due</th><th className="text-end">Total</th><th className="text-end">Balance</th><th>Status</th></tr></thead>
                            <tbody>{rows.map((i) => (
                                <tr key={i.invoice_id}>
                                    <td><Link to={`/invoices/view/${i.invoice_id}`}>{i.number}</Link></td>
                                    <td>{i.client?.company_name}</td><td>{fmtDate(i.issue_date)}</td><td>{fmtDate(i.due_date)}</td>
                                    <td className="text-end">{money(i.total, i.currency)}</td><td className="text-end">{money(i.balance, i.currency)}</td><td><StatusBadge status={i.display_status} /></td>
                                </tr>
                            ))}</tbody>
                        </table></div>
                    )}
                </div></div>
            </div>
            <Footer />
        </>
    )
}

export default InvoicesPage
