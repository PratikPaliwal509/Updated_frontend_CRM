import React, { useState } from 'react'
import { FiMoreVertical, FiPlus } from 'react-icons/fi'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import getIcon from '@/utils/getIcon'
import { statusLabel } from '@/utils/projectHelpers'
import { api } from '@/utils/authSession'
import { HealthBadge } from '@/components/projectMgmt/ProjectDashboardTab'

// Only actions that really work (the old menu had pin / copy / share / delete placeholders with no backend).
const STATUS_ACTIONS = [
  { status: 'in_progress', label: 'Mark as In Progress', icon: 'feather-star' },
  { status: 'on_hold', label: 'Mark as On Hold', icon: 'feather-pause' },
  { status: 'finished', label: 'Mark as Finished', icon: 'feather-check-circle' },
  { status: 'cancelled', label: 'Mark as Cancelled', icon: 'feather-delete' },
]

const ProjectViewHeader = ({ project }) => {
  const navigate = useNavigate()
  const [p, setP] = useState(project)
  const [busy, setBusy] = useState(false)
  const manage = p?.can_manage === true

  const setStatus = async (status) => {
    if (!window.confirm(`Change status to "${statusLabel(status)}"?`)) return
    setBusy(true)
    try { await api(`/api/projects/${p.project_id}/status`, { method: 'PATCH', body: { status } }); setP({ ...p, status }); toast.success('Status updated') } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  const archive = async (archived) => {
    if (archived && !window.confirm('Archive this project? It disappears from lists and reports until restored. Nothing is deleted.')) return
    setBusy(true)
    try {
      await api(`/api/projects/${p.project_id}/archive`, { method: 'PATCH', body: { archived } })
      setP({ ...p, is_archived: archived })
      toast.success(archived ? 'Project archived' : 'Project restored')
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="w-100 d-flex align-items-center justify-content-between">
      {/* LEFT: Project Info */}
      <div className='me-2'>
        <h4 className="fw-bold mb-1 ">
          {p?.project_name ?? '—'}
        </h4>
        <span className="badge bg-soft-primary text-primary me-2">
          {statusLabel(p?.status)}
        </span>
        {p?.health && <HealthBadge health={p.health} />}
        {p?.is_archived && <span className="badge bg-soft-secondary text-muted ms-2">Archived</span>}
      </div>

      {/* RIGHT: Actions */}
      <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
        {manage && (
          <div className="filter-dropdown">
            <a
              className="btn btn-icon btn-light-brand"
              data-bs-toggle="dropdown"
              data-bs-offset="0, 10"
              aria-label="Project actions"
            >
              <FiMoreVertical />
            </a>

            <ul className="dropdown-menu dropdown-menu-end">
              <li>
                <a href="#" className="dropdown-item" onClick={(e) => { e.preventDefault(); navigate(`/projects/edit/${p.project_id}`) }}>
                  <i className="me-3">{getIcon('feather-edit')}</i><span>Edit Project</span>
                </a>
              </li>
              <li className="dropdown-divider" />
              {STATUS_ACTIONS.filter((a) => a.status !== p.status).map((a) => (
                <li key={a.status}>
                  <a href="#" className={`dropdown-item ${busy ? 'disabled' : ''}`} onClick={(e) => { e.preventDefault(); setStatus(a.status) }}>
                    <i className="me-3">{getIcon(a.icon)}</i><span>{a.label}</span>
                  </a>
                </li>
              ))}
              <li className="dropdown-divider" />
              <li>
                <a href="#" className={`dropdown-item ${busy ? 'disabled' : ''}`} onClick={(e) => { e.preventDefault(); archive(!p.is_archived) }}>
                  <i className="me-3">{getIcon('feather-archive')}</i><span>{p.is_archived ? 'Restore Project' : 'Archive Project'}</span>
                </a>
              </li>
              <li>
                <a href="#" className="dropdown-item" onClick={(e) => { e.preventDefault(); navigate('/reports/project') }}>
                  <i className="me-3">{getIcon('feather-bar-chart-2')}</i><span>Projects Report</span>
                </a>
              </li>
            </ul>
          </div>
        )}

        <Link to="/projects/create" className="btn btn-primary">
          <FiPlus size={16} className="me-2" />
          Create Project
        </Link>
      </div>
    </div>
  )
}

export default ProjectViewHeader
