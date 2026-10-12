import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import PerfectScrollbar from 'react-perfect-scrollbar'
import Footer from '@/components/shared/Footer'
import { api } from '@/utils/authSession'

const EVENTS = [
  'signup', 'login_success', 'login_failed', 'login_locked', 'logout', 'logout_all', 'session_revoked',
  'refresh_token_reuse', 'password_changed', 'password_reset_requested', 'password_reset_completed',
  'email_verification_sent', 'email_verified', 'mfa_enabled', 'mfa_disabled', 'mfa_backup_codes_regenerated',
  'mfa_failed', 'sso_login', 'invitation_sent', 'invitation_revoked', 'invitation_accepted', 'role_changed',
  'role_created', 'role_updated', 'role_deleted', 'user_created', 'user_deactivated', 'user_activated',
  'ownership_transferred', 'workspace_closed', 'workspace_status_changed', 'workspace_settings_changed',
  'workspace_entitlements_changed', 'onboarding_completed', 'integration_connected', 'integration_disconnected',
]
const label = (e) => e.replace(/_/g, ' ')
const who = (u) => (u ? u.full_name || u.email : '-')
const PAGE = 50

/** Settings → Security log: the workspace's account / security audit trail (read-only). */
const SecurityLogPage = () => {
  const [rows, setRows] = useState([])
  const [event, setEvent] = useState('')
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const q = new URLSearchParams({ limit: String(PAGE), offset: String(offset), ...(event ? { event } : {}) })
    api(`/api/workspace/security-events?${q}`)
      .then(setRows)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [event, offset])

  return (
    <div className="content-area">
      <PerfectScrollbar>
        <div className="page-header">
          <div className="page-header-left"><h5 className="m-b-10 mb-0">Security log</h5></div>
          <div className="page-header-right ms-auto">
            <select className="form-select form-select-sm" value={event} onChange={(e) => { setOffset(0); setEvent(e.target.value) }}>
              <option value="">All events</option>
              {EVENTS.map((e) => <option key={e} value={e}>{label(e)}</option>)}
            </select>
          </div>
        </div>
        <div className="content-area-body">
          <div className="card mb-0">
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table mb-0">
                  <thead><tr><th>When</th><th>Event</th><th>User</th><th>By</th><th>IP address</th></tr></thead>
                  <tbody>
                    {loading && <tr><td colSpan={5} className="text-muted">Loading...</td></tr>}
                    {!loading && rows.length === 0 && <tr><td colSpan={5} className="text-muted">No events.</td></tr>}
                    {!loading && rows.map((r) => (
                      <tr key={r.event_id || `${r.created_at}-${r.event}`}>
                        <td className="text-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                        <td className="text-capitalize">{label(r.event)}</td>
                        <td>{who(r.user)}</td>
                        <td>{who(r.actor)}</td>
                        <td>{r.ip_address || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card-footer d-flex justify-content-between">
              <button className="btn btn-sm btn-light" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Newer</button>
              <button className="btn btn-sm btn-light" disabled={rows.length < PAGE} onClick={() => setOffset(offset + PAGE)}>Older</button>
            </div>
          </div>
        </div>
        <Footer />
      </PerfectScrollbar>
    </div>
  )
}

export default SecurityLogPage
