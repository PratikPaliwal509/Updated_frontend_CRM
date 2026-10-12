import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import { api } from '@/utils/authSession'

// Module switches enforced by the API (requireWorkspaceFeature). Missing key = enabled.
const FEATURES = [
  ['chat', 'Team chat'],
  ['seo', 'SEO reports'],
  ['meta_ads', 'Meta Ads'],
  ['meta_pages', 'Facebook pages'],
  ['meta_leads', 'Meta lead forms'],
  ['client_portal', 'Client portal'],
  ['leads', 'Leads & proposals'],
  ['invoicing', 'Invoices & payments'],
]

const statusOf = (w) => (w.closed_at ? 'closed' : w.subscription_status === 'suspended' ? 'suspended' : w.is_active ? 'active' : 'inactive')
const BADGE = { active: 'bg-soft-success text-success', suspended: 'bg-soft-danger text-danger', closed: 'bg-soft-secondary text-muted', inactive: 'bg-soft-warning text-warning' }

/** Platform admin: all workspaces, suspend / reactivate, module switches and seat limit. */
const PlatformWorkspacesPage = () => {
  const [rows, setRows] = useState(null)
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = () => api('/api/platform/workspaces').then(setRows).catch((err) => { setRows([]); toast.error(err.message) })
  useEffect(() => { load() }, [])

  const run = async (fn) => {
    setBusy(true)
    try { await fn() } catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }

  const setStatus = (w, status) => run(async () => {
    if (status === 'suspended' && !window.confirm(`Suspend "${w.agency_name}"? All its members are signed out immediately.`)) return
    await api(`/api/platform/workspaces/${w.agency_id}/status`, { method: 'PATCH', body: { status } })
    toast.success(status === 'active' ? 'Workspace reactivated' : 'Workspace suspended')
    await load()
  })

  const openEdit = (w) => setEditing({
    agency_id: w.agency_id,
    agency_name: w.agency_name,
    flags: Object.fromEntries(FEATURES.map(([k]) => [k, (w.feature_flags || {})[k] !== false])),
    seats: (w.usage_limits || {}).team_members ?? '',
    usage_limits: w.usage_limits || {},
  })

  const saveEdit = (e) => {
    e.preventDefault()
    const seats = editing.seats === '' ? null : Number(editing.seats)
    if (seats !== null && (!Number.isInteger(seats) || seats < 1)) return toast.error('Seat limit must be a whole number of at least 1 (leave empty for unlimited)')
    run(async () => {
      await api(`/api/platform/workspaces/${editing.agency_id}/entitlements`, {
        method: 'PUT',
        body: { feature_flags: editing.flags, usage_limits: { ...editing.usage_limits, team_members: seats } },
      })
      toast.success('Entitlements saved')
      setEditing(null)
      await load()
    })
  }

  return (
    <>
      <PageHeader />
      <div className="main-content">
        <div className="row">
          <div className={editing ? 'col-lg-8' : 'col-12'}>
            <div className="card stretch">
              <div className="card-header"><h5 className="card-title mb-0">Workspaces</h5></div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table mb-0">
                    <thead><tr><th>Workspace</th><th>Owner</th><th>Users</th><th>Created</th><th>Status</th><th /></tr></thead>
                    <tbody>
                      {rows === null && <tr><td colSpan={6} className="text-muted">Loading...</td></tr>}
                      {rows && rows.length === 0 && <tr><td colSpan={6} className="text-muted">No workspaces.</td></tr>}
                      {rows && rows.map((w) => {
                        const st = statusOf(w)
                        return (
                          <tr key={w.agency_id}>
                            <td>{w.agency_name}</td>
                            <td>{w.owner ? `${w.owner.full_name || ''} (${w.owner.email})` : '-'}</td>
                            <td>{w.users}{w.usage_limits?.team_members != null ? ` / ${w.usage_limits.team_members}` : ''}</td>
                            <td>{new Date(w.created_at).toLocaleDateString()}</td>
                            <td><span className={`badge ${BADGE[st]}`}>{st}</span></td>
                            <td className="text-end text-nowrap">
                              <button className="btn btn-sm btn-light me-1" onClick={() => openEdit(w)} disabled={busy}>Modules &amp; limits</button>
                              {st === 'active'
                                ? <button className="btn btn-sm btn-outline-danger" onClick={() => setStatus(w, 'suspended')} disabled={busy}>Suspend</button>
                                : <button className="btn btn-sm btn-outline-success" onClick={() => setStatus(w, 'active')} disabled={busy}>Reactivate</button>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          {editing && (
            <div className="col-lg-4">
              <div className="card stretch">
                <div className="card-header"><h5 className="card-title mb-0">{editing.agency_name}</h5></div>
                <div className="card-body">
                  <form onSubmit={saveEdit}>
                    <div className="fw-semibold mb-2">Modules</div>
                    {FEATURES.map(([k, name]) => (
                      <label key={k} className="d-flex align-items-center gap-2 mb-2">
                        <input type="checkbox" checked={editing.flags[k]} onChange={(e) => setEditing({ ...editing, flags: { ...editing.flags, [k]: e.target.checked } })} />
                        {name}
                      </label>
                    ))}
                    <div className="mb-3 mt-3">
                      <label className="form-label">Team member seat limit</label>
                      <input className="form-control" inputMode="numeric" placeholder="Unlimited" value={editing.seats} onChange={(e) => setEditing({ ...editing, seats: e.target.value })} />
                    </div>
                    <div className="d-flex gap-2">
                      <button className="btn btn-primary" disabled={busy}>Save</button>
                      <button type="button" className="btn btn-light" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}

export default PlatformWorkspacesPage
