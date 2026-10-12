import React, { useState } from 'react'
import { toast } from 'react-toastify'
import { api } from '@/utils/authSession'

const BADGE = {
    approved: ['bg-soft-success text-success', 'Approved by the client'],
    changes_requested: ['bg-soft-danger text-danger', 'Client requested changes'],
    pending: ['bg-soft-warning text-warning', 'Waiting for client approval'],
}

/** Client approval state of a task shared with the client portal. */
const TaskApproval = ({ task, canManage, onChanged }) => {
    const [busy, setBusy] = useState(false)
    if (!task?.visible_to_client) return null
    const status = task.client_approval_required ? (task.client_approval_status || (task.client_approved ? 'approved' : 'pending')) : null
    const ask = async () => {
        setBusy(true)
        try {
            await api(`/api/tasks/${task.task_id}/request-approval`, { method: 'POST' })
            toast.success('The client was asked to approve this task')
            onChanged?.()
        } catch (err) { toast.error(err.message) } finally { setBusy(false) }
    }
    return (
        <div className="client-approval" data-testid="client-approval">
            <h2 className="fs-16 fw-bold mb-1">Client approval</h2>
            {status ? <span className={`badge ${BADGE[status][0]}`}>{BADGE[status][1]}</span> : <p className="fs-12 text-muted mb-2">Shared with the client portal; no approval needed.</p>}
            {task.client_approved_at && status === 'approved' && <span className="fs-12 text-muted ms-2">{new Date(task.client_approved_at).toLocaleString()}{task.approvedBy ? ` by ${task.approvedBy.full_name}` : ''}</span>}
            {task.client_feedback && (
                <blockquote className="border-start border-3 ps-3 mt-2 mb-2 fs-13">
                    <div className="text-muted fs-11 mb-1">Client feedback{task.client_feedback_at ? ` · ${new Date(task.client_feedback_at).toLocaleString()}` : ''}</div>
                    {task.client_feedback}
                </blockquote>
            )}
            {canManage && status !== 'pending' && (
                <div className="mt-2">
                    <button type="button" className="btn btn-sm btn-light-brand" disabled={busy} onClick={ask}>{status ? 'Ask the client to approve again' : 'Ask the client to approve'}</button>
                </div>
            )}
        </div>
    )
}

export default TaskApproval
