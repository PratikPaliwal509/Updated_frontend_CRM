import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { FiMoreVertical, FiRepeat, FiStar } from 'react-icons/fi'
import PerfectScrollbar from 'react-perfect-scrollbar'
import { useSearchParams } from 'react-router-dom'
import { Offcanvas } from 'bootstrap'
import TaskHeader from './TaskHeader'
import Footer from '@/components/shared/Footer'
import TasksDetails from './TasksDetails'
import { toast } from 'react-toastify';
import KanbanBoard from './KanbanBoard'
import TaskCalendar from './TaskCalendar'
import { api } from '@/utils/authSession'

const PRIORITY_COLOR = { urgent: 'danger', high: 'danger', medium: 'warning', normal: 'secondary', low: 'success' }
const STATUS_COLOR = { completed: 'success', inprogress: 'info', pending: 'warning', review: 'primary', rejected: 'danger', cancelled: 'dark', to_do: 'primary' }
const STATUS_LABEL = { to_do: 'To Do', inprogress: 'In Progress', pending: 'Pending', review: 'In Review', completed: 'Completed', rejected: 'Rejected', cancelled: 'Cancelled' }
export const statusText = (s) => STATUS_LABEL[s] || String(s || '').replace(/_/g, ' ')

/** API task -> the shape the list / Kanban / calendar / details panel use */
export const formatTask = (task) => {
    const p = PRIORITY_COLOR[task.priority] || 'warning'
    const s = STATUS_COLOR[task.status] || 'primary'
    const active = (task.assignments || []).filter((a) => a.is_active !== false)
    return {
        id: task.task_id,
        title: task.task_title,
        task_number: task.task_number,
        description: task.description || '—',
        priority: task.priority,
        priorityColor: p,
        priorityBgColor: `soft-${p}`,
        statusColor: s,
        statusBgColor: `soft-${s}`,
        taskType: task.task_type || 'Task',
        taskTypeColor: 'primary',
        taskTypeBgColor: 'soft-primary',
        assignees: active.map((a) => a.user).filter(Boolean),
        assigned_date: task.assigned_date ? new Date(task.assigned_date) : null,
        due_date: task.due_date,
        assigned_to: active.map((a) => a.user_id),
        start_date: task.start_date,
        tags: task.tags || [],
        status: task.status || 'to_do',
        checklist: task.checklist || [],
        created_at: task.created_at,
        task_type: task.task_type,
        project_id: task.project_id,
        assignments: task.assignments,
        created_by: task.created_by,
        visible_to_client: task.visible_to_client,
        client_approval_required: task.client_approval_required,
        client_approved: task.client_approved,
        client_approval_status: task.client_approval_status,
        is_recurring: task.is_recurring,
        recurrence_source_id: task.recurrence_source_id,
        projectName: task?.project?.project_name,
        createdByName: task?.createdBy?.full_name,
        estimated_hours: task?.estimated_hours,
        blocksTasks: task?.blocksTasks,
        dependsOnTasks: task?.dependsOnTasks,
    }
}

const openDetails = () => {
    const el = document.getElementById('tasksDetailsOffcanvas')
    if (el) Offcanvas.getOrCreateInstance(el).show()
}

