import React, { useState } from 'react'
import { toast } from 'react-toastify'
import { api } from '@/utils/authSession'

const LABEL = { to_do: 'To Do', inprogress: 'In Progress', pending: 'Pending', review: 'In Review', completed: 'Completed', rejected: 'Rejected', cancelled: 'Cancelled' }

/** Sub-tasks of a task: list, add (task members), tick done. */
const TaskSubtasks = ({ taskId, subtasks = [], canWork, onChanged }) => {
    const [title, setTitle] = useState('')
    const [busy, setBusy] = useState(false)

    const add = async () => {
        if (!title.trim()) return
        setBusy(true)
        try {
            await api(`/api/tasks/${taskId}/subtasks`, { method: 'POST', body: { task_title: title.trim() } })
            setTitle('')
            toast.success('Sub-task added')
            onChanged?.()
        } catch (err) { toast.error(err.message) } finally { setBusy(false) }
    }
    const toggle = async (s) => {
        try {
            await api(`/api/tasks/${s.task_id}/status`, { method: 'PATCH', body: { status: s.status === 'completed' ? 'to_do' : 'completed' } })
            onChanged?.()
        } catch (err) { toast.error(err.message) }
    }

    const done = subtasks.filter((s) => s.status === 'completed').length
    return (
        <div className="subtasks">
            <div className="d-flex justify-content-between mb-3">
                <div>
                    <h2 className="fs-16 fw-bold mb-1">Sub-tasks</h2>
                    <span className="fs-12 text-muted">{subtasks.length ? `${done} of ${subtasks.length} done` : 'Break the work into smaller steps'}</span>
                </div>
            </div>
            <ul className="list-unstyled mb-2" data-testid="subtask-list">
                {subtasks.map((s) => (
                    <li key={s.task_id} className="d-flex align-items-center gap-2 py-1 border-bottom border-dashed">
                        <input type="checkbox" className="form-check-input m-0" checked={s.status === 'completed'} disabled={!canWork} onChange={() => toggle(s)} aria-label={`Mark ${s.task_title} done`} />
                        <span className={`flex-grow-1 fs-13 ${s.status === 'completed' ? 'text-decoration-line-through text-muted' : ''}`}>{s.task_title}</span>
                        <span className="badge bg-soft-secondary text-secondary">{LABEL[s.status] || s.status}</span>
                        <span className="d-flex gap-1">{(s.assignments || []).map((a) => <span key={a.user.user_id} className="badge bg-light text-dark">{a.user.full_name}</span>)}</span>
                    </li>
                ))}
            </ul>
            {canWork && (
                <div className="input-group">
                    <input className="form-control" placeholder="New sub-task..." value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} disabled={busy} />
                    <button type="button" className="btn btn-light-brand" onClick={add} disabled={busy || !title.trim()}>Add sub-task</button>
                </div>
            )}
        </div>
    )
}

export default TaskSubtasks
