import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { api, loadMe } from '@/utils/authSession'
import { API_BASE_URL } from '../../config/api'

/** Team members: list, add (several at once) and remove. The team lead cannot be removed. */
const TeamMembersTab = ({ members: initial = [], teamId, teamLeadId }) => {
  const [members, setMembers] = useState(initial)
  const [leadId, setLeadId] = useState(teamLeadId)
  const [users, setUsers] = useState([])
  const [picked, setPicked] = useState([])
  const [busy, setBusy] = useState(false)

  const reload = async () => {
    const t = await api(`/api/teams/${teamId}`)
    setMembers(t.members || [])
    setLeadId(t.team_lead_id)
  }
  useEffect(() => {
    if (!teamId) return
    loadMe().then(async (me) => {
      const r = await fetch(`${API_BASE_URL}/api/users/by-agency?agency_id=${me.user.agency_id}`)
      const j = await r.json().catch(() => ({}))
      setUsers((j.data || []).filter((u) => u.is_active !== false && (u.user_type || 'staff') === 'staff'))
    }).catch(() => {})
  }, [teamId])

  const add = async (e) => {
    e.preventDefault()
    if (!picked.length) return
    setBusy(true)
    try {
      await api(`/api/teams/${teamId}/members`, { method: 'POST', body: { user_ids: picked.map(Number) } })
      toast.success('Members added'); setPicked([]); await reload()
    } catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }
  const remove = async (m) => {
    if (!window.confirm(`Remove ${m.first_name} ${m.last_name || ''} from this team?`)) return
    setBusy(true)
    try { await api(`/api/teams/${teamId}/members/${m.user_id}`, { method: 'DELETE' }); toast.success('Member removed'); await reload() } catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }

  const memberIds = new Set(members.map((m) => m.user_id))
  const candidates = users.filter((u) => !memberIds.has(u.user_id))
  return (
    <div className="tab-pane fade" id="membersTab" role="tabpanel">
      <div className="card">
        <div className="card-body">
          <h5 className="mb-3">Team Members</h5>
          {teamId && (
            <form className="d-flex gap-2 mb-4 flex-wrap" onSubmit={add}>
              <select multiple className="form-select" style={{ maxWidth: 420, minHeight: 90 }} value={picked} onChange={(e) => setPicked([...e.target.selectedOptions].map((o) => o.value))} aria-label="People to add">
                {candidates.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name || `${u.first_name} ${u.last_name || ''}`} ({u.email})</option>)}
              </select>
              <div className="d-flex flex-column justify-content-end">
                <button className="btn btn-primary" disabled={busy || !picked.length}>Add to team</button>
                <span className="fs-11 text-muted mt-1">Ctrl / Cmd-click to pick several</span>
              </div>
            </form>
          )}

          {members.length === 0 ? (
            <p className="text-muted mb-0">No members assigned to this team.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    {teamId && <th />}
                  </tr>
                </thead>
                <tbody>
                  {members.map(member => (
                    <tr key={member.user_id}>
                      <td>{member.first_name + " " + (member.last_name || '')} {member.user_id === leadId && <span className="badge bg-soft-primary text-primary ms-1">Team lead</span>}</td>
                      <td>{member.email}</td>
                      <td>{member.role?.role_name}</td>
                      {teamId && <td className="text-end">{member.user_id !== leadId && <button className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => remove(member)}>Remove</button>}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TeamMembersTab
