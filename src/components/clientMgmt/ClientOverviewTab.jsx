import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { api } from '@/utils/authSession'
import { money, fmtDateTime, StatusBadge, Loading, label } from './common'

const Stat = ({ title, value, sub }) => (
    <div className="col-6 col-lg-3">
        <div className="card stretch mb-3"><div className="card-body">
            <div className="fs-12 text-muted mb-1">{title}</div>
            <div className="fs-20 fw-bold">{value}</div>
            {sub && <div className="fs-11 text-muted mt-1">{sub}</div>}
        </div></div>
    </div>
)

/** F-027: per-client dashboard from projects, tasks, time, invoices, sales and onboarding. */
const ClientOverviewTab = ({ clientId }) => {
    const [d, setD] = useState(null)
    useEffect(() => { api(`/api/clients/${clientId}/overview`).then(setD).catch((e) => toast.error(e.message)) }, [clientId])
    if (!d) return <Loading />
    const cur = d.billing.currency
    return (
        <>
            <div className="row">
                <Stat title="Projects" value={d.projects.total} sub={Object.entries(d.projects.by_status).map(([k, v]) => `${v} ${label(k)}`).join(' · ') || 'none yet'} />
                <Stat title="Open tasks" value={d.tasks.open} sub={`${d.tasks.overdue} overdue · ${d.tasks.completed} completed`} />
                <Stat title="Hours this month" value={d.hours_this_month} />
                <Stat title="Onboarding" value={`${d.onboarding.done}/${d.onboarding.total}`} sub={<StatusBadge status={d.onboarding.status} />} />
                <Stat title="Unbilled time" value={money(d.billing.unbilled_amount, cur)} sub={<Link to={`/invoices/create?client_id=${clientId}`}>Create invoice</Link>} />
                <Stat title="Outstanding" value={money(d.billing.outstanding_amount, cur)} sub={`${d.billing.open_invoices} open invoice(s)`} />
                <Stat title="Overdue" value={money(d.billing.overdue_amount, cur)} />
                <Stat title="Paid this year" value={money(d.billing.paid_this_year, cur)} />
                <Stat title="Open leads / proposals" value={`${d.sales.open_leads} / ${d.sales.open_proposals}`} />
                <Stat title="Contacts" value={d.contacts} />
                <Stat title="Documents" value={d.documents} />
                <Stat title="Last activity" value={<span className="fs-13">{d.last_activity ? `${label(d.last_activity.action).toLowerCase()}` : '-'}</span>} sub={d.last_activity ? `${d.last_activity.user_name || ''} · ${fmtDateTime(d.last_activity.created_at)}` : null} />
            </div>
            <div className="alert alert-light fs-12 mb-0">
                Channel KPIs (Facebook, Instagram, Ads, GA4, Search Console) appear here once this client's own accounts can be connected (per-client integrations, pending the Meta / Google app setup).
            </div>
        </>
    )
}

export default ClientOverviewTab
