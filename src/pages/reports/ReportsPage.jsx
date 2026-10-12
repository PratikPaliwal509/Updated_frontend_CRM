import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'
import { FiPlus, FiPlay, FiEdit3, FiTrash2, FiFileText, FiClock, FiMail } from 'react-icons/fi'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import { adsApi } from '@/components/meta/adsApi'

/**
 * Reports (F-126 - F-128): saved client reports and the latest generated runs.
 */
const SOURCE = { meta_ads: 'Meta Ads', facebook_page: 'Facebook Page', crm_leads: 'Leads', crm_work: 'Work' }
const PRESET = { last_7d: 'Last 7 days', last_14d: 'Last 14 days', last_30d: 'Last 30 days', last_90d: 'Last 90 days', this_month: 'This month', last_month: 'Last month', this_quarter: 'This quarter', last_quarter: 'Last quarter', last_week: 'Last week', custom: 'Custom dates' }
const WEEKDAY = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const RUN_STATUS = {
    queued: ['bg-soft-info text-info', 'Queued'], running: ['bg-soft-info text-info', 'Generating'], completed: ['bg-soft-success text-success', 'Ready'],
    partial: ['bg-soft-warning text-warning', 'Ready (partial)'], failed: ['bg-soft-danger text-danger', 'Failed'],
}
export const scheduleText = (t) => {
    if (t.schedule_frequency === 'weekly') return `Every ${WEEKDAY[t.schedule_weekday || 1]} at ${String(t.schedule_hour).padStart(2, '0')}:00`
    if (t.schedule_frequency === 'monthly') return `Monthly on day ${t.schedule_monthday || 1} at ${String(t.schedule_hour).padStart(2, '0')}:00`
    return 'Not scheduled'
}

