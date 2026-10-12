import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { api } from '@/utils/authSession'
import { money, fmtDate, fmtDateTime, Loading, label } from '@/components/clientMgmt/common'

export const HEALTH = {
    on_track: ['On track', 'bg-soft-success text-success'],
    at_risk: ['At risk', 'bg-soft-warning text-warning'],
    off_track: ['Off track', 'bg-soft-danger text-danger'],
    closed: ['Closed', 'bg-soft-secondary text-muted'],
}
export const HealthBadge = ({ health }) => {
    const [t, c] = HEALTH[health] || [health || '-', 'bg-soft-secondary text-muted']
    return <span className={`badge ${c}`}>{t}</span>
}

const Bar = ({ pct, color = 'primary' }) => (
    <div className="progress" style={{ height: 6 }}><div className={`progress-bar bg-${color}`} style={{ width: `${Math.min(100, Math.max(0, pct || 0))}%` }} /></div>
)
const Stat = ({ title, children, sub }) => (
    <div className="col-6 col-lg-3"><div className="card stretch mb-3"><div className="card-body">
        <div className="fs-12 text-muted mb-1">{title}</div><div className="fs-20 fw-bold">{children}</div>{sub && <div className="fs-11 text-muted mt-1">{sub}</div>}
    </div></div></div>
)

/** F-043 / F-044: project dashboard - progress, schedule, hours, budget, health, people, due this week. */
const ProjectDashboardTab = ({ projectId }) => {
    const [d, setD] = useState(null)
    useEffect(() => { api(`/api/projects/${projectId}/dashboard`).then(setD).catch((e) => toast.error(e.message)) }, [projectId])
    if (!d) return <Loading />
    const b = d.budget
    const burnColor = b.used_pct > 100 ? 'danger' : b.used_pct > 90 ? 'warning' : 'success'
    return (
        <>
            <div className="card mb-3"><div className="card-body d-flex flex-wrap gap-4 align-items-center">
                <div><div className="fs-12 text-muted">Health</div><HealthBadge health={d.health} /></div>
                <div className="flex-grow-1">{d.health_reasons.length ? d.health_reasons.join(' · ') : <span className="text-muted fs-12">No warnings.</span>}</div>
            </div></div>
            <div className="row">
                <Stat title="Progress" sub={`${d.tasks.completed} of ${d.tasks.total} tasks done`}>{d.progress}%<Bar pct={d.progress} /></Stat>
                <Stat title="Schedule" sub={d.schedule.end_date ? `${fmtDate(d.schedule.start_date)} - ${fmtDate(d.schedule.end_date)}` : 'No end date'}>
                    {d.schedule.days_left == null ? '-' : d.schedule.days_left >= 0 ? `${d.schedule.days_left} days left` : `${-d.schedule.days_left} days late`}
                    {d.schedule.elapsed_pct != null && <Bar pct={d.schedule.elapsed_pct} color="info" />}
                </Stat>
                <Stat title="Hours logged" sub={d.hours.estimated ? `of ${d.hours.estimated} h estimated (${d.hours.used_pct}%)` : `${d.hours_this_week} h this week`}>{d.hours.logged} h</Stat>
                <Stat title="Overdue tasks">{d.tasks.overdue}</Stat>
                <Stat title="Budget" sub={b.amount ? `${b.used_pct}% used` : 'No budget set'}>{b.amount ? money(b.amount, b.currency) : '-'}{b.amount ? <Bar pct={b.used_pct} color={burnColor} /> : null}</Stat>
                <Stat title="Cost so far" sub="hours x hourly rates">{money(b.cost, b.currency)}</Stat>
                <Stat title="Remaining budget">{b.remaining != null ? money(b.remaining, b.currency) : '-'}</Stat>
                <Stat title="Invoiced" sub={`Billable ${money(b.billable, b.currency)}`}>{money(b.invoiced, b.currency)}</Stat>
            </div>
            <div className="row">
                <div className="col-lg-6"><div className="card"><div className="card-header"><h5 className="card-title mb-0">People</h5></div><div className="card-body p-0">
                    {d.people.length === 0 ? <div className="text-muted p-3">No one has logged time or been assigned yet.</div> : (
                        <table className="table mb-0"><thead><tr><th>Person</th><th className="text-end">Hours</th><th className="text-end">Open</th><th className="text-end">Done</th><th className="text-end">Overdue</th></tr></thead>
                            <tbody>{d.people.map((p) => <tr key={p.user_id}><td>{p.full_name}</td><td className="text-end">{p.hours}</td><td className="text-end">{p.open_tasks}</td><td className="text-end">{p.completed_tasks}</td><td className={`text-end ${p.overdue_tasks ? 'text-danger' : ''}`}>{p.overdue_tasks}</td></tr>)}</tbody></table>
                    )}
                </div></div></div>
                <div className="col-lg-6">
                    <div className="card"><div className="card-header"><h5 className="card-title mb-0">Tasks by status</h5></div><div className="card-body">
                        {Object.keys(d.tasks.by_status).length === 0 ? <span className="text-muted">No tasks yet.</span> : Object.entries(d.tasks.by_status).map(([s, n]) => (
                            <div key={s} className="d-flex justify-content-between fs-12 mb-1"><span className="text-capitalize">{label(s)}</span><b>{n}</b></div>
                        ))}
                    </div></div>
                    <div className="card"><div className="card-header"><h5 className="card-title mb-0">Due this week</h5></div><div className="card-body">
                        {d.due_this_week.length === 0 ? <span className="text-muted">Nothing due this week.</span> : d.due_this_week.map((t) => (
                            <div key={t.task_id} className="d-flex justify-content-between fs-12 mb-1"><span>{t.task_title}</span><span className="text-muted">{fmtDate(t.due_date)}</span></div>
                        ))}
                    </div></div>
                </div>
            </div>
            <div className="card"><div className="card-header"><h5 className="card-title mb-0">Recent activity</h5></div><div className="card-body">
                {d.recent_activity.length === 0 ? <span className="text-muted">No activity recorded yet.</span> : d.recent_activity.map((a) => (
                    <div key={a.log_id} className="d-flex gap-3 fs-12 mb-2"><span className="text-muted text-nowrap">{fmtDateTime(a.created_at)}</span><span className="text-capitalize">{String(a.action).toLowerCase()}</span><span className="text-muted">{a.user_name}</span></div>
                ))}
            </div></div>
        </>
    )
}

export default ProjectDashboardTab
