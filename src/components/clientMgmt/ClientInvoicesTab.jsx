import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { api } from '@/utils/authSession'
import { Empty, Loading, StatusBadge, money, fmtDate } from './common'

/** Invoices and proposals of one client. */
const ClientInvoicesTab = ({ clientId }) => {
    const [inv, setInv] = useState(null)
    const [pro, setPro] = useState(null)
    useEffect(() => {
        api(`/api/invoices?client_id=${clientId}`).then(setInv).catch((e) => { setInv([]); if (e.status !== 403) toast.error(e.message) })
        api(`/api/proposals?client_id=${clientId}`).then(setPro).catch(() => setPro([]))
    }, [clientId])
    return (
        <div className="row">
            <div className="col-lg-7">
                <div className="card">
                    <div className="card-header d-flex justify-content-between align-items-center"><h5 className="card-title mb-0">Invoices</h5><Link className="btn btn-sm btn-primary" to={`/invoices/create?client_id=${clientId}`}>New invoice</Link></div>
                    <div className="card-body p-0">{inv === null ? <Loading /> : inv.length === 0 ? <Empty>No invoices yet.</Empty> : (
                        <table className="table mb-0"><thead><tr><th>Number</th><th>Date</th><th>Due</th><th className="text-end">Total</th><th className="text-end">Balance</th><th>Status</th></tr></thead>
                            <tbody>{inv.map((i) => <tr key={i.invoice_id}><td><Link to={`/invoices/view/${i.invoice_id}`}>{i.number}</Link></td><td>{fmtDate(i.issue_date)}</td><td>{fmtDate(i.due_date)}</td><td className="text-end">{money(i.total, i.currency)}</td><td className="text-end">{money(i.balance, i.currency)}</td><td><StatusBadge status={i.display_status} /></td></tr>)}</tbody></table>
                    )}</div>
                </div>
            </div>
            <div className="col-lg-5">
                <div className="card">
                    <div className="card-header d-flex justify-content-between align-items-center"><h5 className="card-title mb-0">Proposals</h5><Link className="btn btn-sm btn-light" to={`/proposal/create?client_id=${clientId}`}>New proposal</Link></div>
                    <div className="card-body p-0">{pro === null ? <Loading /> : pro.length === 0 ? <Empty>No proposals yet.</Empty> : (
                        <table className="table mb-0"><tbody>{pro.map((p) => <tr key={p.proposal_id}><td><Link to={`/proposal/view/${p.proposal_id}`}>{p.number}</Link><div className="fs-11 text-muted">{p.title}</div></td><td className="text-end">{money(p.total, p.currency)}</td><td><StatusBadge status={p.status} /></td></tr>)}</tbody></table>
                    )}</div>
                </div>
            </div>
        </div>
    )
}

export default ClientInvoicesTab