const TaskContent = ({ initialView = 'kanban' }) => {
    const [viewMode, setViewMode] = useState(initialView) // list | kanban | calendar
    const [loading, setLoading] = useState(true)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [tasks, setTasks] = useState([])
    const [user_id, setUser_id] = useState(null)
    const [selectedTask, setSelectedTask] = useState(null)
    const [searchParams, setSearchParams] = useSearchParams()
    const [activeFilter, setActiveFilter] = useState({ type: 'status', value: 'all' })

    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true)
            const data = await api('/api/tasks')
            setTasks(Array.isArray(data) ? data.map(formatTask) : [])
        } catch (error) {
            toast.error(error.message || 'Something went wrong while fetching tasks')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        try {
            const u = JSON.parse(localStorage.getItem('user') || 'null')
            if (u?.user_id) setUser_id(u.user_id)
            else {
                const payload = JSON.parse(atob((localStorage.getItem('token') || '').split('.')[1] || ''))
                setUser_id(payload.user_id)
            }
        } catch (e) { /* not signed in */ }
        fetchTasks()
        const onTaskCreated = () => fetchTasks()
        window.addEventListener('task:created', onTaskCreated)
        return () => window.removeEventListener('task:created', onTaskCreated)
    }, [fetchTasks])

    // Deep link from notifications / emails: /applications/tasks?task=123
    useEffect(() => {
        const id = Number(searchParams.get('task'))
        if (!id || loading) return
        const found = tasks.find((t) => t.id === id)
        const show = (t) => { setSelectedTask(t); setTimeout(openDetails, 50) }
        if (found) show(found)
        else api(`/api/tasks/${id}`).then((t) => show(formatTask(t))).catch(() => toast.error('This task does not exist or is not shared with you.'))
        searchParams.delete('task')
        setSearchParams(searchParams, { replace: true })
    }, [searchParams, loading]) // eslint-disable-line react-hooks/exhaustive-deps

    const filteredTasks = useMemo(() => {
        if (activeFilter.value === 'all') return tasks
        if (activeFilter.type === 'status') return tasks.filter((t) => t.status === activeFilter.value)
        if (activeFilter.type === 'priority') return tasks.filter((t) => t.priority === activeFilter.value)
        return tasks
    }, [tasks, activeFilter])

    const groupedTasks = groupTasksByDate(filteredTasks)
    const hasNoTasks = !loading && filteredTasks.length === 0
    const patchTask = (taskId, changes) => setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...changes } : t)))
    const handleDeleteTask = (taskId) => {
        setTasks((prev) => prev.filter((task) => task.id !== taskId))
        setSelectedTask(null)
    }
    const deleteFromList = async (task) => {
        if (!window.confirm(`Delete "${task.title}"? Its sub-tasks and comments are deleted too.`)) return
        try {
            await api(`/api/tasks/${task.id}`, { method: 'DELETE' })
            handleDeleteTask(task.id)
            toast.success('Task deleted')
        } catch (err) {
            toast.error(err.message)
        }
    }

    return (
        <>
            <TasksDetails
                onDeleteTask={handleDeleteTask}
                task={selectedTask}
                user_id={user_id}
                onStatusChange={(id, status) => patchTask(id, { status })}
                onPriorityChange={(id, priority) => patchTask(id, { priority })}
                onDescriptionChange={(id, description) => patchTask(id, { description })}
                onTaskChanged={fetchTasks}
            />

            <div className="content-area">
                <PerfectScrollbar>
                    <TaskHeader setSidebarOpen={setSidebarOpen}
                        sidebarOpen={sidebarOpen}
                        onFilterChange={setActiveFilter}
                        activeFilter={activeFilter}
                        setActiveFilter={setActiveFilter}
                        viewMode={viewMode}
                        setViewMode={setViewMode} />

                    <div className="px-4 pt-4 overflow-hidden" style={viewMode === 'kanban' ? { height: '66vh' } : {}}>
                        {loading ? (
                            <div className="d-flex justify-content-center align-items-center py-5">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        ) : viewMode === 'kanban' ? (
                            <KanbanBoard
                                tasks={filteredTasks}
                                onSelect={(task) => setSelectedTask(task)}
                                onStatusChange={(id, status) => patchTask(id, { status })}
                            />
                        ) : viewMode === 'calendar' ? (
                            <TaskCalendar tasks={filteredTasks} onSelect={(task) => setSelectedTask(task)} />
                        ) : hasNoTasks ? (
                            <div className="d-flex flex-column align-items-center justify-content-center py-5 text-muted">
                                <div className="fs-5 fw-semibold mb-2">No tasks found</div>
                                <div className="fs-13">Try changing filters or create a new task</div>
                            </div>
                        ) : (
                            Object.keys(groupedTasks).map((group) =>
                                groupedTasks[group].length > 0 ? (
                                    <div key={group} className="card mb-4">
                                        <div className="card-header"><h5 className="mb-0">{group}</h5></div>
                                        <div className="card-body">
                                            <ul className="list-unstyled mb-0">
                                                {groupedTasks[group].map((task) => (
                                                    <List key={task.id} {...task} onSelect={() => setSelectedTask(task)} onDelete={() => deleteFromList(task)} />
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                ) : null
                            )
                        )}
                    </div>
                    <Footer />
                </PerfectScrollbar>
            </div>
        </>
    )
}

export default TaskContent

/* =========================
   TASK ITEM
========================== */
const Avatar = ({ user }) => user?.avatar_url
    ? <img src={user.avatar_url} alt={user.full_name} title={user.full_name} className="avatar-image avatar-md" />
    : <span className="avatar-text avatar-md bg-soft-primary text-primary" title={user?.full_name}>{(user?.full_name || '?').charAt(0).toUpperCase()}</span>

const List = ({ title, description, priority, taskType, priorityColor, priorityBgColor, taskTypeColor, taskTypeBgColor, statusBgColor, statusColor, onSelect, onDelete, status, assignees = [], is_recurring, recurrence_source_id }) => (
    <li className="single-task-list p-3 mb-3 border border-dashed rounded-3">
        <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3 me-3">
                <div className="d-flex align-items-center gap-3">
                    <FiStar />
                    <a href="#" className="single-task-list-link" data-bs-toggle="offcanvas" data-bs-target="#tasksDetailsOffcanvas" onClick={onSelect}>
                        <div className="fs-13 fw-bold text-truncate-1-line">
                            {title}
                            {(is_recurring || recurrence_source_id) && <FiRepeat className="ms-2 text-muted" title="Recurring task" />}
                            <span className={`ms-2 badge bg-${priorityBgColor} text-${priorityColor} text-capitalize`}>{priority}</span>
                        </div>
                        <div className="fs-12 fw-normal text-muted text-truncate-1-line">{description}</div>
                    </a>
                </div>
            </div>
            <div className="d-flex align-items-center gap-3">
                <span className={`badge bg-${statusBgColor} text-${statusColor}`}>{statusText(status)}</span>
                <span className={`badge bg-${taskTypeBgColor} text-${taskTypeColor} text-capitalize`}>{taskType}</span>
                <div className="d-flex gap-1">{assignees.slice(0, 3).map((u) => <Avatar key={u.user_id} user={u} />)}</div>
                <div className="dropdown">
                    <button className="btn p-0 border-0 bg-transparent" type="button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Task actions" onClick={(e) => e.stopPropagation()}>
                        <FiMoreVertical size={18} />
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end">
                        <li>
                            <a href="#" className="dropdown-item" data-bs-toggle="offcanvas" data-bs-target="#tasksDetailsOffcanvas" onClick={onSelect}>View Task</a>
                        </li>
                        <li>
                            <button className="dropdown-item text-danger" onClick={onDelete}>Delete Task</button>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </li>
)

/* =========================
   GROUPING LOGIC
========================== */
const groupTasksByDate = (tasks = []) => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const groupedTasks = { 'Recently Assigned': [], Yesterday: [] }
    tasks.forEach((task) => {
        const taskDate = new Date(task.created_at)
        if (taskDate.toDateString() === today.toDateString()) groupedTasks['Recently Assigned'].push(task)
        else if (taskDate.toDateString() === yesterday.toDateString()) groupedTasks.Yesterday.push(task)
        else {
            const d = new Date(taskDate)
            d.setDate(d.getDate() - d.getDay())
            const key = `Week of ${d.toDateString()}`
            if (!groupedTasks[key]) groupedTasks[key] = []
            groupedTasks[key].push(task)
        }
    })
    return groupedTasks
}
