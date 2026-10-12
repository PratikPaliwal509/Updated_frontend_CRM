import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import PerfectScrollbar from 'react-perfect-scrollbar'
import Footer from '@/components/shared/Footer'
import { api, loadMe, logout } from '@/utils/authSession'
import { API_BASE_URL } from '../../config/api'

const FIELDS = [
    ['agency_name', 'Company name', 'text', true],
    ['email', 'Company email', 'email'],
    ['phone', 'Phone', 'text'],
    ['website', 'Website', 'text'],
    ['industry', 'Industry', 'text'],
    ['address', 'Address', 'text'],
    ['city', 'City', 'text'],
    ['state', 'State', 'text'],
    ['country', 'Country', 'text'],
    ['postal_code', 'Postal code', 'text'],
    ['timezone', 'Timezone', 'text'],
    ['currency', 'Currency', 'text'],
    ['date_format', 'Date format', 'text'],
    ['time_format', 'Time format', 'text'],
]

/** Settings → Workspace: company profile, security policy, ownership, close workspace. */
const WorkspaceSettingsPage = () => {
    const [ws, setWs] = useState(null)
    const [form, setForm] = useState({})
    const [me, setMe] = useState(null)
    const [members, setMembers] = useState([])
    const [transfer, setTransfer] = useState({ user_id: '', password: '' })
    const [close, setClose] = useState({ confirm_name: '', password: '' })
    const [busy, setBusy] = useState(false)
    const navigate = useNavigate()

    const load = async () => {
        try {
            const [w, m] = await Promise.all([api('/api/workspace'), loadMe(true)])
            setWs(w)
            setMe(m)
            setForm(Object.fromEntries(FIELDS.map(([k]) => [k, w[k] || ''])))
            if (m.workspace?.is_owner) {
                const res = await fetch(`${API_BASE_URL}/api/users/by-agency?agency_id=${w.agency_id}`)
                const json = await res.json().catch(() => ({}))
                setMembers((json.data || []).filter((u) => u.user_id !== m.user.user_id && u.is_active !== false && (u.user_type || 'staff') === 'staff'))
            }
        } catch (err) {
            toast.error(err.message)
        }
    }
    useEffect(() => { load() }, [])

    const run = async (fn) => {
        setBusy(true)
        try { await fn() } catch (err) { toast.error(err.message) } finally { setBusy(false) }
    }

    const save = (e) => {
        e.preventDefault()
        run(async () => {
            setWs(await api('/api/workspace', { method: 'PUT', body: form }))
            toast.success('Workspace saved')
        })
    }
    const toggleMfa = () => run(async () => {
        setWs(await api('/api/workspace', { method: 'PUT', body: { mfa_required: !ws.mfa_required } }))
        toast.success(!ws.mfa_required ? 'Two-factor authentication is now required for every member' : 'Two-factor requirement removed')
    })
    const doTransfer = (e) => {
        e.preventDefault()
        if (!window.confirm('Transfer ownership? You will keep your role but lose owner-only controls.')) return
        run(async () => {
            await api('/api/workspace/transfer-ownership', { method: 'POST', body: { user_id: Number(transfer.user_id), password: transfer.password } })
            toast.success('Ownership transferred')
            setTransfer({ user_id: '', password: '' })
            await load()
        })
    }
    const doClose = (e) => {
        e.preventDefault()
        if (!window.confirm('Close this workspace? Every member will be signed out and blocked. Data is kept and can be restored by platform support.')) return
        run(async () => {
            await api('/api/workspace/close', { method: 'POST', body: close })
            await logout()
            navigate('/authentication/login', { replace: true })
        })
    }

    const isOwner = me?.workspace?.is_owner
    return (
        <div className="content-area">
            <PerfectScrollbar>
                <div className="page-header">
                    <div className="page-header-left"><h5 className="m-b-10 mb-0">Workspace</h5></div>
                </div>
                <div className="content-area-body">
                    {!ws ? <div className="text-muted p-4">Loading...</div> : (
                        <>
                            <div className="card mb-4">
                                <div className="card-header d-flex justify-content-between align-items-center">
                                    <h5 className="card-title mb-0">Company profile</h5>
                                    <span className="fs-12 text-muted">
                                        {ws.members.active} active member(s) · {ws.members.pending_invitations} pending invitation(s)
                                        {ws.usage_limits?.team_members ? ` · seat limit ${ws.usage_limits.team_members}` : ''}
                                    </span>
                                </div>
                                <div className="card-body">
                                    <form onSubmit={save}>
                                        <div className="row">
                                            {FIELDS.map(([k, label, type, req]) => (
                                                <div className="col-md-6 mb-3" key={k}>
                                                    <label className="form-label">{label}</label>
                                                    <input type={type} className="form-control" value={form[k] || ''} required={!!req}
                                                        onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="fs-11 text-muted mb-3">Owner: {ws.owner ? `${ws.owner.full_name} (${ws.owner.email})` : '-'}</div>
                                        <button className="btn btn-primary" disabled={busy}>Save changes</button>
                                    </form>
                                </div>
                            </div>

                            <div className="card mb-4">
                                <div className="card-header"><h5 className="card-title mb-0">Security policy</h5></div>
                                <div className="card-body d-flex justify-content-between align-items-center flex-wrap gap-2">
                                    <div>
                                        <div className="fw-semibold">Require two-factor authentication</div>
                                        <div className="fs-12 text-muted">Members without 2FA are sent to set it up before they can use the app. You must have 2FA on yourself first.</div>
                                    </div>
                                    <button className={`btn ${ws.mfa_required ? 'btn-outline-danger' : 'btn-primary'}`} onClick={toggleMfa} disabled={busy}>
                                        {ws.mfa_required ? 'Stop requiring' : 'Require 2FA'}
                                    </button>
                                </div>
                            </div>

                            {isOwner && (
                                <>
                                    <div className="card mb-4">
                                        <div className="card-header"><h5 className="card-title mb-0">Transfer ownership</h5></div>
                                        <div className="card-body">
                                            <form onSubmit={doTransfer} className="d-flex gap-2 flex-wrap">
                                                <select className="form-select" style={{ maxWidth: 280 }} value={transfer.user_id} onChange={(e) => setTransfer({ ...transfer, user_id: e.target.value })} required>
                                                    <option value="">Choose a team member</option>
                                                    {members.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name || u.email} ({u.email})</option>)}
                                                </select>
                                                <input type="password" className="form-control" style={{ maxWidth: 220 }} placeholder="Your password" value={transfer.password} onChange={(e) => setTransfer({ ...transfer, password: e.target.value })} required />
                                                <button className="btn btn-warning" disabled={busy}>Transfer</button>
                                            </form>
                                        </div>
                                    </div>
                                    <div className="card mb-4 border-danger">
                                        <div className="card-header"><h5 className="card-title mb-0 text-danger">Close workspace</h5></div>
                                        <div className="card-body">
                                            <p className="fs-12 text-muted">Signs out and blocks every member. Data is retained (not deleted) and the workspace can be reopened by platform support.</p>
                                            <form onSubmit={doClose} className="d-flex gap-2 flex-wrap">
                                                <input className="form-control" style={{ maxWidth: 260 }} placeholder={`Type "${ws.agency_name}"`} value={close.confirm_name} onChange={(e) => setClose({ ...close, confirm_name: e.target.value })} required />
                                                <input type="password" className="form-control" style={{ maxWidth: 220 }} placeholder="Your password" value={close.password} onChange={(e) => setClose({ ...close, password: e.target.value })} required />
                                                <button className="btn btn-danger" disabled={busy}>Close workspace</button>
                                            </form>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
                <Footer />
            </PerfectScrollbar>
        </div>
    )
}

export default WorkspaceSettingsPage
