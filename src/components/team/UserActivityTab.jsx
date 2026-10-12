import React, { useEffect, useState } from 'react'
import { api } from '@/utils/authSession'
import { fmtDateTime, Loading, Empty, label } from '@/components/clientMgmt/common'

const LABEL = {
    login_success: 'Signed in', sso_login: 'Signed in with Google', login_failed: 'Failed sign-in', login_locked: 'Locked after failed sign-ins',
    mfa_failed: 'Wrong 2FA code', logout: 'Signed out', logout_all: 'Signed out everywhere', session_revoked: 'Session ended',
    password_changed: 'Password changed', password_reset_completed: 'Password reset', refresh_token_reuse: 'Suspicious token reuse (session killed)',
}
const BAD = ['login_failed', 'login_locked', 'mfa_failed', 'refresh_token_reuse']
const device = (ua) => {
    if (!ua) return '-'
    const b = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
    const os = /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : ''
    return `${b}${os ? ` on ${os}` : ''}`
}

/** F-038: sign-in history of one user (user view page). */
const UserActivityTab = ({ userId }) => {
    const [rows, setRows] = useState(null)
    const [error, setError] = useState(null)
    useEffect(() => { api(`/api/users/${userId}/login-history`).then(setRows).catch((e) => { setRows([]); setError(e.message) }) }, [userId])
    return (
        <div className="tab-pane fade" id="activityTab" role="tabpanel">
            <div className="card"><div className="card-header"><h5 className="card-title mb-0">Sign-in history</h5></div>
                <div className="card-body p-0">
                    {rows === null ? <Loading /> : error ? <Empty>{error}</Empty> : rows.length === 0 ? <Empty>No sign-in activity recorded yet.</Empty> : (
                        <table className="table mb-0">
                            <thead><tr><th>When</th><th>Event</th><th>Device</th><th>IP address</th></tr></thead>
                            <tbody>{rows.map((r) => (
                                <tr key={r.event_id}>
                                    <td className="text-nowrap">{fmtDateTime(r.created_at)}</td>
                                    <td className={BAD.includes(r.event) ? 'text-danger' : ''}>{LABEL[r.event] || label(r.event)}</td>
                                    <td>{device(r.user_agent)}</td>
                                    <td>{r.ip_address || '-'}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    )
}

export default UserActivityTab
