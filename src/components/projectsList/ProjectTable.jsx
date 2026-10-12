import React, { useEffect, useMemo, useState } from 'react'
import Table from '@/components/shared/table/Table'
import { FiEye, FiEdit3 } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import Loader from '../loader'
import { API_BASE_URL } from '../../config/api';

const TableCell = ({ value, onChange, disabled }) => {
  return (
    <select
      value={value.status}
      onChange={(e) => onChange(e.target.value)}
      className="form-select"
      disabled={disabled}
    >
      <option value="planning">Planning</option>
      <option value="in_progress">In Progress</option>
      <option value="on_hold">On Hold</option>
      <option value="finished">Completed</option>
    </select>
  )
}

const ProjectTable = ({ statusFilter, projects, setProjects }) => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [updatingStatusId, setUpdatingStatusId] = useState(null)
  const [showArchived, setShowArchived] = useState(false)

  /* -------- FETCH -------- */
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/projects${showArchived ? '?include_archived=true' : ''}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })

        const result = await res.json()

        if (result.success) {
          const mapped = result.data.map(p => ({
            id: p.project_id,

            project: {
              name: p.project_name,
              description: p.description,
            },

            client: {
              name: p.client?.company_name || (p.client_id ? `Client #${p.client_id}` : "Not Assigned"),
              img: null,
            },

            progress: p.progress_percentage ?? 0,
            health: p.health,
            archived: !!p.is_archived,

            start: p.start_date
              ? new Date(p.start_date).toLocaleDateString()
              : "—",

            end: p.end_date
              ? new Date(p.end_date).toLocaleDateString()
              : "—",

            status: {
              status: p.status,
            },
          }))

          setProjects(mapped)
        }
      } catch {
        toast.error("Failed to fetch projects")
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [showArchived])

  /* -------- FILTER -------- */
  const filteredProjects = useMemo(() => {
    if (statusFilter === "all") return projects

    return projects.filter(p => p.status?.status === statusFilter)
  }, [projects, statusFilter])

  /* -------- STATUS UPDATE -------- */
  const handleStatusUpdate = async (id, newStatus, currentStatus) => {
    if (!window.confirm(`Change status from "${currentStatus}" to "${newStatus}"?`)) return

    try {
      setUpdatingStatusId(id)

      const res = await fetch(
        `${API_BASE_URL}/api/projects/${id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      )

      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.message || "Failed to update")
      }

      toast.success("Status updated")

      setProjects(prev =>
        prev.map(p =>
          p.id === id
            ? { ...p, status: { status: newStatus } }
            : p
        )
      )
    } catch (err) {
      toast.error(err.message || "Failed to update")
    } finally {
      setUpdatingStatusId(null)
    }
  }

  /* -------- COLUMNS -------- */
  const columns = [
    {
      accessorKey: 'project',
      header: 'Project',
      cell: (info) => {
        const p = info.getValue()
        const id = info.row.original.id

        return (
          <div>
            <div
              className="fw-semibold cursor-pointer"
              onClick={() => navigate(`/projects/view/${id}`)}
            >
              {p.name}
            </div>

            <div className="text-muted small">
              {p.description || "No description"}
            </div>
          </div>
        )
      }
    },

    {
      accessorKey: 'client',
      header: 'Client',
      cell: (info) => {
        const c = info.getValue()

        return (
          <div className="hstack gap-2">
            <div className="avatar-text avatar-md">
              {c?.name?.charAt(0)}
            </div>
            {c?.name}
          </div>
        )
      }
    },

    { accessorKey: 'start', header: 'Start Date' },
    { accessorKey: 'end', header: 'End Date' },
    {
      accessorKey: 'progress',
      header: 'Progress',
      cell: (info) => {
        const r = info.row.original
        const color = { on_track: 'success', at_risk: 'warning', off_track: 'danger', closed: 'secondary' }[r.health] || 'primary'
        return (
          <div style={{ minWidth: 110 }} title={r.health ? r.health.replace('_', ' ') : ''}>
            <div className="fs-11 mb-1">{r.progress}%{r.archived ? ' · archived' : ''}</div>
            <div className="progress" style={{ height: 5 }}><div className={`progress-bar bg-${color}`} style={{ width: `${r.progress}%` }} /></div>
          </div>
        )
      }
    },

    {
      accessorKey: 'status',
      header: 'Status',
      cell: (info) => {
        const row = info.row.original
        const isLoading = updatingStatusId === row.id

        return isLoading ? (
          <div className="spinner-border spinner-border-sm" />
        ) : (
          <TableCell
            value={row.status}
            onChange={(value) =>
              handleStatusUpdate(row.id, value, row.status.status)
            }
          />
        )
      }
    },
    {
      accessorKey: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const id = row.original.id

        return (
          <div className="hstack gap-2 justify-content-center">
            <FiEye
              className="cursor-pointer"
              onClick={() => navigate(`/projects/view/${id}`)}
            />
            <FiEdit3
              className="cursor-pointer"
              onClick={() => navigate(`/projects/edit/${id}`)}
            />
          </div>
        )
      }
    }
  ]

  if (loading) return <Loader />

  return (
    <>
      <div className="d-flex justify-content-end mb-2">
        <label className="d-flex align-items-center gap-1 fs-12 mb-0">
          <input type="checkbox" checked={showArchived} onChange={(e) => { setLoading(true); setShowArchived(e.target.checked) }} /> Show archived projects
        </label>
      </div>
      <Table data={filteredProjects} columns={columns} />
    </>
  )
}

export default ProjectTable