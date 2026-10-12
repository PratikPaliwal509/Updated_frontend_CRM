import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import { api } from '@/utils/authSession'
import { API_BASE_URL } from '../../config/api'

const BADGE = { pending: 'bg-soft-warning text-warning', accepted: 'bg-soft-success text-success', revoked: 'bg-soft-danger text-danger', expired: 'bg-soft-secondary text-muted' }
const fmt = (d) => (d ? new Date(d).toLocaleDateString() : '-')

/** Users → Invitations: invite team members (with a role) or client-portal users (for a client). */
const InvitationsPage = () => {
    const [rows, setRows] = useState([])
    const [roles, setRoles] = useState([])
    const [clients, setClients] = useState([])
    const [form, setForm] = useState({ email: '', kind: 'staff', role_id: '', client_id: '' })
    const [busy, setBusy] = useState(false)

    const loadRows = async () => setRows(await api('/api/invitations'))
    useEffect(() => {
        (async () => {
            try {
                await loadRows()
                const r = await api('/api/roles')
                setRoles((r || []).filter((x) => x.role_name !== 'Client'))
                const res = await fetch(`${API_BASE_URL}/api/clients/clientsAll?agency_id=0`)
                const json = await res.json().catch(() => ({}))
                setClients(json.clients || json.data || [])
            } catch (err) {
                toast.error(err.message)
            }
        })()
    }, [])

    const run = async (fn) => {
        setBusy(true)
        try { await fn() } catch (err) { toast.error(err.message) } finally { setBusy(false) }
    }

    const submit = (e) => {
        e.preventDefault()
        const body = form.kind === 'client'
            ? { email: form.email, client_id: Number(form.client_id) }
            : { email: form.email, role_id: Number(form.role_id) }
        run(async () => {
            await api('/api/invitations', { method: 'POST', body })
            toast.success(`Invitation sent to ${form.email}`)
            setForm({ ...form, email: '' })
            await loadRows()
        })
    }
    const resend = (id) => run(async () => { await api(`/api/invitations/${id}/resend`, { method: 'POST' }); toast.success('Invitation re-sent'); await loadRows() })
    const revoke = (id) => run(async () => {
        if (!window.confirm('Revoke this invitation? The link will stop working.')) return
        await api(`/api/invitations/${id}`, { method: 'DELETE' })
        await loadRows()
    })

    return (
        <>
            <PageHeader />
            <div className="main-content">
                <div className="row">
                    <div className="col-lg-4">
                        <div className="card stretch">
                            <div className="card-header"><h5 className="card-title mb-0">Invite someone</h5></div>
                            <div className="card-body">
                                <form onSubmit={submit}>
                                    <div className="mb-3">
                                        <label className="form-label">Email</label>
                                        <input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Access</label>
                                        <div className="d-flex gap-3">
                                            <label className="d-flex align-items-center gap-1"><input type="radio" checked={form.kind === 'staff'} onChange={() => setForm({ ...form, kind: 'staff' })} /> Team member</label>
                                            <label className="d-flex align-items-center gap-1"><input type="radio" checked={form.kind === 'client'} onChange={() => setForm({ ...form, kind: 'client' })} /> Client portal</label>
                                        </div>
                                    </div>
                                    {form.kind === 'staff' ? (
                                        <div className="mb-3">
                                            <label className="form-label">Role</label>
                                            <select className="form-select" value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })} required>
                                                <option value="">Choose a role</option>
                                                {roles.map((r) => <option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}
                                            </select>
                                            <div className="fs-11 text-muted mt-1">You can only grant permissions you have yourself.</div>
                                        </div>
                                    ) : (
                                        <div className="mb-3">
                                            <label className="form-label">Client</label>
                                            <select className="form-select" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} required>
                                                <option value="">Choose a client</option>
                                                {clients.map((c) => <option key={c.client_id} value={c.client_id}>{c.company_name}</option>)}
                                            </select>
                                            <div className="fs-11 text-muted mt-1">Client users only see this client's projects and tasks in the portal.</div>
                                        </div>
                                    )}
                                    <button className="btn btn-primary w-100" disabled={busy}>Send invitation</button>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-8">
                        <div className="card stretch">
                            <div className="card-header"><h5 className="card-title mb-0">Invitations</h5></div>
                            <div className="card-body p-0">
                                <div className="table-responsive">
                                    <table className="table mb-0">
                                        <thead><tr><th>Email</th><th>Access</th><th>Invited by</th><th>Expires</th><th>Status</th><th /></tr></thead>
                                        <tbody>
                                            {rows.length === 0 && <tr><td colSpan={6} className="text-muted">No invitations yet.</td></tr>}
                                            {rows.map((r) => (
                                                <tr key={r.invitation_id}>
                                                    <td>{r.email}</td>
                                                    <td>{r.client ? `Client: ${r.client.company_name}` : r.role?.role_name || '-'}</td>
                                                    <td>{r.invited_by?.full_name || '-'}</td>
                                                    <td>{fmt(r.expires_at)}</td>
                                                    <td><span className={`badge ${BADGE[r.status] || ''}`}>{r.status}</span></td>
                                                    <td className="text-end text-nowrap">
                                                        {(r.status === 'pending' || r.status === 'expired') && <button className="btn btn-sm btn-light me-1" onClick={() => resend(r.invitation_id)} disabled={busy}>Resend</button>}
                                                        {r.status === 'pending' && <button className="btn btn-sm btn-outline-danger" onClick={() => revoke(r.invitation_id)} disabled={busy}>Revoke</button>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    )
}

export default InvitationsPage
