import React, { useCallback, useEffect, useState } from 'react'
import { FiArrowLeft, FiEdit, FiInfo, FiRepeat, FiTrash2 } from 'react-icons/fi'
import TaskDateRange, { apiDateToLocal } from './TaskDateRange';
import TaskStatus from './TaskStatus';
import Comments from '../Comments';
import MultiSelectTags from '@/components/shared/MultiSelectTags';
import { taskLabelsOptions, taskPriorityOptions, taskStatusOptions, taskTypeOptions } from '@/utils/options';
import CheckList from '../CheckList';
import AddComment from './AddComment';
import TaskTimer from '@/components/TaskTimer'
import TaskTimeLogDetails from '../TaskTimeLogDetails';
import AddAttachment from './TaskAttachment';
import AdminTaskTimelogs from '../AdminTaskTimelogs';
import TaskSubtasks from '@/components/taskMgmt/TaskSubtasks'
import TaskRecurrence from '@/components/taskMgmt/TaskRecurrence'
import TaskApproval from '@/components/taskMgmt/TaskApproval'
import { toast } from 'react-toastify'
import { api } from '@/utils/authSession'

const STATUS_LABEL = Object.fromEntries(taskStatusOptions.map((o) => [o.value, o.label]))
const initials = (n) => (n || '?').charAt(0).toUpperCase()
const Avatar = ({ user }) => user?.avatar_url
    ? <img src={user.avatar_url} className="avatar avatar-xs rounded-circle" alt={user.full_name} />
    : <span className="avatar-text avatar-sm rounded-circle bg-soft-primary text-primary">{initials(user?.full_name)}</span>

/**
 * Task details side panel. Loads the full task (with the caller's rights) from GET /api/tasks/:id;
 * every control is shown only when the API would allow it.
 */
