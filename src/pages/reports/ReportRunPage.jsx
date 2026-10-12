import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'
import { FiDownload, FiShare2, FiMail, FiTrash2, FiGrid, FiCopy, FiSlash } from 'react-icons/fi'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import { adsApi } from '@/components/meta/adsApi'
import ReportSections, { exportRunExcel } from '@/components/reports/ReportSections'
import { RUN_STATUS } from './ReportsPage'
import { API_BASE_URL } from '../../config/api'

/** One generated report: preview of the stored snapshot, PDF, Excel, share link, email. */
const ReportRunPage = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [run, setRun] = useState(null)
    const [share, setShare] = useState(null)
    const [busy, setBusy] = useState(false)

    const load = useCallback(async () => {
        try {
            setRun((await adsApi(`/api/reports/runs/${id}`)).data)
        } catch (e) {
            toast.error(e.message)
        }
    }, [id])
    useEffect(() => { load() }, [load])
    useEffect(() => {
        if (!run || !['queued', 'running'].includes(run.status)) return undefined
        const t = setTimeout(load, 1500)
        return () => clearTimeout(t)
    }, [run, load])

    const ready = run && ['completed', 'partial'].includes(run.status)
    const downloadPdf = async () => {
        setBusy(true)
        try {
            const res = await fetch(`${API_BASE_URL}/api/reports/runs/${id}/pdf`)
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Download failed')
            const blob = await res.blob()
            const name = (res.headers.get('content-disposition') || '').match(/filename="([^"]+)"/)?.[1] || 'report.pdf'
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = name
            a.click()
            setTimeout(() => URL.revokeObjectURL(a.href), 5000)
        } catch (e) {
            toast.error(e.message)
        } finally {
            setBusy(false)
        }
    }
    const createShare = async () => {
        try {
            const r = await adsApi(`/api/reports/runs/${id}/share`, { method: 'POST', body: { days: 30 } })
            setShare(r.data)
            load()
        } catch (e) {
            toast.error(e.message)
        }
    }
    const revoke = async () => {
        try {
            await adsApi(`/api/reports/runs/${id}/share`, { method: 'DELETE' })
            setShare(null)
            toast.success('The link no longer works')
            load()
        } catch (e) {
            toast.error(e.message)
        }
    }
    const email = async () => {
        const r = await Swal.fire({ title: 'Email this report', input: 'text', inputLabel: 'Recipients (comma separated)', inputPlaceholder: 'name@client.com', showCancelButton: true, confirmButtonText: 'Send' })
        if (!r.isConfirmed) return
        const recipients = String(r.value || '').split(/[\s,;]+/).filter(Boolean)
        try {
            await adsApi(`/api/reports/runs/${id}/email`, { method: 'POST', body: recipients.length ? { recipients } : {} })
            toast.success('The report is being emailed with the PDF attached')
        } catch (e) {
            toast.error(e.message)
        }
    }
    const remove = async () => {
        const ok = await Swal.fire({ title: 'Delete this report?', text: 'Its PDF and share links stop working.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Delete' })
        if (!ok.isConfirmed) return
        try {
            await adsApi(`/api/reports/runs/${id}`, { method: 'DELETE' })
            navigate('/reports')
        } catch (e) {
            toast.error(e.message)
        }
    }

    if (!run) return <div className="main-content text-center py-5"><div className="spinner-border text-primary" role="status" /></div>
    const [cls, text] = RUN_STATUS[run.status] || RUN_STATUS.queued
    const color = run.data?.branding?.primary_color || '#3454d1'
    return (
        <>
            <PageHeader>
                <div className="d-flex gap-2 flex-wrap justify-content-end">
                    <button type="button" className="btn btn-primary" disabled={!ready || busy} onClick={downloadPdf} data-testid="download-pdf"><FiDownload className="me-2" />PDF</button>
                    <button type="button" className="btn btn-light-brand" disabled={!ready} onClick={() => exportRunExcel(run)} data-testid="download-excel"><FiGrid className="me-2" />Excel</button>
                    <button type="button" className="btn btn-light-brand" disabled={!ready} onClick={createShare} data-testid="share-report"><FiShare2 className="me-2" />Share link</button>
                    <button type="button" className="btn btn-light-brand" disabled={!ready} onClick={email}><FiMail className="me-2" />Email</button>
                    <button type="button" className="btn btn-light-danger" onClick={remove} title="Delete"><FiTrash2 /></button>
                </div>
            </PageHeader>
            <div className="main-content">
                <div className="card mb-4" style={{ borderTop: `4px solid ${color}` }}>
                    <div className="card-body d-flex justify-content-between flex-wrap gap-2">
                        <div>
                            <h4 className="mb-1">{run.title}</h4>
                            <div className="fs-13 text-muted">
                                {run.client?.company_name ? `${run.client.company_name} · ` : ''}{run.period_from} to {run.period_to}
                                {run.compare_from ? ` · compared with ${run.compare_from} to ${run.compare_to}` : ''}
                            </div>
                        </div>
                        <div className="text-end">
                            <span className={`badge ${cls}`} data-testid="run-status">{text}</span>
                            {run.emailed_at && <div className="fs-11 text-muted mt-1">Emailed {new Date(run.emailed_at).toLocaleString()} to {(run.email_to || []).join(', ')}</div>}
                            {run.email_error && <div className="fs-11 text-danger mt-1">{run.email_error}</div>}
                        </div>
                    </div>
                    {(share || run.shared) && (
                        <div className="card-footer d-flex align-items-center gap-2 flex-wrap" data-testid="share-box">
                            {share ? (
                                <>
                                    <input className="form-control form-control-sm" style={{ maxWidth: 520 }} readOnly value={share.url} aria-label="Share link" data-testid="share-url" />
                                    <button type="button" className="btn btn-sm btn-light" onClick={() => navigator.clipboard?.writeText(share.url).then(() => toast.success('Link copied'))}><FiCopy className="me-1" />Copy</button>
                                    <span className="fs-11 text-muted">Works until {new Date(share.expires_at).toLocaleDateString()}</span>
                                </>
                            ) : <span className="fs-12 text-muted">A share link is active until {new Date(run.share_expires_at).toLocaleDateString()}.</span>}
                            <button type="button" className="btn btn-sm btn-light-danger ms-auto" onClick={revoke}><FiSlash className="me-1" />Stop sharing</button>
                        </div>
                    )}
                </div>
                {['queued', 'running'].includes(run.status) && <div className="text-center py-5"><div className="spinner-border text-primary mb-3" role="status" /><p className="text-muted">Collecting the data and drawing the PDF...</p></div>}
                {run.status === 'failed' && <div className="alert alert-danger">{run.error || 'The report could not be generated.'}</div>}
                {run.source_errors?.length > 0 && (
                    <div className="alert alert-warning">
                        <div className="fw-semibold mb-1">Some sections could not be loaded</div>
                        {run.source_errors.map((e, i) => <div key={i} className="fs-13">{e.title}: {e.message}</div>)}
                    </div>
                )}
                {run.data && <ReportSections sections={run.data.sections} color={color} />}
            </div>
            <Footer />
        </>
    )
}

export default ReportRunPage
