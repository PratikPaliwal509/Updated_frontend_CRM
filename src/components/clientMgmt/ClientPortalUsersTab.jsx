import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { api } from '@/utils/authSession'
import { Empty, Loading, fmtDateTime } from './common'

/** F-023: the client's portal logins (several per client). Invite new ones from here. */
const ClientPortalUsersTab = ({ clientId }) => {
    const [rows, setRows] = useState(null)
    const [email, setEmail] = useState('')
    const load = () => api(`/api/clients/${clientId}/portal-users`).then(setRows).catch((e) => toast.error(e.message))
    useEffect(() => { load() }, [clientId])
    const invite = async (e) => {
        e.preventDefault()
        try { await api('/api/invitations', { method: 'POST', body: { email, client_id: Number(clientId) } }); toast.success(`Invitation sent to ${email}`); setEmail('') } catch (err) { toast.error(err.message) }
    }
    const toggle = async (u) => {
        try {
            await api(`/api/users/${u.user_id}/status`, { method: 'PATCH', body: { is_active: !u.is_active } })
            await load()
        } catch (e) { toast.error(e.message) }
    }
    return (
        <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">Client portal users</h5></div>
            <div className="card-body">
                <form className="d-flex gap-2 mb-4" onSubmit={invite}>
                    <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client.person@company.com" required />
                    <button className="btn btn-primary text-nowrap">Invite to portal</button>
                </form>
                <p className="fs-12 text-muted">Portal users only see this client's projects, tasks shared with them, sent invoices and documents you share. Pending invitations are under <Link to="/user/invitations">Users → Invitations</Link>.</p>
                {rows === null ? <Loading /> : rows.length === 0 ? <Empty>No portal users yet.</Empty> : (
                    <table className="table mb-0">
                        <thead><tr><th>Name</th><th>Email</th><th>Last sign-in</th><th>Status</th><th /></tr></thead>
                        <tbody>{rows.map((u) => (
                            <tr key={u.user_id}>
                                <td>{u.full_name || '-'}</td><td>{u.email}</td><td>{fmtDateTime(u.last_login_at)}</td>
                                <td>{u.is_active ? <span className="badge bg-soft-success text-success">Active</span> : <span className="badge bg-soft-danger text-danger">Disabled</span>}</td>
                                <td className="text-end"><button className="btn btn-sm btn-light" onClick={() => toggle(u)}>{u.is_active ? 'Disable' : 'Enable'}</button></td>
                            </tr>
                        ))}</tbody>
                    </table>
                )}
            </div>
        </div>
    )
}

export default ClientPortalUsersTab