const TasksDetails = ({ task, user_id, onStatusChange, onPriorityChange, onDeleteTask, onDescriptionChange, onTaskChanged, project_name }) => {
    const id = task?.id || task?.task_id
    const [detail, setDetail] = useState(null)
    const [status, setStatus] = useState('to_do')
    const [priority, setPriority] = useState('medium')
    const [taskType, setTaskType] = useState('')
    const [selectedTags, setSelectedTags] = useState([])
    const [users, setUsers] = useState([])
    const [usersList, setUsersList] = useState([])
    const [assigningUserId, setAssigningUserId] = useState(null)
    const [comments, setComments] = useState([])
    const [loadingComments, setLoadingComments] = useState(false)
    const [isEditingDesc, setIsEditingDesc] = useState(false)
    const [isUpdatingDesc, setIsUpdatingDesc] = useState(false)
    const [taskDescription, setTaskDescription] = useState('')

    const perms = detail?.permissions || {}
    const title = detail?.task_title || task?.title || task?.task_title || ''
    const projectName = detail?.project?.project_name || task?.projectName || project_name || ''
    const assignees = (detail?.assignments || []).map((a) => ({ ...a.user, assigned_by: a.assigned_by, is_active: a.is_active }))
    const activeIds = assignees.filter((a) => a.is_active).map((a) => a.user_id)

    const load = useCallback(async () => {
        if (!id) return
        try {
            const d = await api(`/api/tasks/${id}`)
            setDetail(d)
            setStatus(d.status || 'to_do')
            setPriority(d.priority || 'medium')
            setTaskType(d.task_type || '')
            setTaskDescription(d.description || '')
            setSelectedTags(taskLabelsOptions.filter((o) => (d.tags || []).includes(o.value)).concat((d.tags || []).filter((t) => !taskLabelsOptions.some((o) => o.value === t)).map((t) => ({ value: t, label: t }))))
        } catch (err) {
            toast.error(err.message)
        }
    }, [id])

    const fetchComments = useCallback(async () => {
        if (!id) return
        setLoadingComments(true)
        try {
            const data = await api(`/api/tasksComments/${id}/comments`)
            setComments(Array.isArray(data) ? [...data].reverse() : [])
        } catch (err) { console.error(err) } finally { setLoadingComments(false) }
    }, [id])

    useEffect(() => {
        setDetail(null)
        setIsEditingDesc(false)
        load()
        fetchComments()
    }, [id, load, fetchComments])

    useEffect(() => {
        api('/api/users/user').then((list) => {
            const l = Array.isArray(list) ? list.filter((u) => u.user_type !== 'client') : []
            setUsersList(l)
        }).catch(() => toast.error('Failed to load users'))
    }, [])

    useEffect(() => {
        setUsers(usersList.filter((u) => !activeIds.includes(u.user_id)).map((u) => ({ value: u.user_id, label: u.full_name })))
    }, [usersList, detail]) // eslint-disable-line react-hooks/exhaustive-deps

    const refreshAll = () => { load(); onTaskChanged?.() }

    /* ------------------ actions ------------------ */
    const handleAssignUser = async (e) => {
        const userId = Number(e.target.value)
        e.target.value = ''
        const user = users.find((u) => u.value === userId)
        if (!userId || !user || !window.confirm(`Assign ${user.label} to this task?`)) return
        setAssigningUserId(userId)
        try {
            await api(`/api/tasks/${id}/assign`, { method: 'POST', body: { user_ids: [userId] } })
            toast.success('User assigned')
            refreshAll()
        } catch (err) { toast.error(err.message || 'Failed to assign user') } finally { setAssigningUserId(null) }
    }
    const handleRemoveAssignee = async (userId) => {
        if (!window.confirm('Remove this person from the task?')) return
        try {
            await api(`/api/tasks/${id}/assignments/${userId}/remove`, { method: 'PATCH' })
            toast.success('Removed from task')
            refreshAll()
        } catch (err) { toast.error(err.message || 'Failed to remove user') }
    }
    const patch = async (path, body, okMsg, after) => {
        try {
            const r = await api(`/api/tasks/${id}/${path}`, { method: 'PATCH', body })
            toast.success(okMsg)
            after?.(r)
            return true
        } catch (err) {
            toast.error(err.message)
            load()
            return false
        }
    }
    const handleStatusChange = (value) => { setStatus(value); patch('status', { status: value }, 'Status updated', () => { onStatusChange?.(id, value); load() }) }
    const handlePriorityChange = (opt) => { const v = opt?.value || opt; setPriority(v); patch('priority', { priority: v }, 'Priority updated', () => onPriorityChange?.(id, v)) }
    const handleTypeChange = (v) => { setTaskType(v); patch('type', { task_type: v }, 'Task type updated') }
    const handleTagChange = (opts) => { setSelectedTags(opts || []); patch('tags', { tags: (opts || []).map((o) => o.value) }, 'Tags updated') }
    const handleDates = (start, end) => patch('dates', { start_date: start, due_date: end }, 'Dates updated', () => onTaskChanged?.())
    const handleUpdateDescription = async () => {
        if (!taskDescription.trim()) return toast.warning('Description cannot be empty')
        setIsUpdatingDesc(true)
        const ok = await patch('description', { description: taskDescription }, 'Description updated', () => onDescriptionChange?.(id, taskDescription))
        if (ok) setIsEditingDesc(false)
        setIsUpdatingDesc(false)
    }
    const handleDeleteTask = async () => {
        if (!window.confirm('Delete this task? Its sub-tasks and comments are deleted too.')) return
        try {
            await api(`/api/tasks/${id}`, { method: 'DELETE' })
            toast.success('Task deleted')
            onDeleteTask?.(id)
            document.querySelector('#tasksDetailsOffcanvas [data-bs-dismiss="offcanvas"]')?.click()
        } catch (err) { toast.error(err.message) }
    }

    const ReadOnly = ({ label, children }) => (
        <div className="form-group mb-4"><label className="form-label">{label}</label><div className="fs-13">{children}</div></div>
    )

    return (
        <div className="offcanvas offcanvas-end w-50" tabIndex={-1} id="tasksDetailsOffcanvas">
            <div className="offcanvas-header border-bottom" style={{ paddingTop: 20, paddingBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
                <div className="d-flex align-items-center">
                    <div className="avatar-text avatar-md items-details-close-trigger" data-bs-dismiss="offcanvas" title="Close" role="button">
                        <FiArrowLeft />
                    </div>
                    <span className="vr text-muted mx-4" />
                    <div>
                        <h2 className="fs-14 fw-bold text-truncate-1-line mb-1">
                            <span className="text-truncate">{title}</span>
                            {detail?.task_number && <span className="badge ms-2 bg-soft-secondary text-secondary">{detail.task_number}</span>}
                            {detail?.estimated_hours && <span className="badge ms-2 bg-primary">{Number(detail.estimated_hours)}h</span>}
                            {(detail?.is_recurring || detail?.recurrence_source) && <FiRepeat className="ms-2 text-primary" title="Recurring task" />}
                        </h2>
                        <span className="fs-13 fw-medium text-secondary">
                            <span className="fw-bold text-dark">Project:</span> {projectName}
                            {detail?.parent_task && <> · <span className="fw-bold text-dark">Sub-task of:</span> {detail.parent_task.task_title}</>}
                        </span>
                    </div>
                </div>
                <div className="d-none d-md-flex gap-1 align-items-center justify-content-center">
                    {perms.is_assignee && <TaskTimer taskId={id} project_id={detail?.project_id} />}
                    {perms.can_delete && (
                        <button className="btn btn-danger btn-sm d-flex align-items-center" onClick={handleDeleteTask}>
                            <FiTrash2 className="me-1" /> Delete
                        </button>
                    )}
                </div>
            </div>

            <div className="offcanvas-body">
                {!detail ? <p className="text-muted">Loading...</p> : (<>
                    <div className="form-group mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <label className="form-label mb-0">Description:</label>
                            {perms.can_work && (!isEditingDesc ? (
                                <FiEdit style={{ cursor: 'pointer' }} onClick={() => setIsEditingDesc(true)} aria-label="Edit description" />
                            ) : (
                                <div className="d-flex gap-2">
                                    <button className="btn btn-sm btn-success" onClick={handleUpdateDescription} disabled={isUpdatingDesc}>{isUpdatingDesc ? 'Saving...' : 'Save'}</button>
                                    <button className="btn btn-sm btn-secondary" onClick={() => { setIsEditingDesc(false); setTaskDescription(detail.description || '') }}>Cancel</button>
                                </div>
                            ))}
                        </div>
                        <textarea className="form-control" rows={4} value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} disabled={!isEditingDesc} placeholder="Enter task description..." />
                    </div>

                    <div className="row">
                        <div className="col-sm-6">
                            {perms.can_work
                                ? <TaskStatus label="Status:" options={taskStatusOptions} value={status} onChange={handleStatusChange} />
                                : <ReadOnly label="Status:">{STATUS_LABEL[status] || status}</ReadOnly>}
                        </div>
                        <div className="col-sm-6">
                            {perms.can_manage
                                ? <TaskStatus label="Priority:" options={taskPriorityOptions} value={priority} onChange={handlePriorityChange} />
                                : <ReadOnly label="Priority:"><span className="text-capitalize">{priority}</span></ReadOnly>}
                        </div>
                        <div className="col-sm-6">
                            {perms.can_manage
                                ? <TaskStatus label="Type:" options={taskTypeOptions} value={taskType} onChange={handleTypeChange} />
                                : <ReadOnly label="Type:"><span className="text-capitalize">{taskType || '—'}</span></ReadOnly>}
                        </div>
                        <div className="col-sm-6">
                            <div className="form-group mb-4">
                                <label className="form-label">Tags:</label>
                                {perms.can_manage
                                    ? <MultiSelectTags options={taskLabelsOptions} value={selectedTags} onChange={handleTagChange} />
                                    : <div className="d-flex gap-1 flex-wrap">{selectedTags.length ? selectedTags.map((t) => <span key={t.value} className="badge bg-light text-dark">{t.label}</span>) : <span className="text-muted fs-12">No tags</span>}</div>}
                            </div>
                        </div>

                        <div className="col-sm-6">
                            <label className="form-label">Assignees:</label>
                            {perms.can_assign && (
                                <select className="form-select" onChange={handleAssignUser} defaultValue="" disabled={assigningUserId !== null} aria-label="Assign someone">
                                    <option value="" disabled>{assigningUserId ? 'Assigning...' : 'Assign someone...'}</option>
                                    {users.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                                </select>
                            )}
                            <div className="d-flex gap-2 mt-2 flex-wrap" data-testid="assignees">
                                {assignees.filter((u) => u.is_active).map((u) => (
                                    <span key={u.user_id} className="badge d-flex align-items-center gap-2 bg-light text-dark">
                                        <Avatar user={u} /> {u.full_name}
                                        {(perms.can_manage || u.assigned_by === user_id || u.user_id === user_id) && (
                                            <button className="btn btn-sm btn-link text-danger p-0" onClick={() => handleRemoveAssignee(u.user_id)} title={u.user_id === user_id ? 'Leave this task' : 'Remove from task'}>✕</button>
                                        )}
                                    </span>
                                ))}
                                {!activeIds.length && <span className="text-muted fs-12">Nobody is assigned</span>}
                            </div>
                        </div>

                        <div className="col-sm-6">
                            <ReadOnly label="Created by:">{detail.createdBy?.full_name || '—'}</ReadOnly>
                        </div>
                        {perms.can_manage ? (
                            <TaskDateRange
                                initialStartDate={apiDateToLocal(detail.start_date)}
                                initialEndDate={apiDateToLocal(detail.due_date)}
                                onChange={handleDates}
                            />
                        ) : (
                            <div className="col-12 fs-13">
                                <span className="fw-semibold">Start:</span> {detail.start_date ? apiDateToLocal(detail.start_date).toLocaleDateString() : '—'} · <span className="fw-semibold">Due:</span> {detail.due_date ? apiDateToLocal(detail.due_date).toLocaleDateString() : '—'}
                            </div>
                        )}
                    </div>

                    <hr className="my-5" />
                    <TaskSubtasks taskId={id} subtasks={detail.subtasks || []} canWork={perms.can_work && !detail.parent_task_id} onChanged={refreshAll} />

                    <hr className="my-5" />
                    {perms.is_assignee && <TaskTimeLogDetails taskId={id} project_id={detail.project_id} canApprove={false} />}
                    {perms.can_manage && <AdminTaskTimelogs taskId={id} project_id={detail.project_id} canApprove />}

                    <hr className="my-5" />
                    <AddAttachment taskId={id} canUpload={perms.can_work} canManage={perms.can_manage} currentUserId={user_id} />

                    <hr className="my-5" />
                    <div className="checklist">
                        <div className="d-flex justify-content-between mb-4">
                            <div>
                                <h2 className="fs-16 fw-bold mb-1">Checklist</h2>
                                <span className="fs-12 text-muted">Steps to finish this task</span>
                            </div>
                            <span className="avatar-text avatar-md"><FiInfo /></span>
                        </div>
                        <CheckList checklist={detail.checklist || []} taskID={id} readOnly={!perms.can_work} />
                    </div>

                    <hr className="my-5" />
                    <TaskRecurrence task={detail} canManage={perms.can_manage} onChanged={refreshAll} />

                    {detail.visible_to_client && <><hr className="my-5" /><TaskApproval task={detail} canManage={perms.can_manage} onChanged={refreshAll} /></>}

                    <hr className="my-5" />
                    <div className="form-group mb-4">
                        <label className="form-label">Depends on:</label>
                        {detail.dependsOnTasks?.length > 0 ? (
                            <div className="d-flex flex-wrap gap-2">
                                {detail.dependsOnTasks.map((t) => <span key={t.task_id} className={`badge ${t.status === 'completed' ? 'bg-success' : 'bg-warning text-dark'}`}>#{t.task_id} - {t.task_title}</span>)}
                            </div>
                        ) : <small className="text-muted d-block">No dependencies</small>}
                    </div>
                    <div className="form-group mb-4">
                        <label className="form-label">Blocks:</label>
                        {detail.blocksTasks?.length > 0 ? (
                            <div className="d-flex flex-wrap gap-2">
                                {detail.blocksTasks.map((t) => <span key={t.task_id} className="badge bg-danger">#{t.task_id} - {t.task_title}</span>)}
                            </div>
                        ) : <small className="text-muted d-block">No blocked tasks</small>}
                    </div>

                    <hr className="my-5" />
                    <div className="comments">
                        <div className="d-flex justify-content-between mb-4">
                            <div>
                                <h2 className="fs-16 fw-700 mb-1">Comments</h2>
                                <small className="text-muted">Responses for this task</small>
                            </div>
                            <span className="avatar-text avatar-md"><FiInfo /></span>
                        </div>
                        <Comments comments={comments} loading={loadingComments} setComments={setComments} portal_user_id={user_id} usersList={usersList} />
                        <AddComment usersList={usersList} taskID={id} setComments={setComments} />
                    </div>
                </>)}
            </div>
        </div>
    )
}

export default TasksDetails
