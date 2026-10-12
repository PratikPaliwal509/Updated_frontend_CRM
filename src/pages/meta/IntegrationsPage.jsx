import React, { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'
import PerfectScrollbar from 'react-perfect-scrollbar'
import { FiFacebook, FiRefreshCw, FiLink, FiSlash, FiAlertTriangle, FiCheckCircle, FiList, FiBarChart2 } from 'react-icons/fi'
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
// Facebook Page tasks of the connecting person -> what the CRM can do on that Page
const TASKS = { MANAGE: 'Full control', CREATE_CONTENT: 'Posts', MODERATE: 'Comments', MESSAGING: 'Messenger', ADVERTISE: 'Ads & leads', ANALYZE: 'Insights' }
const Tasks = ({ tasks }) => {
    const list = Array.isArray(tasks) ? tasks : []
    if (!list.length) return <span className="fs-11 text-muted">-</span>
    if (list.includes('MANAGE')) return <span className="badge bg-soft-primary text-primary">{TASKS.MANAGE}</span>
    return <div className="d-flex flex-wrap gap-1">{list.filter((t) => TASKS[t]).map((t) => <span key={t} className="badge bg-soft-info text-info">{TASKS[t]}</span>)}</div>
}
// what each permission is used for (shown when the person declined it in the Facebook dialog)
const SCOPE_USE = {
    pages_show_list: 'list your Pages', pages_manage_posts: 'publish posts', pages_read_engagement: 'read posts and insights',
    pages_manage_engagement: 'answer and hide comments', pages_read_user_content: 'read visitor posts and comments', pages_manage_metadata: 'receive leads and messages live (webhooks)',
    pages_messaging: 'Messenger inbox', read_insights: 'Page reports', leads_retrieval: 'Lead Ads leads', business_management: 'Pages owned by a Business portfolio',
    ads_read: 'read ad accounts, campaigns and ad reports', ads_management: 'create and change campaigns, ad sets and ads',
}
const ACCOUNT_STATUS = { 1: 'Active', 2: 'Disabled', 3: 'Unsettled', 7: 'Pending review', 9: 'In grace period', 100: 'Pending closure', 101: 'Closed' }

/** Choose which Pages / ad accounts of a Facebook login this workspace uses. */
const SelectionDialog = ({ selection, onClose, onSaved }) => {
    const [pages, setPages] = useState(() => new Set(selection.pages.filter((p) => p.is_enabled || selection.fresh).map((p) => p.meta_page_id)))
    const [ads, setAds] = useState(() => new Set(selection.ad_accounts.filter((a) => a.is_enabled).map((a) => a.meta_ad_account_id)))
    const [saving, setSaving] = useState(false)
    const toggle = (set, setter, id) => { const n = new Set(set); if (n.has(id)) n.delete(id); else n.add(id); setter(n) }
    const save = async () => {
        setSaving(true)
        try {
            const r = await api(`/api/integrations/meta/connections/${selection.connection_id}/selection`, { method: 'POST', body: { page_ids: [...pages], ad_account_ids: [...ads] } })
            toast.success(`Saved - ${r.pages_enabled} Page${r.pages_enabled === 1 ? '' : 's'} and ${r.ad_accounts_enabled} ad account${r.ad_accounts_enabled === 1 ? '' : 's'} in use`)
            onSaved()
        } catch (e) {
            toast.error(e.message)
        } finally {
            setSaving(false)
        }
    }
    return (
        <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} data-testid="meta-selection-dialog">
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Choose what this workspace uses{selection.name ? ` - ${selection.name}` : ''}</h5>
                        <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
                    </div>
                    <div className="modal-body">
                        <p className="fs-13 text-muted">Only the Pages and ad accounts you tick are used by the CRM. You can change this later.</p>
                        <h6 className="fs-13 fw-bold">Facebook Pages</h6>
                        {selection.pages.length === 0 ? <p className="fs-13 text-muted">This Facebook account did not share any Page.</p> : (
                            <ul className="list-unstyled mb-4">
                                {selection.pages.map((p) => (
                                    <li key={p.meta_page_id} className="d-flex align-items-center gap-2 py-2 border-bottom">
                                        <input className="form-check-input mt-0" type="checkbox" id={`sel-page-${p.meta_page_id}`} checked={pages.has(p.meta_page_id)} onChange={() => toggle(pages, setPages, p.meta_page_id)} />
                                        <label className="form-check-label flex-grow-1" htmlFor={`sel-page-${p.meta_page_id}`}>
                                            <span className="fw-semibold">{p.name}</span> <span className="fs-11 text-muted">{p.category || ''}</span>
                                        </label>
                                        <Tasks tasks={p.tasks} />
                                    </li>
                                ))}
                            </ul>
                        )}
                        <h6 className="fs-13 fw-bold">Ad accounts</h6>
                        {selection.ad_accounts.length === 0 ? <p className="fs-13 text-muted mb-0">No ad account was shared (ads permissions not granted, or the person has no ad account).</p> : (
                            <ul className="list-unstyled mb-0">
                                {selection.ad_accounts.map((a) => (
                                    <li key={a.meta_ad_account_id} className="d-flex align-items-center gap-2 py-2 border-bottom">
                                        <input className="form-check-input mt-0" type="checkbox" id={`sel-ad-${a.meta_ad_account_id}`} checked={ads.has(a.meta_ad_account_id)} onChange={() => toggle(ads, setAds, a.meta_ad_account_id)} />
                                        <label className="form-check-label flex-grow-1" htmlFor={`sel-ad-${a.meta_ad_account_id}`}>
                                            <span className="fw-semibold">{a.name}</span> <span className="fs-11 text-muted">{a.ad_account_id}{a.business_name ? ` · ${a.business_name}` : ''}{a.currency ? ` · ${a.currency}` : ''}</span>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-light" onClick={onClose} disabled={saving}>Later</button>
                        <button type="button" className="btn btn-primary" onClick={save} disabled={saving || (pages.size === 0 && ads.size === 0)} data-testid="meta-selection-save">
                            {saving ? 'Saving...' : 'Use selected'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

/**
 * Settings → Integrations: connect Facebook (Login for Business), choose Pages and ad accounts,
 * see each connection's health and declined permissions, link Pages / ad accounts to clients.
 * Tokens are never sent to the browser.
 */
const IntegrationsPage = () => {
    const [data, setData] = useState(null)
    const [clients, setClients] = useState([])
    const [busy, setBusy] = useState(false)
    const [selection, setSelection] = useState(null)
    const location = useLocation()
    const navigate = useNavigate()

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
    // arriving from the Facebook callback: open the selection step once
    useEffect(() => {
        if (location.state?.selection) {
            setSelection({ ...location.state.selection, fresh: true })
            navigate(location.pathname, { replace: true, state: null })
        }
    }, [location, navigate])

    const run = async (fn, ok) => {
        setBusy(true)
        try { const r = await fn(); if (ok) toast.success(typeof ok === 'function' ? ok(r) : ok); await load() } catch (e) { toast.error(e.message) } finally { setBusy(false) }
    }

    const connect = (rerequest = false) => run(async () => {
        const r = await api('/api/integrations/meta/connect', { method: 'POST', body: rerequest ? { rerequest: true } : {} })
        window.location.assign(r.url)
    })
    const refresh = (c) => run(() => api(`/api/integrations/meta/connections/${c.connection_id}/refresh`, { method: 'POST' }), (r) => (r.valid === false ? 'Facebook says this login is no longer valid - reconnect it' : `Connection OK - ${r.pages ?? 0} Pages, ${r.ad_accounts ?? 0} ad accounts`))
    const disconnect = async (c) => {
        const ok = await Swal.fire({
            title: `Disconnect ${c.meta_user_name || 'this Facebook account'}?`,
            text: 'Its Pages and ad accounts stop working in the CRM (posting, comments, leads, inbox, ads). The app is also removed from the Facebook account.',
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Disconnect',
        })
        if (ok.isConfirmed) run(() => api(`/api/integrations/meta/connections/${c.connection_id}`, { method: 'DELETE' }), 'Facebook disconnected')
    }
    const updatePage = (p, body, msg) => run(() => api(`/api/integrations/meta/pages/${p.meta_page_id}`, { method: 'PATCH', body }), msg)
    const updateAd = (a, body, msg) => run(() => api(`/api/integrations/meta/ad-accounts/${a.meta_ad_account_id}`, { method: 'PATCH', body }), msg)
    const openSelection = (c) => setSelection({
        connection_id: c.connection_id, name: c.meta_user_name,
        pages: data.pages.filter((p) => p.connection_id === c.connection_id && p.status !== 'disconnected'),
        ad_accounts: (data.ad_accounts || []).filter((a) => a.connection_id === c.connection_id && a.status !== 'disconnected'),
    })

    const canManage = data?.can_manage
    const adAccounts = data?.ad_accounts || []
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
                                        Connect the Facebook account that manages your (or your clients') Pages and ad accounts, then choose which ones this workspace uses.
                                        The CRM can then publish and schedule posts, answer comments and Messenger, receive Lead Ads leads and run Meta Ads campaigns.
                                        Access tokens are stored encrypted for this workspace only and never shown.
                                    </p>
                                    {data && !data.configured && (
                                        <div className="alert alert-warning py-2 fs-13 mb-0"><FiAlertTriangle className="me-2" />Facebook is not set up on this server yet (Meta app ID / secret). Ask your platform administrator.</div>
                                    )}
                                </div>
                                {canManage && data?.configured && (
                                    <button type="button" className="btn btn-primary" disabled={busy} onClick={() => connect()} data-testid="connect-facebook">
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
                                            <React.Fragment key={c.connection_id}>
                                                <tr data-testid="connection-row">
                                                    <td>
                                                        <div className="fw-semibold">{c.meta_user_name || c.meta_user_id}</div>
                                                        <div className="fs-11 text-muted">{c.token_type === 'system_user' ? 'Business system user' : 'Facebook login'}</div>
                                                    </td>
                                                    <td><Status s={c.status} reason={c.status_reason} />{c.status_reason && c.status !== 'active' && <div className="fs-11 text-muted mt-1">{c.status_reason}</div>}</td>
                                                    <td className="fs-13">{c.token_expires_at ? fmt(c.token_expires_at) : 'Does not expire'}{c.data_access_expires_at && <div className="fs-11 text-muted">Data access until {fmt(c.data_access_expires_at)}</div>}</td>
                                                    <td className="fs-13">{c.connector?.full_name || '-'}<div className="fs-11 text-muted">{fmt(c.created_at)}</div></td>
                                                    {canManage && (
                                                        <td className="text-end text-nowrap">
                                                            {c.status !== 'active' && data.configured && <button type="button" className="btn btn-sm btn-primary me-2" disabled={busy} onClick={() => connect()}>Reconnect</button>}
                                                            {c.status === 'active' && <button type="button" className="btn btn-sm btn-light me-2" disabled={busy} onClick={() => openSelection(c)} title="Choose Pages and ad accounts" data-testid="choose-assets"><FiList /></button>}
                                                            <button type="button" className="btn btn-sm btn-light me-2" disabled={busy} onClick={() => refresh(c)} title="Check now"><FiRefreshCw /></button>
                                                            <button type="button" className="btn btn-sm btn-light-danger" disabled={busy} onClick={() => disconnect(c)} title="Disconnect"><FiSlash /></button>
                                                        </td>
                                                    )}
                                                </tr>
                                                {c.declined_scopes?.length > 0 && (
                                                    <tr data-testid="declined-row">
                                                        <td colSpan={canManage ? 5 : 4} className="bg-soft-warning">
                                                            <div className="d-flex align-items-center gap-3 flex-wrap fs-12">
                                                                <FiAlertTriangle className="text-warning" />
                                                                <div className="flex-grow-1">
                                                                    Permissions declined in Facebook: {c.declined_scopes.map((s) => <span key={s} className="me-2"><code>{s}</code>{SCOPE_USE[s] ? ` (${SCOPE_USE[s]})` : ''}</span>)}
                                                                    <div className="text-muted">Those features will not work for this account until the permissions are granted.</div>
                                                                </div>
                                                                {canManage && data.configured && <button type="button" className="btn btn-sm btn-warning" disabled={busy} onClick={() => connect(true)} data-testid="rerequest">Re-request permissions</button>}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* pages */}
                    {data && (
                        <div className="card mb-4">
                            <div className="card-header"><h6 className="mb-0">Facebook Pages</h6></div>
                            {data.pages.length === 0 ? (
                                <div className="card-body text-muted fs-13">No Pages yet. {canManage ? 'Connect Facebook, allow the Pages in the Facebook dialog, then tick them in the selection step.' : 'Ask an administrator to connect Facebook.'}</div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0">
                                        <thead><tr><th>Page</th><th>Status</th><th>Allowed actions</th><th>Client</th><th>Webhooks</th><th className="text-end">Use in CRM</th></tr></thead>
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
                                                    <td style={{ maxWidth: 220 }}><Tasks tasks={p.tasks} /></td>
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
                                                            <input className="form-check-input" type="checkbox" role="switch" checked={p.is_enabled} disabled={!canManage || busy || p.status === 'disconnected'} aria-label={`Use ${p.name}`}
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

                    {/* ad accounts */}
                    {data && (
                        <div className="card">
                            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                                <h6 className="mb-0"><FiBarChart2 className="me-2" />Meta ad accounts</h6>
                                <div className="form-check form-switch mb-0" title="Members without the Meta Ads approve permission then need an approver to switch ads on or raise budgets">
                                    <input className="form-check-input" type="checkbox" role="switch" id="ads-approval" checked={!!data.settings?.ads_approval_required} disabled={!canManage || busy}
                                        onChange={(e) => run(() => api('/api/integrations/meta/settings', { method: 'PATCH', body: { ads_approval_required: e.target.checked } }), e.target.checked ? 'Ad spend changes now need approval' : 'Approval switched off')} data-testid="ads-approval-switch" />
                                    <label className="form-check-label fs-12" htmlFor="ads-approval">Approval needed to switch ads on or raise budgets</label>
                                </div>
                            </div>
                            {adAccounts.length === 0 ? (
                                <div className="card-body text-muted fs-13">No ad accounts yet. {canManage ? 'Connect a Facebook account that can use an ad account and allow the ads permissions.' : 'Ask an administrator to connect Facebook.'}</div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0">
                                        <thead><tr><th>Ad account</th><th>Status</th><th>Business</th><th>Client</th><th className="text-end">Use in CRM</th></tr></thead>
                                        <tbody>
                                            {adAccounts.map((a) => (
                                                <tr key={a.meta_ad_account_id} data-testid="ad-account-row">
                                                    <td><div className="fw-semibold">{a.name}</div><div className="fs-11 text-muted">{a.ad_account_id}{a.currency ? ` · ${a.currency}` : ''}{a.timezone_name ? ` · ${a.timezone_name}` : ''}</div></td>
                                                    <td><Status s={a.status} reason={a.status_reason} />{a.account_status && a.account_status !== 1 && <div className="fs-11 text-muted mt-1">Meta: {ACCOUNT_STATUS[a.account_status] || a.account_status}</div>}</td>
                                                    <td className="fs-13">{a.business_name || '-'}</td>
                                                    <td style={{ minWidth: 180 }}>
                                                        <select className="form-select form-select-sm" disabled={!canManage || busy} value={a.client_id || ''} aria-label={`Client of ${a.name}`}
                                                            onChange={(e) => updateAd(a, { client_id: e.target.value ? Number(e.target.value) : null }, 'Ad account linked')}>
                                                            <option value="">No client (agency account)</option>
                                                            {clients.map((c) => <option key={c.client_id} value={c.client_id}>{c.company_name}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="text-end">
                                                        <div className="form-check form-switch d-inline-block">
                                                            <input className="form-check-input" type="checkbox" role="switch" checked={a.is_enabled} disabled={!canManage || busy || a.status === 'disconnected'} aria-label={`Use ${a.name}`}
                                                                onChange={(e) => updateAd(a, { is_enabled: e.target.checked }, e.target.checked ? 'Ad account switched on' : 'Ad account switched off')} />
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
            {selection && <SelectionDialog selection={selection} onClose={() => setSelection(null)} onSaved={() => { setSelection(null); load() }} />}
        </div>
    )
}

export default IntegrationsPage
