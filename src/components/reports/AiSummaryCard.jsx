import React, { useState } from 'react'
import { toast } from 'react-toastify'
import { FiZap, FiRefreshCw, FiAlertTriangle, FiTrendingUp, FiTrendingDown } from 'react-icons/fi'
import { adsApi } from '@/components/meta/adsApi'
import { aiErrorText } from '@/components/ai/AiWriter'

/**
 * F-131: AI executive summary of a report run (narrative, highlights, risks, next steps) plus the
 * anomalies our own checks found. Generating it also re-draws the PDF with the summary on page 1.
 */
const AiSummaryCard = ({ run, onUpdated }) => {
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState(null)
    const sm = run.data?.ai_summary
    const ready = ['completed', 'partial'].includes(run.status)

    const generate = async () => {
        setBusy(true); setError(null)
        try {
            await adsApi(`/api/reports/runs/${run.report_run_id}/ai-summary`, { method: 'POST', body: {} })
            toast.success('Summary written - the PDF now starts with it')
            onUpdated()
        } catch (e) { setError(e) } finally { setBusy(false) }
    }
    if (!ready) return null
    return (
        <div className="card mb-4" data-testid="ai-summary">
            <div className="card-header d-flex justify-content-between align-items-center">
                <h6 className="mb-0"><FiZap className="me-2 text-primary" />Executive summary</h6>
                <button type="button" className="btn btn-sm btn-light-brand" onClick={generate} disabled={busy} data-testid="ai-summary-generate">
                    {busy ? <span className="spinner-border spinner-border-sm me-1" /> : sm && !sm.error ? <FiRefreshCw className="me-1" /> : <FiZap className="me-1" />}
                    {sm && !sm.error ? 'Write again' : 'Write with AI'}
                </button>
            </div>
            <div className="card-body">
                {error && <div className="alert alert-warning fs-13 py-2">{aiErrorText(error)}</div>}
                {sm?.error && !error && <div className="alert alert-warning fs-13 py-2">The automatic summary could not be written: {sm.error}</div>}
                {!sm || sm.error ? <p className="text-muted fs-13 mb-0">Let AI write a short summary for the client from the numbers in this report: what went well, what needs attention and the next steps. Numbers are never invented; please read it before sending.</p> : (
                    <>
                        <h6 className="mb-1" data-testid="ai-summary-headline">{sm.headline}</h6>
                        <p className="fs-13">{sm.narrative}</p>
                        <div className="row g-3">
                            {[['Highlights', sm.highlights, 'text-success'], ['Needs attention', sm.risks, 'text-warning'], ['Next steps', sm.actions, 'text-primary']].map(([t, items, cls]) => (
                                <div className="col-md-4" key={t}>
                                    <div className={`fs-11 fw-bold text-uppercase ${cls}`}>{t}</div>
                                    <ul className="fs-13 ps-3 mb-0">{(items || []).length ? items.map((x, i) => <li key={i}>{x}</li>) : <li className="text-muted">-</li>}</ul>
                                </div>
                            ))}
                        </div>
                        {sm.anomalies?.length > 0 && (
                            <div className="mt-3">
                                <div className="fs-11 fw-bold text-uppercase text-muted mb-1"><FiAlertTriangle className="me-1" />Unusual changes found</div>
                                <div className="d-flex flex-wrap gap-2">
                                    {sm.anomalies.map((a, i) => (
                                        <span key={i} className={`badge ${a.impact === 'good' ? 'bg-soft-success text-success' : a.impact === 'bad' ? 'bg-soft-danger text-danger' : 'bg-soft-warning text-warning'}`}>
                                            {a.direction === 'up' ? <FiTrendingUp className="me-1" /> : <FiTrendingDown className="me-1" />}
                                            {a.section}: {a.metric}{a.type === 'kpi_change' ? ` ${a.change_pct > 0 ? '+' : ''}${a.change_pct}%` : a.type === 'spike' ? ` on ${a.date}` : ` - zero from ${a.date}`}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="fs-11 text-muted mt-3">Written with AI on {new Date(sm.generated_at).toLocaleString()} · {Number(sm.tokens || 0).toLocaleString()} tokens</div>
                    </>
                )}
            </div>
        </div>
    )
}

export default AiSummaryCard
