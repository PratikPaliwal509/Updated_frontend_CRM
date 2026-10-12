import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import { api } from '@/utils/authSession'
import { Empty, Loading } from '@/components/clientMgmt/common'

const ago = (d) => {
    if (!d) return 'never'
    const s = Math.round((Date.now() - new Date(d).getTime()) / 1000)
    if (s < 90) return 'just now'
    if (s < 3600) return `${Math.round(s / 60)} min ago`
    if (s < 86400) return `${Math.round(s / 3600)} h ago`
    if (s < 30 * 86400) return `${Math.round(s / 86400)} days ago`
    return new Date(d).toLocaleDateString()
}

/** F-038: who is online, when people last used the app and signed in. Refreshes every 30 s. */
const TeamActivityPage = () => {
    const [rows, setRows] = useState(null)
    const [q, setQ] = useState('')
    const [onlyOnline, setOnlyOnline] = useState(false)
    const [inactive, setInactive] = useState(false)
    const load = () => api(`/api/users/activity${inactive ? '?include_inactive=true' : ''}`).then(setRows).catch((e) => { setRows([]); toast.error(e.message) })
    useEffect(() => {
        load()
        const t = setInterval(load, 30000)
        return () => clearInterval(t)
    }, [inactive])

    const list = (rows || [])
        .filter((u) => !onlyOnline || u.online)
        .filter((u) => !q || `${u.full_name} ${u.email} ${u.team?.team_name || ''}`.toLowerCase().includes(q.toLowerCase()))
    const onlineCount = (rows || []).filter((u) => u.online).length

    return (
        <>
            <PageHeader />
            <div className="main-content">
                <div className="card mb-3"><div className="card-body d-flex gap-3 flex-wrap align-items-center">
                    <span className="fw-semibold"><span className="d-inline-block rounded-circle bg-success me-2" style={{ width: 8, height: 8 }} />{onlineCount} online now</span>
                    <input className="form-control" style={{ maxWidth: 260 }} placeholder="Search name, email, team" value={q} onChange={(e) => setQ(e.target.value)} />
                    <label className="d-flex gap-1 align-items-center mb-0"><input type="checkbox" checked={onlyOnline} onChange={(e) => setOnlyOnline(e.target.checked)} /> Online only</label>
                    <label className="d-flex gap-1 align-items-center mb-0"><input type="checkbox" checked={inactive} onChange={(e) => setInactive(e.target.checked)} /> Include deactivated</label>
                </div></div>
                <div className="card"><div className="card-body p-0">
                    {rows === null ? <Loading /> : list.length === 0 ? <Empty>No people match.</Empty> : (
                        <div className="table-responsive"><table className="table mb-0">
                            <thead><tr><th>Person</th><th>Team</th><th>Role</th><th>Status</th><th>Last seen</th><th>Last sign-in</th><th>Sessions</th><th>2FA</th></tr></thead>
                            <tbody>{list.map((u) => (
                                <tr key={u.user_id} className={u.is_active ? '' : 'text-muted'}>
                                    <td><Link to={`/user/view/${u.user_id}`}>{u.full_name || u.email}</Link><div className="fs-11 text-muted">{u.email}</div></td>
                                    <td>{u.team?.team_name || '-'}</td>
                                    <td>{u.role?.role_name || '-'}</td>
                                    <td>{!u.is_active ? <span className="badge bg-soft-secondary text-muted">Deactivated</span> : u.online ? <span className="badge bg-soft-success text-success">Online</span> : <span className="badge bg-soft-secondary text-muted">Offline</span>}</td>
                                    <td title={u.last_seen_at || ''}>{u.online ? 'now' : ago(u.last_seen_at)}</td>
                                    <td title={u.last_login_ip || ''}>{ago(u.last_login_at)}</td>
                                    <td>{u.active_sessions}</td>
                                    <td>{u.two_factor_enabled ? 'On' : 'Off'}</td>
                                </tr>
                            ))}</tbody>
                        </table></div>
                    )}
                </div></div>
            </div>
            <Footer />
        </>
    )
}

export default TeamActivityPage
