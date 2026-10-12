import React from 'react'

/** Shared bits for the Client Management screens (leads, proposals, invoices, client tabs). */
export const money = (v, currency) => {
    const n = Number(v || 0)
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(n)
    } catch {
        return `${n.toFixed(2)} ${currency || ''}`.trim()
    }
}
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '-')
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : '-')
export const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '')

const BADGES = {
    draft: 'bg-soft-secondary text-muted', sent: 'bg-soft-primary text-primary', accepted: 'bg-soft-success text-success',
    declined: 'bg-soft-danger text-danger', expired: 'bg-soft-warning text-warning', paid: 'bg-soft-success text-success',
    partially_paid: 'bg-soft-warning text-warning', overdue: 'bg-soft-danger text-danger', void: 'bg-soft-secondary text-muted',
    new: 'bg-soft-primary text-primary', contacted: 'bg-soft-info text-info', qualified: 'bg-soft-warning text-warning',
    proposal: 'bg-soft-teal text-teal', won: 'bg-soft-success text-success', lost: 'bg-soft-danger text-danger',
    pending: 'bg-soft-secondary text-muted', in_progress: 'bg-soft-warning text-warning', completed: 'bg-soft-success text-success',
}
export const label = (s) => String(s || '').replace(/_/g, ' ')
export const StatusBadge = ({ status }) => <span className={`badge text-capitalize ${BADGES[status] || 'bg-soft-secondary text-muted'}`}>{label(status)}</span>

export const Empty = ({ children }) => <div className="text-muted text-center py-5">{children}</div>
export const Loading = () => <div className="text-muted text-center py-5">Loading...</div>

/** Line-item editor shared by proposals and invoices. */
export const LineItemsEditor = ({ items, onChange, currency }) => {
    const set = (i, k, v) => onChange(items.map((it, j) => (j === i ? { ...it, [k]: v } : it)))
    const amount = (it) => Math.round(Number(it.quantity || 0) * Number(it.unit_price || 0) * 100) / 100
    return (
        <div className="table-responsive">
            <table className="table mb-2">
                <thead><tr><th style={{ width: '50%' }}>Description</th><th style={{ width: 110 }}>Qty</th><th style={{ width: 150 }}>Unit price</th><th className="text-end">Amount</th><th /></tr></thead>
                <tbody>
                    {items.map((it, i) => (
                        <tr key={i}>
                            <td><input className="form-control" value={it.description} onChange={(e) => set(i, 'description', e.target.value)} placeholder="What is being delivered" required /></td>
                            <td><input className="form-control" type="number" min="0.01" step="0.01" value={it.quantity} onChange={(e) => set(i, 'quantity', e.target.value)} required /></td>
                            <td><input className="form-control" type="number" min="0" step="0.01" value={it.unit_price} onChange={(e) => set(i, 'unit_price', e.target.value)} required /></td>
                            <td className="text-end align-middle">{money(amount(it), currency)}</td>
                            <td className="align-middle">{items.length > 0 && <button type="button" className="btn btn-sm btn-light" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove line">×</button>}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <button type="button" className="btn btn-sm btn-light" onClick={() => onChange([...items, { description: '', quantity: 1, unit_price: 0 }])}>+ Add line</button>
        </div>
    )
}

/** Same maths as the server (cents) - for the live preview only; the server recalculates. */
export const previewTotals = (items, discount, taxRate) => {
    const c = (v) => Math.round(Number(v || 0) * 100)
    const sub = items.reduce((s, it) => s + Math.round(Number(it.quantity || 0) * c(it.unit_price)), 0)
    const disc = Math.min(c(discount), sub)
    const tax = Math.round(((sub - disc) * Number(taxRate || 0)) / 100)
    return { subtotal: sub / 100, discount: disc / 100, tax: tax / 100, total: (sub - disc + tax) / 100 }
}

export const TotalsBox = ({ t, currency, taxRate, paid }) => (
    <table className="table table-sm mb-0 ms-auto" style={{ maxWidth: 320 }}>
        <tbody>
            <tr><td>Subtotal</td><td className="text-end">{money(t.subtotal, currency)}</td></tr>
            {Number(t.discount) > 0 && <tr><td>Discount</td><td className="text-end">- {money(t.discount, currency)}</td></tr>}
            <tr><td>Tax ({Number(taxRate || 0)}%)</td><td className="text-end">{money(t.tax ?? t.tax_amount, currency)}</td></tr>
            <tr className="fw-bold"><td>Total</td><td className="text-end">{money(t.total, currency)}</td></tr>
            {paid !== undefined && <tr><td>Paid</td><td className="text-end">{money(paid, currency)}</td></tr>}
            {paid !== undefined && <tr className="fw-bold"><td>Balance due</td><td className="text-end">{money(Number(t.total) - Number(paid), currency)}</td></tr>}
        </tbody>
    </table>
)
