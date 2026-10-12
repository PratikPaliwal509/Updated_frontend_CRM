import React, { useState, useEffect } from 'react'
import { ViewMode, Gantt } from 'gantt-task-react'
import 'gantt-task-react/dist/index.css'
import TaskTree from './TaskTree'
import { API_BASE_URL } from '../../config/api';

const validDate = (v) => { const d = v ? new Date(v) : null; return d && !Number.isNaN(d.getTime()) ? d : null }

// gantt-task-react crashes the whole page on a task without valid dates, with end before start,
// or with a dependency on a task that is not in the chart - keep only drawable tasks and links.
const mapTasks = (tasks = []) => {
  const drawable = tasks
    .map((t) => ({ t, start: validDate(t.start_date), end: validDate(t.due_date) }))
    .filter((x) => x.start && x.end)
  const ids = new Set(drawable.map((x) => String(x.t.task_id)))
  return drawable.map(({ t, start, end }) => ({
    id: String(t.task_id),
    name: t.task_title || `Task ${t.task_id}`,
    start,
    end: end > start ? end : new Date(start.getTime() + 86400000),
    progress: Math.min(100, Math.max(0, Number(t.progress_percentage) || 0)), // Ensure 0-100 range
    type: 'task',
    project: t.project_id ? String(t.project_id) : '',
    dependencies: (t.depends_on || []).map(String).filter((d) => ids.has(d) && d !== String(t.task_id)),
  }))
}

/** Keeps a chart error inside the Gantt tab instead of replacing the whole project page. */
class GanttBoundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false } }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err) { console.error('Gantt error', err) }
  render() { return this.state.failed ? <div className="alert alert-warning">The timeline could not be drawn for these tasks.</div> : this.props.children }
}

const GanttTimeline = ({ projectId }) => {
  const [tasks, setTasks] = useState([])
  const [ganttTasks, setGanttTasks] = useState([])
  const [view, setView] = useState(ViewMode.Day)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (projectId) fetchTasks()
  }, [projectId])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('token')

      const res = await fetch(`${API_BASE_URL}/api/tasks/project/${projectId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) throw new Error('Failed to fetch tasks')

      const data = await res.json()
      setTasks(Array.isArray(data) ? data : data.data || [])
      setGanttTasks(mapTasks(Array.isArray(data) ? data : data.data || []))
    } catch (err) {
      console.error('Error fetching tasks:', err)
      setError(err.message)
      setTasks([])
      setGanttTasks([])
    } finally {
      setLoading(false)
    }
  }

  const onDateChange = async (task) => {
    setGanttTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, start: task.start, end: task.end } : t
      )
    )

    try {
      const token = localStorage.getItem('token')
      await fetch(`${API_BASE_URL}/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          start_date: task.start.toISOString().split('T')[0],
          due_date: task.end.toISOString().split('T')[0],
        }),
      })
    } catch (err) {
      console.error('Error updating task dates:', err)
    }
  }

  const onProgressChange = async (task) => {
    setGanttTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, progress: task.progress } : t
      )
    )

    try {
      const token = localStorage.getItem('token')
      await fetch(`${API_BASE_URL}/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          progress_percentage: task.progress,
        }),
      })
    } catch (err) {
      console.error('Error updating task progress:', err)
    }
  }

  if (loading) return <div className="p-4"><div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div></div>

  if (error) return <div className="p-4 alert alert-danger">Error: {error}</div>

  return (
    <div className="row ">
      <div className=" mb-3">
      {/* <div className="col-lg-3 mb-3"> */}
        <div className="card" >
          <div className="card-body">
            <h6 className="mb-3">Task Hierarchy</h6>
            {tasks.length > 0 ? (
              <TaskTree tasks={tasks} />
            ) : (
              <p className="text-muted">No tasks yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="col-lg-12">
        <div className="card">
          <div className="card-body">
            <div className="d-flex mb-3 gap-2">
              <button
                className={`btn btn-sm ${view === ViewMode.Day ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setView(ViewMode.Day)}
              >
                Day
              </button>
              <button
                className={`btn btn-sm ${view === ViewMode.Week ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setView(ViewMode.Week)}
              >
                Week
              </button>
              <button
                className={`btn btn-sm ${view === ViewMode.Month ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setView(ViewMode.Month)}
              >
                Month
              </button>
            </div>

            {ganttTasks.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <GanttBoundary>
                <Gantt
                  tasks={ganttTasks}
                  viewMode={view}
                  onDateChange={onDateChange}
                  onProgressChange={onProgressChange}
                  listCellWidth="200px"
                  columnWidth={view === ViewMode.Month ? 60 : view === ViewMode.Week ? 80 : 120}
                />
                </GanttBoundary>
              </div>
            ) : (
              <div className="alert alert-info">No tasks with dates to display</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GanttTimeline