const ReportsPage = () => {
    const navigate = useNavigate()
    const [templates, setTemplates] = useState([])
    const [runs, setRuns] = useState([])
    const [loading, setLoading] = useState(true)

    const load = useCallback(async () => {
        try {
            const [t, r] = await Promise.all([adsApi('/api/reports/templates'), adsApi('/api/reports/runs?limit=20')])
            setTemplates(t.data)
            setRuns(r.data)
        } catch (e) {
            toast.error(e.message)
        } finally {
            setLoading(false)
        }
    }, [])
    useEffect(() => { load() }, [load])
    // refresh while something is being generated
    useEffect(() => {
        if (!runs.some((r) => r.status === 'queued' || r.status === 'running')) return undefined
        const t = setTimeout(load, 2500)
        return () => clearTimeout(t)
    }, [runs, load])

    const run = async (t, email) => {
        try {
            const r = await adsApi(`/api/reports/templates/${t.report_template_id}/run`, { method: 'POST', body: { email } })
            toast.success(email ? 'Generating - it will be emailed when ready' : 'Generating the report...')
            navigate(`/reports/runs/${r.data.report_run_id}`)
        } catch (e) {
            toast.error(e.message)
        }
    }
    const remove = async (t) => {
        const ok = await Swal.fire({ title: `Delete "${t.name}"?`, text: 'Reports already generated are kept.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Delete' })
        if (!ok.isConfirmed) return
        try {
            await adsApi(`/api/reports/templates/${t.report_template_id}`, { method: 'DELETE' })
            toast.success('Report deleted')
            load()
        } catch (e) {
            toast.error(e.message)
        }
    }

    return (
        <>
            <PageHeader>
                <Link to="/reports/new" className="btn btn-primary" data-testid="new-report"><FiPlus className="me-2" />New report</Link>
            </PageHeader>
            <div className="main-content">
                <div className="row">
                    <div className="col-12">
                        <div className="card mb-4">
                            <div className="card-header"><h6 className="mb-0">Saved reports</h6></div>
                            {!loading && templates.length === 0 ? (
                                <div className="card-body text-center py-5">
                                    <FiFileText size={40} className="text-primary mb-3" />
                                    <h6>No reports yet</h6>
                                    <p className="text-muted fs-13">Build a client report from Meta Ads, the Facebook Page, leads and delivered work; send it as a branded PDF on a schedule.</p>
                                    <Link to="/reports/new" className="btn btn-primary"><FiPlus className="me-2" />New report</Link>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0" data-testid="report-templates">
                                        <thead><tr><th>Report</th><th>Client</th><th>Sections</th><th>Period</th><th>Schedule</th><th className="text-end">Actions</th></tr></thead>
                                        <tbody>
                                            {templates.map((t) => (
                                                <tr key={t.report_template_id} data-testid="report-template-row">
                                                    <td><div className="fw-semibold">{t.name}</div>{t.description && <div className="fs-11 text-muted">{t.description}</div>}</td>
                                                    <td className="fs-13">{t.client?.company_name || '-'}</td>
                                                    <td><div className="d-flex flex-wrap gap-1">{t.sources.map((s, i) => <span key={i} className="badge bg-soft-primary text-primary">{SOURCE[s.type]}</span>)}</div></td>
                                                    <td className="fs-13">{PRESET[t.date_preset]}{t.compare_type !== 'none' && <div className="fs-11 text-muted">with comparison</div>}</td>
                                                    <td className="fs-12">{t.is_active && t.schedule_frequency !== 'none' ? <><FiClock className="me-1" />{scheduleText(t)}<div className="fs-11 text-muted">{t.recipients.length} recipient{t.recipients.length === 1 ? '' : 's'}{t.include_client_contacts ? ' + client contacts' : ''}</div></> : <span className="text-muted">Not scheduled</span>}</td>
                                                    <td className="text-end text-nowrap">
                                                        <button type="button" className="btn btn-sm btn-primary me-2" onClick={() => run(t, false)} data-testid="run-report"><FiPlay className="me-1" />Generate</button>
                                                        <button type="button" className="btn btn-sm btn-light me-2" onClick={() => run(t, true)} title="Generate and email to the recipients" disabled={!t.recipients.length && !t.include_client_contacts}><FiMail /></button>
                                                        <button type="button" className="btn btn-sm btn-light me-2" onClick={() => navigate(`/reports/edit/${t.report_template_id}`)} title="Edit"><FiEdit3 /></button>
                                                        <button type="button" className="btn btn-sm btn-light-danger" onClick={() => remove(t)} title="Delete"><FiTrash2 /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        <div className="card">
                            <div className="card-header"><h6 className="mb-0">Generated reports</h6></div>
                            <div className="table-responsive">
                                <table className="table table-hover mb-0" data-testid="report-runs">
                                    <thead><tr><th>Report</th><th>Period</th><th>Status</th><th>Created</th><th>Emailed</th></tr></thead>
                                    <tbody>
                                        {!loading && runs.length === 0 && <tr><td colSpan={5} className="text-center text-muted py-4">Nothing generated yet</td></tr>}
                                        {runs.map((r) => {
                                            const [cls, text] = RUN_STATUS[r.status] || RUN_STATUS.queued
                                            return (
                                                <tr key={r.report_run_id} className="cursor-pointer" onClick={() => navigate(`/reports/runs/${r.report_run_id}`)} data-testid="report-run-row">
                                                    <td><div className="fw-semibold">{r.title}</div><div className="fs-11 text-muted">{r.client?.company_name || ''}{r.trigger === 'schedule' ? ' · scheduled' : ''}</div></td>
                                                    <td className="fs-13">{r.period_from} to {r.period_to}</td>
                                                    <td><span className={`badge ${cls}`}>{text}</span></td>
                                                    <td className="fs-12">{new Date(r.created_at).toLocaleString()}<div className="fs-11 text-muted">{r.creator?.full_name || ''}</div></td>
                                                    <td className="fs-12">{r.emailed_at ? new Date(r.emailed_at).toLocaleString() : r.email_error ? <span className="text-danger">failed</span> : '-'}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    )
}

export default ReportsPage
