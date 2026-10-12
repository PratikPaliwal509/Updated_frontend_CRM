import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { api, logout } from '@/utils/authSession'
import { downloadSalesPdf } from '@/utils/salesPdf'
import { money, fmtDate, StatusBadge } from '@/components/clientMgmt/common'
import PortalChat from '@/components/secureChat/PortalChat'

/** Client portal (user_type = client): own projects, client-visible tasks, approvals. */
const PortalPage = () => {
    const [me, setMe] = useState(null)
    const [projects, setProjects] = useState([])
    const [active, setActive] = useState(null)
    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(true)
    const [invoices, setInvoices] = useState([])
    const [documents, setDocuments] = useState([])
    const navigate = useNavigate()

    useEffect(() => {
        if (!localStorage.getItem('token')) return
        api('/api/portal/invoices').then(setInvoices).catch(() => setInvoices([]))
        api('/api/portal/documents').then(setDocuments).catch(() => setDocuments([]))
    }, [])

    const download = async (d) => {
        try { const r = await api(`/api/portal/documents/${d.document_id}/download`); window.open(r.url, '_blank', 'noopener') } catch (err) { toast.error(err.message) }
    }

    useEffect(() => {
        if (!localStorage.getItem('token')) return navigate('/authentication/login', { replace: true })
        Promise.all([api('/api/portal/me'), api('/api/portal/projects')])
            .then(([m, p]) => { setMe(m); setProjects(p || []); if (p && p[0]) setActive(p[0].project_id) })
            .catch((err) => {
                if (err.code === 'CLIENT_ONLY') return navigate('/', { replace: true })
                toast.error(err.message)
            })
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        if (!active) return
        api(`/api/portal/projects/${active}/tasks`).then((t) => setTasks(t || [])).catch((err) => toast.error(err.message))
    }, [active])

    const approve = async (taskId) => {
        try {
            const r = await api(`/api/portal/tasks/${taskId}/approve`, { method: 'POST', body: {} })
            setTasks(tasks.map((t) => (t.task_id === taskId ? { ...t, ...r, client_approved: true, client_approval_status: 'approved' } : t)))
            toast.success('Approved')
        } catch (err) {
            toast.error(err.message)
        }
    }

    const requestChanges = async (taskId) => {
        const feedback = window.prompt('What should be changed?')
        if (feedback === null) return
        if (!feedback.trim()) return toast.error('Please describe the changes you need.')
        try {
            const r = await api(`/api/portal/tasks/${taskId}/request-changes`, { method: 'POST', body: { feedback } })
            setTasks(tasks.map((t) => (t.task_id === taskId ? { ...t, ...r } : t)))
            toast.success('Your feedback was sent to the team')
        } catch (err) {
            toast.error(err.message)
        }
    }

    const signOut = async () => {
        await logout()
        navigate('/authentication/login', { replace: true })
    }

    return (
        <div className="container py-5" style={{ maxWidth: 1000 }}>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h4 className="mb-1">{me?.client?.company_name || 'Client portal'}</h4>
                    <div className="text-muted fs-12">{me?.user?.full_name}{me?.client?.manager ? ` · Account manager: ${me.client.manager.full_name}` : ''}</div>
                </div>
                <button className="btn btn-light" onClick={signOut}>Sign out</button>
            </div>
            {loading ? <p className="text-muted">Loading...</p> : projects.length === 0 ? (
                <div className="card card-body text-muted">No projects are shared with you yet.</div>
            ) : (
                <div className="row">
                    <div className="col-md-4 mb-3">
                        <div className="list-group">
                            {projects.map((p) => (
                                <button key={p.project_id} className={`list-group-item list-group-item-action ${active === p.project_id ? 'active' : ''}`} onClick={() => setActive(p.project_id)}>
                                    <div className="fw-semibold">{p.project_name}</div>
                                    <div className="fs-11">{p.status} · {p.progress_percentage || 0}%</div>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="col-md-8">
                        <div className="card">
                            <div className="card-header"><h6 className="mb-0">Deliverables</h6></div>
                            <div className="card-body p-0">
                                {tasks.length === 0 ? <p className="text-muted p-3 mb-0">Nothing shared for this project yet.</p> : (
                                    <table className="table mb-0">
                                        <thead><tr><th>Task</th><th>Status</th><th>Due</th><th /></tr></thead>
                                        <tbody>
                                            {tasks.map((t) => (
                                                <tr key={t.task_id}>
                                                    <td>
                                                        {t.task_title}
                                                        {t.client_feedback && <div className="fs-11 text-muted">Your feedback: {t.client_feedback}</div>}
                                                    </td>
                                                    <td className="text-capitalize">{String(t.status || '').replace(/_/g, ' ')}</td>
                                                    <td>{t.due_date ? new Date(t.due_date).toLocaleDateString(undefined, { timeZone: 'UTC' }) : '-'}</td>
                                                    <td className="text-end text-nowrap">
                                                        {t.client_approval_required && (t.client_approved
                                                            ? <span className="badge bg-soft-success text-success">Approved</span>
                                                            : <>
                                                                {t.client_approval_status === 'changes_requested' && <span className="badge bg-soft-danger text-danger me-2">Changes requested</span>}
                                                                <button className="btn btn-sm btn-primary me-1" onClick={() => approve(t.task_id)}>Approve</button>
                                                                {t.client_approval_status !== 'changes_requested' && <button className="btn btn-sm btn-light" onClick={() => requestChanges(t.task_id)}>Request changes</button>}
                                                            </>)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div className="row mt-4">
                <div className="col-md-7 mb-3">
                    <div className="card">
                        <div className="card-header"><h6 className="mb-0">Invoices</h6></div>
                        <div className="card-body p-0">
                            {invoices.length === 0 ? <p className="text-muted p-3 mb-0">No invoices yet.</p> : (
                                <table className="table mb-0">
                                    <thead><tr><th>Number</th><th>Due</th><th className="text-end">Total</th><th className="text-end">Balance</th><th>Status</th><th /></tr></thead>
                                    <tbody>{invoices.map((i) => (
                                        <tr key={i.invoice_id}>
                                            <td>{i.number}</td><td>{fmtDate(i.due_date)}</td><td className="text-end">{money(i.total, i.currency)}</td><td className="text-end">{money(i.balance, i.currency)}</td>
                                            <td><StatusBadge status={i.display_status} /></td>
                                            <td className="text-end"><button className="btn btn-sm btn-light" onClick={() => downloadSalesPdf('invoice', i, '')}>PDF</button></td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
                <div className="col-md-5 mb-3">
                    <div className="card">
                        <div className="card-header"><h6 className="mb-0">Documents</h6></div>
                        <div className="card-body">
                            {documents.length === 0 ? <p className="text-muted mb-0">No documents shared with you yet.</p> : documents.map((d) => (
                                <div key={d.document_id} className="d-flex justify-content-between mb-2">
                                    <a href="#" onClick={(e) => { e.preventDefault(); download(d) }}>{d.folder ? `${d.folder} / ` : ''}{d.name}</a>
                                    <span className="fs-11 text-muted">v{d.version} · {fmtDate(d.created_at)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            {me?.user && <PortalChat me={{ ...me.user, user_type: 'client' }} />}
        </div>
    )
}

export default PortalPage
