import React, { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'
import PerfectScrollbar from 'react-perfect-scrollbar'
import { FiFacebook, FiRefreshCw, FiLink, FiSlash, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi'
import Footer from '@/components/shared/Footer'
import { api } from '@/utils/authSession'

const fmt = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : null)
const STATUS = {
    active: ['bg-soft-success text-success', 'Active'],
    needs_reconnect: ['bg-soft-danger text-danger', 'Reconnect needed'],
    disconnected: ['bg-soft-secondary text-secondary', 'Access lost'],
}
const Status = ({ s, reason }) => {
    const [cls, text] = STATUS[s] || STATUS.disconnected
    return <span className={`badge ${cls}`} title={reason || ''}>{text}</span>
}

/**
 * Settings → Integrations: connect Facebook (Login for Business), see each connection's health,
 * choose which Pages the workspace uses and link Pages to clients. Tokens are never shown.
 */
const IntegrationsPage = () => {
    const [data, setData] = useState(null)
    const [clients, setClients] = useState([])
    const [busy, setBusy] = useState(false)

    const load = useCallback(async () => {
        try {
            setData(await api('/api/integrations/meta'))
        } catch (e) {
            toast.error(e.message)
        }
    }, [])
    useEffect(() => {
        load()
        api('/api/clients').then((r) => setClients(Array.isArray(r) ? r : r?.clients || r?.data || [])).catch(() => setClients([]))
    }, [load])

    const run = async (fn, ok) => {
        setBusy(true)
        try { const r = await fn(); if (ok) toast.success(typeof ok === 'function' ? ok(r) : ok); await load() } catch (e) { toast.error(e.message) } finally { setBusy(false) }
    }

    const connect = () => run(async () => {
        const r = await api('/api/integrations/meta/connect', { method: 'POST' })
        window.location.assign(r.url)
    })
    const refresh = (c) => run(() => api(`/api/integrations/meta/connections/${c.connection_id}/refresh`, { method: 'POST' }), (r) => (r.valid === false ? 'Facebook says this login is no longer valid - reconnect it' : `Connection OK - ${r.pages ?? 0} Pages`))
    const disconnect = async (c) => {
        const ok = await Swal.fire({
            title: `Disconnect ${c.meta_user_name || 'this Facebook account'}?`,
            text: 'Its Pages stop working in the CRM (posting, comments, leads, inbox). The app is also removed from the Facebook account.',
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Disconnect',
        })
        if (ok.isConfirmed) run(() => api(`/api/integrations/meta/connections/${c.connection_id}`, { method: 'DELETE' }), 'Facebook disconnected')
    }
    const updatePage = (p, body, msg) => run(() => api(`/api/integrations/meta/pages/${p.meta_page_id}`, { method: 'PATCH', body }), msg)

    const canManage = data?.can_manage
    return (
        <div className="content-area">
            <PerfectScrollbar>
                <div className="page-header">
                    <div className="page-header-left"><h5 className="m-b-10 mb-0">Integrations</h5></div>
                </div>
                <div className="content-area-body">
                    <div className="card mb-4">
                        <div className="card-body">
                            <div className="d-flex align-items-start gap-3 flex-wrap">
                                <div className="avatar-text avatar-lg bg-soft-primary text-primary"><FiFacebook size={22} /></div>
                                <div className="flex-grow-1">
                                    <h6 className="mb-1">Facebook (Meta)</h6>
                                    <p className="fs-13 text-muted mb-2">
                                        Connect the Facebook account that manages your (or your clients') Pages. The workspace can then publish and schedule posts,
                                        answer comments and Messenger, and receive Lead Ads leads in the CRM. Access tokens are stored encrypted and never shown.
                                    </p>
                                    {data && !data.configured && (
                                        <div className="alert alert-warning py-2 fs-13 mb-0"><FiAlertTriangle className="me-2" />Facebook is not set up on this server yet (Meta app ID / secret). Ask your platform administrator.</div>
                                    )}
                                </div>
                                {canManage && data?.configured && (
                                    <button type="button" className="btn btn-primary" disabled={busy} onClick={connect} data-testid="connect-facebook">
                                        <FiLink className="me-2" />{data.connections.length ? 'Connect another account' : 'Connect Facebook'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* connections */}
                    {data?.connections?.length > 0 && (
                        <div className="card mb-4">
                            <div className="card-header"><h6 className="mb-0">Connected accounts</h6></div>
                            <div className="table-responsive">
                                <table className="table table-hover mb-0">
                                    <thead><tr><th>Facebook account</th><th>Status</th><th>Valid until</th><th>Connected by</th>{canManage && <th className="text-end">Actions</th>}</tr></thead>
                                    <tbody>
                                        {data.connections.map((c) => (
                                            <tr key={c.connection_id} data-testid="connection-row">
                                                <td>
                                                    <div className="fw-semibold">{c.meta_user_name || c.meta_user_id}</div>
                                                    <div className="fs-11 text-muted">{c.token_type === 'system_user' ? 'Business system user' : c.token_type === 'legacy_env' ? 'Imported from server settings' : 'Facebook login'}</div>
                                                </td>
                                                <td><Status s={c.status} reason={c.status_reason} />{c.status_reason && c.status !== 'active' && <div className="fs-11 text-muted mt-1">{c.status_reason}</div>}</td>
                                                <td className="fs-13">{c.token_type === 'legacy_env' ? '-' : c.token_expires_at ? fmt(c.token_expires_at) : 'Does not expire'}{c.data_access_expires_at && <div className="fs-11 text-muted">Data access until {fmt(c.data_access_expires_at)}</div>}</td>
                                                <td className="fs-13">{c.connector?.full_name || '-'}<div className="fs-11 text-muted">{fmt(c.created_at)}</div></td>
                                                {canManage && (
                                                    <td className="text-end text-nowrap">
                                                        {c.status !== 'active' && data.configured && <button type="button" className="btn btn-sm btn-primary me-2" disabled={busy} onClick={connect}>Reconnect</button>}
                                                        {c.token_type !== 'legacy_env' && <button type="button" className="btn btn-sm btn-light me-2" disabled={busy} onClick={() => refresh(c)} title="Check now"><FiRefreshCw /></button>}
                                                        <button type="button" className="btn btn-sm btn-light-danger" disabled={busy} onClick={() => disconnect(c)} title="Disconnect"><FiSlash /></button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* pages */}
                    {data && (
                        <div className="card">
                            <div className="card-header"><h6 className="mb-0">Facebook Pages</h6></div>
                            {data.pages.length === 0 ? (
                                <div className="card-body text-muted fs-13">No Pages yet. {canManage ? 'Connect Facebook and select the Pages in the Facebook dialog.' : 'Ask an administrator to connect Facebook.'}</div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0">
                                        <thead><tr><th>Page</th><th>Status</th><th>Client</th><th>Webhooks</th><th className="text-end">Use in CRM</th></tr></thead>
                                        <tbody>
                                            {data.pages.map((p) => (
                                                <tr key={p.meta_page_id} data-testid="page-row">
                                                    <td>
                                                        <div className="d-flex align-items-center gap-2">
                                                            {p.picture_url ? <img src={p.picture_url} alt="" width={28} height={28} className="rounded-circle" /> : <FiFacebook />}
                                                            <div><div className="fw-semibold">{p.name}</div><div className="fs-11 text-muted">{p.category || ''}</div></div>
                                                        </div>
                                                    </td>
                                                    <td><Status s={p.status} reason={p.status_reason} /></td>
                                                    <td style={{ minWidth: 180 }}>
                                                        <select className="form-select form-select-sm" disabled={!canManage || busy} value={p.client_id || ''} aria-label={`Client of ${p.name}`}
                                                            onChange={(e) => updatePage(p, { client_id: e.target.value ? Number(e.target.value) : null }, 'Page linked')}>
                                                            <option value="">No client (agency Page)</option>
                                                            {clients.map((c) => <option key={c.client_id} value={c.client_id}>{c.company_name}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="fs-12">{p.webhook_subscribed_at ? <span className="text-success"><FiCheckCircle className="me-1" />Leads & messages arrive live</span> : <span className="text-muted">Not subscribed</span>}</td>
                                                    <td className="text-end">
                                                        <div className="form-check form-switch d-inline-block">
                                                            <input className="form-check-input" type="checkbox" role="switch" checked={p.is_enabled} disabled={!canManage || busy} aria-label={`Use ${p.name}`}
                                                                onChange={(e) => updatePage(p, { is_enabled: e.target.checked }, e.target.checked ? 'Page switched on' : 'Page switched off')} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                    {data && (
                        <p className="fs-12 text-muted mt-3">
                            Facebook redirect URL for the Meta app: <code>{data.redirect_uri}</code>
                        </p>
                    )}
                </div>
            </PerfectScrollbar>
            <Footer />
        </div>
    )
}

export default IntegrationsPage
