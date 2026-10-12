import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiCheckSquare, FiAlertTriangle, FiCalendar, FiBriefcase, FiUsers, FiUserPlus, FiAward, FiClock, FiSend, FiFileText, FiTrendingUp, FiTrendingDown } from 'react-icons/fi'
import { api } from '@/utils/authSession'

/**
 * Real KPIs of the workspace for the dashboard period (F-129). Each tile appears only when the
 * role can see that module; numbers follow the same visibility as the module screens.
 */
const Delta = ({ m }) => {
    if (!m || m.growth === null || m.growth === undefined) return <span className="fs-11 text-muted">vs previous: -</span>
    if (Math.abs(m.growth) < 0.05) return <span className="fs-11 text-muted">no change</span>
    const up = m.growth > 0
    return <span className={`fs-11 ${up ? 'text-success' : 'text-danger'}`}>{up ? <FiTrendingUp className="me-1" /> : <FiTrendingDown className="me-1" />}{up ? '+' : ''}{m.growth.toFixed(0)}% vs previous</span>
}

const Tile = ({ icon, label, value, sub, to, tone = 'primary' }) => (
    <div className="col-6 col-md-4 col-xxl-2">
        <div className="card stretch stretch-full mb-3" data-testid="dashboard-kpi">
            <div className="card-body py-3">
                <div className="d-flex align-items-center gap-2 mb-2">
                    <div className={`avatar-text avatar-sm bg-soft-${tone} text-${tone}`}>{icon}</div>
                    <span className="fs-12 text-muted">{to ? <Link to={to} className="text-muted">{label}</Link> : label}</span>
                </div>
                <div className="fs-4 fw-bold text-dark">{value ?? '-'}</div>
                <div>{sub}</div>
            </div>
        </div>
    </div>
)

const DashboardKpis = ({ filters }) => {
    const [d, setD] = useState(null)
    const [error, setError] = useState(null)
    useEffect(() => {
        const q = new URLSearchParams()
        if (filters?.startDate && filters?.endDate) { q.set('from', filters.startDate); q.set('to', filters.endDate) }
        api(`/api/dashboard/summary?${q}`).then((r) => { setD(r); setError(null) }).catch((e) => setError(e.message))
    }, [filters?.startDate, filters?.endDate])

    if (error) return <div className="col-12"><div className="alert alert-light border fs-13">Dashboard numbers could not be loaded: {error}</div></div>
    if (!d) return <div className="col-12 text-center py-3"><div className="spinner-border spinner-border-sm text-primary" role="status" /></div>
    return (
        <>
            <div className="col-12 fs-12 text-muted mb-2" data-testid="dashboard-period">{d.period.from} to {d.period.to} · compared with {d.comparison.from} to {d.comparison.to}</div>
            {d.tasks && (
                <>
                    <Tile icon={<FiCheckSquare />} label="Tasks completed" value={d.tasks.completed.value} sub={<Delta m={d.tasks.completed} />} to="/applications/tasks" tone="success" />
                    <Tile icon={<FiCalendar />} label="Open tasks" value={d.tasks.open} sub={<span className="fs-11 text-muted">{d.tasks.due_next_7_days} due in the next 7 days</span>} to="/applications/tasks" />
                    <Tile icon={<FiAlertTriangle />} label="Overdue tasks" value={d.tasks.overdue} sub={<span className="fs-11 text-muted">open and past the due date</span>} to="/applications/tasks" tone={d.tasks.overdue ? 'danger' : 'success'} />
                </>
            )}
            {d.projects && <Tile icon={<FiBriefcase />} label="Active projects" value={d.projects.active} sub={<span className="fs-11 text-muted">of {d.projects.total} not archived</span>} to="/projects/list" tone="info" />}
            {d.clients && <Tile icon={<FiUsers />} label="Active clients" value={d.clients.active} sub={<span className="fs-11 text-muted">of {d.clients.total}</span>} to="/clients/list" tone="info" />}
            {d.leads && (
                <>
                    <Tile icon={<FiUserPlus />} label="New leads" value={d.leads.new.value} sub={<Delta m={d.leads.new} />} to="/leads/list" tone="warning" />
                    <Tile icon={<FiAward />} label="Leads won" value={d.leads.won.value} sub={<Delta m={d.leads.won} />} to="/leads/list" tone="success" />
                </>
            )}
            {d.hours && <Tile icon={<FiClock />} label={d.hours.scope === 'mine' ? 'My hours logged' : 'Hours logged'} value={d.hours.value} sub={<Delta m={d.hours} />} tone="primary" />}
            {d.social && <Tile icon={<FiSend />} label="Facebook posts" value={d.social.published} sub={<span className="fs-11 text-muted">published · {d.social.scheduled} scheduled{d.social.failed ? ` · ${d.social.failed} failed` : ''}</span>} to="/meta/posts/scheduled" tone="primary" />}
            {d.reports && <Tile icon={<FiFileText />} label="Client reports emailed" value={d.reports.emailed} sub={<span className="fs-11 text-muted">{d.reports.scheduled} on a schedule</span>} to="/reports" tone="secondary" />}
        </>
    )
}

export default DashboardKpis
