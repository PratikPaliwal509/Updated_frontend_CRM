import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import { api } from '@/utils/authSession'
import { money, fmtDate, Empty, Loading, label } from '@/components/clientMgmt/common'
import { PaymentForm } from './InvoiceViewPage'

/** Payments received, with a quick "record payment" against any open invoice. */
const PaymentsPage = () => {
    const [rows, setRows] = useState(null)
    const [open, setOpen] = useState([])
    const [pick, setPick] = useState('')
    const [range, setRange] = useState({ from: '', to: '' })
    const load = () => {
        const q = new URLSearchParams(Object.entries(range).filter(([, v]) => v))
        api(`/api/payments?${q}`).then(setRows).catch((e) => { setRows([]); toast.error(e.message) })
        Promise.all([api('/api/invoices?status=sent'), api('/api/invoices?status=partially_paid')]).then(([a, b]) => setOpen([...a, ...b])).catch(() => setOpen([]))
    }
    useEffect(() => { load() }, [range.from, range.to])
    const invoice = open.find((i) => String(i.invoice_id) === String(pick))
    const total = (rows || []).reduce((acc, p) => { acc[p.invoice.currency] = (acc[p.invoice.currency] || 0) + Number(p.amount); return acc }, {})
    return (
        <>
            <PageHeader />
            <div className="main-content">
                <div className="card mb-3"><div className="card-header"><h5 className="card-title mb-0">Record a payment</h5></div><div className="card-body">
                    <select className="form-select mb-3" style={{ maxWidth: 420 }} value={pick} onChange={(e) => setPick(e.target.value)}>
                        <option value="">Choose an open invoice</option>
                        {open.map((i) => <option key={i.invoice_id} value={i.invoice_id}>{i.number} · {i.client?.company_name} · balance {money(i.balance, i.currency)}</option>)}
                    </select>
                    {invoice && <PaymentForm key={invoice.invoice_id} invoice={invoice} onDone={() => { setPick(''); load() }} />}
                </div></div>
                <div className="card mb-3"><div className="card-body d-flex gap-2 align-items-center flex-wrap">
                    <span className="fs-12 text-muted">From</span><input type="date" className="form-control" style={{ maxWidth: 170 }} value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
                    <span className="fs-12 text-muted">to</span><input type="date" className="form-control" style={{ maxWidth: 170 }} value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
                    <span className="ms-auto fw-semibold">{Object.entries(total).map(([c, v]) => money(v, c)).join(' · ') || ''}</span>
                </div></div>
                <div className="card"><div className="card-body p-0">
                    {rows === null ? <Loading /> : rows.length === 0 ? <Empty>No payments recorded.</Empty> : (
                        <div className="table-responsive"><table className="table mb-0">
                            <thead><tr><th>Date</th><th>Invoice</th><th>Client</th><th>Method</th><th>Reference</th><th className="text-end">Amount</th></tr></thead>
                            <tbody>{rows.map((p) => (
                                <tr key={p.payment_id}><td>{fmtDate(p.paid_at)}</td><td><Link to={`/invoices/view/${p.invoice.invoice_id}`}>{p.invoice.number}</Link></td><td>{p.invoice.client?.company_name}</td><td className="text-capitalize">{label(p.method)}</td><td>{p.reference || '-'}</td><td className="text-end">{money(p.amount, p.invoice.currency)}</td></tr>
                            ))}</tbody>
                        </table></div>
                    )}
                </div></div>
            </div>
            <Footer />
        </>
    )
}

export default PaymentsPage
