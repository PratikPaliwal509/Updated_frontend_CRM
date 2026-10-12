import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { api } from '@/utils/authSession'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const every = (p) => {
    if (!p?.type) return ''
    const n = Number(p.interval) || 1
    const unit = { daily: 'day', weekly: 'week', monthly: 'month' }[p.type]
    let s = n === 1 ? `Every ${unit}` : `Every ${n} ${unit}s`
    if (p.type === 'weekly' && p.daysOfWeek?.length) s += ` on ${p.daysOfWeek.map((d) => d.slice(0, 3)).join(', ')}`
    if (p.end_date) s += ` until ${p.end_date}`
    return s
}

/** Repeat settings of a task: shows the schedule, managers can change or stop it. */
const TaskRecurrence = ({ task, canManage, onChanged }) => {
    const [editing, setEditing] = useState(false)
    const [form, setForm] = useState({ type: 'weekly', interval: 1, daysOfWeek: [], end_date: '' })
    const [busy, setBusy] = useState(false)
    const p = task?.recurrence_pattern

    useEffect(() => {
        setEditing(false)
        if (p?.type) setForm({ type: p.type, interval: p.interval || 1, daysOfWeek: p.daysOfWeek || [], end_date: p.end_date || '' })
    }, [task?.task_id]) // eslint-disable-line react-hooks/exhaustive-deps

    const save = async (on) => {
        setBusy(true)
        try {
            await api(`/api/tasks/${task.task_id}/recurrence`, {
                method: 'PATCH',
                body: on ? { is_recurring: true, recurrence_pattern: { ...form, interval: Number(form.interval) || 1, end_date: form.end_date || null } } : { is_recurring: false },
            })
            toast.success(on ? 'Repeat schedule saved' : 'This task no longer repeats')
            setEditing(false)
            onChanged?.()
        } catch (err) { toast.error(err.message) } finally { setBusy(false) }
    }

    if (task?.parent_task_id) return null
    return (
        <div className="recurrence" data-testid="recurrence">
            <h2 className="fs-16 fw-bold mb-1">Repeat</h2>
            {task?.recurrence_source && (
                <p className="fs-12 text-muted mb-2">Created from the recurring task "{task.recurrence_source.task_title}"{task.recurrence_date ? ` for ${String(task.recurrence_date).slice(0, 10)}` : ''}.</p>
            )}
            {task?.is_recurring ? (
                <p className="fs-13 mb-2">
                    <span className="badge bg-soft-primary text-primary me-2">{every(p)}</span>
                    {p?.next_date && <span className="text-muted">Next copy due {p.next_date}</span>}
                </p>
            ) : !task?.recurrence_source && <p className="fs-12 text-muted mb-2">{p?.ended ? 'The repeat schedule has ended.' : 'This task does not repeat.'}</p>}
            {canManage && !editing && (
                <div className="d-flex gap-2">
                    <button type="button" className="btn btn-sm btn-light-brand" onClick={() => setEditing(true)}>{task?.is_recurring ? 'Change schedule' : 'Make it repeat'}</button>
                    {task?.is_recurring && <button type="button" className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => window.confirm('Stop repeating this task? Copies already created stay.') && save(false)}>Stop repeating</button>}
                </div>
            )}
            {editing && (
                <div className="border rounded p-3 mt-2">
                    <div className="row g-2">
                        <div className="col-sm-4">
                            <label className="form-label fs-12">Repeats</label>
                            <select className="form-select form-select-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
                            </select>
                        </div>
                        <div className="col-sm-3">
                            <label className="form-label fs-12">Every</label>
                            <input type="number" min={1} max={365} className="form-control form-control-sm" value={form.interval} onChange={(e) => setForm({ ...form, interval: e.target.value })} />
                        </div>
                        <div className="col-sm-5">
                            <label className="form-label fs-12">Until (optional)</label>
                            <input type="date" className="form-control form-control-sm" value={form.end_date || ''} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                        </div>
                        {form.type === 'weekly' && (
                            <div className="col-12 d-flex flex-wrap gap-2">
                                {DAYS.map((d) => (
                                    <label key={d} className="form-check-label fs-12 d-flex align-items-center gap-1">
                                        <input type="checkbox" className="form-check-input m-0" checked={form.daysOfWeek.includes(d)}
                                            onChange={() => setForm({ ...form, daysOfWeek: form.daysOfWeek.includes(d) ? form.daysOfWeek.filter((x) => x !== d) : [...form.daysOfWeek, d] })} />
                                        {d.slice(0, 3)}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                    <p className="fs-11 text-muted mt-2 mb-2">A copy of this task (same assignees, priority and checklist) is created for each date, on its start day.</p>
                    <div className="d-flex gap-2">
                        <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={() => save(true)}>Save schedule</button>
                        <button type="button" className="btn btn-sm btn-light" onClick={() => setEditing(false)}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default TaskRecurrence
