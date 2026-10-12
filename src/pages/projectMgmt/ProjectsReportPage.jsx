import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import { api } from '@/utils/authSession'
import { API_BASE_URL } from '../../config/api'
import { money, fmtDate, Empty, Loading, label } from '@/components/clientMgmt/common'
import { HealthBadge } from '@/components/projectMgmt/ProjectDashboardTab'

/** F-044: portfolio report - progress, schedule, hours, budget burn and health of every visible project. */
const ProjectsReportPage = () => {
    const [data, setData] = useState(null)
    const [f, setF] = useState({ health: '', status: '', include_archived: '' })
    const qs = () => new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString()
    useEffect(() => { setData(null); api(`/api/projects/report?${qs()}`).then(setData).catch((e) => { setData({ totals: {}, projects: [] }); toast.error(e.message) }) }, [f])
    const exportCsv = async () => {
        try {
            const r = await fetch(`${API_BASE_URL}/api/projects/report/export?${qs()}`)
            if (!r.ok) throw new Error('Export failed')
            const a = document.createElement('a')
            a.href = URL.createObjectURL(await r.blob())
            a.download = `projects-report-${new Date().toISOString().slice(0, 10)}.csv`
            a.click()
        } catch (e) { toast.error(e.message) }
    }
    const t = data?.totals || {}
    return (
        <>
            <PageHeader><button className="btn btn-sm btn-light" onClick={exportCsv}>Export CSV</button></PageHeader>
            <div className="main-content">
                <div className="row">
                    {[['Projects', t.projects], ['On track', t.on_track], ['At risk', t.at_risk], ['Off track', t.off_track], ['Overdue tasks', t.overdue_tasks], ['Hours logged', t.hours]].map(([k, v]) => (
                        <div className="col-6 col-md-4 col-xl-2" key={k}><div className="card mb-3"><div className="card-body py-3"><div className="fs-12 text-muted">{k}</div><div className="fs-20 fw-bold">{v ?? 0}</div></div></div></div>
                    ))}
                </div>
                <div className="card mb-3"><div className="card-body d-flex gap-2 flex-wrap align-items-center">
                    <select className="form-select" style={{ maxWidth: 180 }} value={f.health} onChange={(e) => setF({ ...f, health: e.target.value })}>
                        <option value="">All health</option><option value="on_track">On track</option><option value="at_risk">At risk</option><option value="off_track">Off track</option><option value="closed">Closed</option>
                    </select>
                    <select className="form-select" style={{ maxWidth: 180 }} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
                        <option value="">All statuses</option>{['not_started', 'planning', 'in_progress', 'on_hold', 'finished', 'cancelled'].map((s) => <option key={s} value={s}>{label(s)}</option>)}
                    </select>
                    <label className="d-flex gap-1 align-items-center mb-0"><input type="checkbox" checked={f.include_archived === 'true'} onChange={(e) => setF({ ...f, include_archived: e.target.checked ? 'true' : '' })} /> Include archived</label>
                </div></div>
                <div className="card"><div className="card-body p-0">
                    {data === null ? <Loading /> : data.projects.length === 0 ? <Empty>No projects match.</Empty> : (
                        <div className="table-responsive"><table className="table mb-0">
                            <thead><tr><th>Project</th><th>Client</th><th>Manager</th><th>Health</th><th>Progress</th><th>Deadline</th><th className="text-end">Hours</th><th className="text-end">Budget used</th><th className="text-end">Overdue</th></tr></thead>
                            <tbody>{data.projects.map((p) => (
                                <tr key={p.project_id}>
                                    <td><Link to={`/projects/view/${p.project_id}`}>{p.project_name}</Link><div className="fs-11 text-muted text-capitalize">{p.project_code} · {label(p.status)}{p.is_archived ? ' · archived' : ''}</div></td>
                                    <td>{p.client?.company_name || '-'}</td>
                                    <td>{p.manager?.full_name || '-'}</td>
                                    <td title={p.health_reasons.join('\n')}><HealthBadge health={p.health} /></td>
                                    <td style={{ minWidth: 110 }}><div className="fs-11">{p.progress}% ({p.tasks.completed}/{p.tasks.total})</div><div className="progress" style={{ height: 5 }}><div className="progress-bar" style={{ width: `${p.progress}%` }} /></div></td>
                                    <td className="text-nowrap">{fmtDate(p.end_date)}{p.schedule.days_left != null && <div className={`fs-11 ${p.schedule.days_left < 0 ? 'text-danger' : 'text-muted'}`}>{p.schedule.days_left < 0 ? `${-p.schedule.days_left} days late` : `${p.schedule.days_left} days left`}</div>}</td>
                                    <td className="text-end">{p.hours.logged}{p.hours.estimated ? ` / ${p.hours.estimated}` : ''}</td>
                                    <td className="text-end">{p.budget.amount ? <>{p.budget.used_pct}%<div className="fs-11 text-muted">{money(p.budget.cost, p.budget.currency)} of {money(p.budget.amount, p.budget.currency)}</div></> : '-'}</td>
                                    <td className={`text-end ${p.tasks.overdue ? 'text-danger' : ''}`}>{p.tasks.overdue}</td>
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

export default ProjectsReportPage
