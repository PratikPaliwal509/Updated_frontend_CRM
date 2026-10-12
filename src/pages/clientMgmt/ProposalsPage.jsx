import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import { api } from '@/utils/authSession'
import { money, fmtDate, StatusBadge, Empty, Loading } from '@/components/clientMgmt/common'

const STATUSES = ['draft', 'sent', 'accepted', 'declined', 'expired']

const ProposalsPage = () => {
    const [rows, setRows] = useState(null)
    const [status, setStatus] = useState('')
    const [q, setQ] = useState('')
    const load = () => api(`/api/proposals?${new URLSearchParams(Object.entries({ status, q }).filter(([, v]) => v))}`).then(setRows).catch((e) => { setRows([]); toast.error(e.message) })
    useEffect(() => { load() }, [status])
    return (
        <>
            <PageHeader><Link className="btn btn-sm btn-primary" to="/proposal/create">New proposal</Link></PageHeader>
            <div className="main-content">
                <div className="card mb-3"><div className="card-body d-flex gap-2 flex-wrap">
                    <form className="d-flex gap-2" onSubmit={(e) => { e.preventDefault(); load() }}><input className="form-control" placeholder="Search number or title" value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn btn-light">Search</button></form>
                    <select className="form-select" style={{ maxWidth: 180 }} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
                </div></div>
                <div className="card"><div className="card-body p-0">
                    {rows === null ? <Loading /> : rows.length === 0 ? <Empty>No proposals yet.</Empty> : (
                        <div className="table-responsive"><table className="table mb-0">
                            <thead><tr><th>Number</th><th>Title</th><th>For</th><th>Date</th><th>Valid until</th><th className="text-end">Total</th><th>Status</th></tr></thead>
                            <tbody>{rows.map((p) => (
                                <tr key={p.proposal_id}>
                                    <td><Link to={`/proposal/view/${p.proposal_id}`}>{p.number}</Link></td><td>{p.title}</td>
                                    <td>{p.client ? p.client.company_name : p.lead ? `${p.lead.name} (lead)` : '-'}</td>
                                    <td>{fmtDate(p.issue_date)}</td><td>{fmtDate(p.valid_until)}</td>
                                    <td className="text-end">{money(p.total, p.currency)}</td><td><StatusBadge status={p.status} /></td>
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

export default ProposalsPage
