import React, { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'
import { FiCheck, FiX } from 'react-icons/fi'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import { AdAccountPicker, AdConnectHint, useAdAccounts } from '@/components/meta/AdAccountPicker'
import { adsApi, formatMoney } from '@/components/meta/adsApi'

/**
 * Meta Ads change log + approvals (F-090 / F-092): who changed what in the ad account, the values
 * before and after, and whether Meta accepted it. Approvers apply or reject pending requests.
 */
const STATUS = {
    applied: ['bg-soft-success text-success', 'Applied'],
    failed: ['bg-soft-danger text-danger', 'Failed'],
    pending: ['bg-soft-warning text-warning', 'Waiting for approval'],
    applying: ['bg-soft-info text-info', 'Applying'],
    rejected: ['bg-soft-secondary text-secondary', 'Rejected'],
}
const ACTION = { create: 'Created', update: 'Edited', status: 'Status', delete: 'Deleted' }
const TYPE = { campaign: 'Campaign', adset: 'Ad set', ad: 'Ad', creative: 'Creative', image: 'Image', video: 'Video' }

const describe = (c) => {
    const out = []
    const a = c.after || {}
    const b = c.before || {}
    if (a.status && a.status !== b.status) out.push(`status ${b.status ? `${b.status.toLowerCase()} → ` : ''}${a.status.toLowerCase()}`)
    if (a.name && b.name && a.name !== b.name) out.push(`name "${b.name}" → "${a.name}"`)
    for (const [k, m] of Object.entries(c.amounts || {})) {
        if (m.after !== null && m.after !== undefined) out.push(`${k.replace(/_/g, ' ')} ${m.before !== null && m.before !== undefined ? `${formatMoney(m.before, m.currency)} → ` : ''}${formatMoney(m.after, m.currency)}`)
    }
    return out.join(' · ')
}

const AdChangesPage = () => {
    const ads = useAdAccounts()
    const [status, setStatus] = useState('')
    const [rows, setRows] = useState([])
    const [next, setNext] = useState(null)
    const [canApprove, setCanApprove] = useState(false)
    const [loading, setLoading] = useState(false)

    const load = useCallback(async (cursor) => {
        if (!ads.selected) return
        setLoading(true)
        try {
            const q = new URLSearchParams({ limit: '50' })
            if (status) q.set('status', status)
            if (cursor) q.set('before', cursor)
            const r = await adsApi(`/api/meta-ads/changes?${q}`)
            setRows((prev) => (cursor ? [...prev, ...r.data] : r.data))
            setNext(r.has_more ? r.next : null)
            setCanApprove(!!r.can_approve)
        } catch (e) {
            toast.error(e.message)
        } finally {
            setLoading(false)
        }
    }, [ads.selected, status])
    useEffect(() => { load(null) }, [load])

    const decide = async (c, approve) => {
        let note
        if (!approve) {
            const r = await Swal.fire({ title: 'Reject this change?', input: 'text', inputPlaceholder: 'Reason (optional)', showCancelButton: true, confirmButtonText: 'Reject', confirmButtonColor: '#d33' })
            if (!r.isConfirmed) return
            note = r.value
        }
        try {
            const r = await adsApi(`/api/meta-ads/changes/${c.change_id}/${approve ? 'approve' : 'reject'}`, { method: 'POST', body: { note } })
            if (r.data.status === 'failed') toast.error(`Approved, but Meta refused it: ${r.data.error}`)
            else toast.success(approve ? 'Change approved and applied' : 'Change rejected')
            load(null)
        } catch (e) {
            toast.error(e.message)
        }
    }

    return (
        <>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 flex-wrap justify-content-end">
                    <AdAccountPicker accounts={ads.accounts} selected={ads.selected} onChange={(id) => ads.setSelected(id)} />
                    <select className="form-select form-select-sm w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status filter" data-testid="changes-status">
                        <option value="">All changes</option>
                        <option value="pending">Waiting for approval</option>
                        <option value="applied">Applied</option>
                        <option value="failed">Failed</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
            </PageHeader>
            <div className="main-content">
                <div className="row">
                    {!ads.loading && (ads.notConnected || ads.error) ? <AdConnectHint error={ads.error} /> : (
                        <div className="col-12">
                            <div className="card">
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0" data-testid="changes-table">
                                        <thead><tr><th>When</th><th>Who</th><th>What</th><th>Change</th><th>Result</th>{canApprove && <th className="text-end">Approval</th>}</tr></thead>
                                        <tbody>
                                            {!loading && rows.length === 0 && <tr><td colSpan={6} className="text-center text-muted py-4">No changes yet</td></tr>}
                                            {rows.map((c) => {
                                                const [cls, text] = STATUS[c.status] || STATUS.applied
                                                return (
                                                    <tr key={c.change_id} data-testid="change-row">
                                                        <td className="fs-12 text-nowrap">{new Date(c.created_at).toLocaleString()}</td>
                                                        <td className="fs-13">{c.user?.full_name || '-'}</td>
                                                        <td><div className="fw-semibold fs-13">{ACTION[c.action] || c.action} {TYPE[c.object_type] || c.object_type}</div><div className="fs-11 text-muted">{c.object_name || c.object_id || ''}</div></td>
                                                        <td className="fs-12">{describe(c) || '-'}{c.note && <div className="fs-11 text-muted">{c.note}</div>}</td>
                                                        <td>
                                                            <span className={`badge ${cls}`}>{text}</span>
                                                            {c.error && <div className="fs-11 text-danger mt-1">{c.error}</div>}
                                                            {c.reviewer && <div className="fs-11 text-muted mt-1">by {c.reviewer.full_name}{c.review_note ? `: ${c.review_note}` : ''}</div>}
                                                        </td>
                                                        {canApprove && (
                                                            <td className="text-end text-nowrap">
                                                                {c.status === 'pending' && (
                                                                    <>
                                                                        <button type="button" className="btn btn-sm btn-success me-2" onClick={() => decide(c, true)} data-testid="approve-change"><FiCheck className="me-1" />Approve</button>
                                                                        <button type="button" className="btn btn-sm btn-light-danger" onClick={() => decide(c, false)}><FiX className="me-1" />Reject</button>
                                                                    </>
                                                                )}
                                                            </td>
                                                        )}
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {next && <div className="card-footer text-center"><button type="button" className="btn btn-light-brand" disabled={loading} onClick={() => load(next)}>Load older changes</button></div>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </>
    )
}

export default AdChangesPage
