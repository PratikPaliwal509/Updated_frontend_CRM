import React, { startTransition, useEffect, useState } from 'react'
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../../config/api';
const KANBAN_COLUMNS = [
  { key: 'to_do', title: 'To Do' },
  { key: 'inprogress', title: 'In Progress' },
  { key: 'pending', title: 'Pending' },
  { key: 'review', title: 'In Review' },
  { key: 'completed', title: 'Completed' },
  { key: 'rejected', title: 'Rejected' },
  { key: 'cancelled', title: 'Cancelled' },
]
const KNOWN = KANBAN_COLUMNS.map((c) => c.key)
// older / unknown statuses are shown in the To Do column
const columnOf = (task) => (KNOWN.includes(task.status) ? task.status : 'to_do')

const KanbanBoard = ({ tasks, onSelect, onStatusChange }) => {
  const userId = JSON.parse(localStorage.getItem('user'))?.user_id
  const [tasks2, setTasks] = useState(tasks || [])
  useEffect(() => {
    setTasks(tasks)
  }, [tasks])

  const onDragStart = (e, task) => {
    e.dataTransfer.setData('taskId', task.id)
    e.dataTransfer.setData('fromStatus', task.status)
  }

  const onDragOver = (e) => {
    e.preventDefault() // REQUIRED to allow drop
  }
  const onDrop = async (e, newStatus) => {
    e.preventDefault()

    const taskId = e.dataTransfer.getData('taskId')
    const fromStatus = e.dataTransfer.getData('fromStatus')

    if (!taskId || fromStatus === newStatus) return

    // optimistic UI update
    setTasks((prev) =>
      prev.map((task) =>
        task.id === Number(taskId)
          ? { ...task, status: newStatus }
          : task
      )
    )

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(
        `${API_BASE_URL}/api/tasks/${taskId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      )

      const data = await res.json()

      if (!res.ok) throw new Error(data.message || 'Status update failed')

      onStatusChange && onStatusChange(Number(taskId), newStatus)
      toast.success('Task status updated')
    } catch (err) {
      toast.error(err.message || 'Failed to update status')

      // rollback if API fails
      setTasks((prev) =>
        prev.map((task) =>
          task.id === Number(taskId)
            ? { ...task, status: fromStatus }
            : task
        )
      )
    }
  }

  return (
    <div className="row overflow-x-auto  flex-nowrap g-4 h-100 ">
      {/* <div className="row overflow-x-auto  flex-nowrap d-flex g-4"> */}
      {KANBAN_COLUMNS.map((col) => (
        <div key={col.key} className="col-md-4 mb-4">
          <div className="card h-100  col overflow-y-auto  flex-nowrap d-flex g-4" >
            <div className="card-header fw-bold text-center">
              {col.title}
            </div>

            <div className="card-body d-flex flex-column gap-3" onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, col.key)}>
              {tasks2
                .filter((task) => columnOf(task) === col.key)
                .map((task) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  const dueDate = task?.due_date ? (() => { const d = new Date(task.due_date); return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) })() : null; // calendar day

                  let status = "No Due Date";
                  let badgeClass = "badge bg-secondary";

                  if (task?.status === "completed" || task?.status === "cancelled") {
                    status = task?.status === "cancelled" ? "Cancelled" : "Completed";
                    badgeClass = "badge bg-primary";
                  } 
                  else if (!dueDate) {
                    status = "";
                    badgeClass = "badge bg-secondary";
                  } 
                  else {
                    dueDate.setHours(0, 0, 0, 0);

                    if (dueDate < today) {
                      status = "Overdue";
                      badgeClass = "badge bg-danger";
                    } else if (dueDate.getTime() === today.getTime()) {
                      status = "Due Today";
                      badgeClass = "badge bg-warning text-dark";
                    } else {
                      status = dueDate.toLocaleDateString();
                      badgeClass = "badge bg-success";
                    }
                  }
                  return (
                    <div
                      key={task.id}
                      className="p-3 border rounded cursor-pointer hover-shadow"
                      onClick={() => onSelect(task)}
                      draggable
                      onDragStart={(e) => onDragStart(e, task)}
                      style={{ cursor: 'pointer' }}
                      data-bs-toggle="offcanvas"
                      data-bs-target="#tasksDetailsOffcanvas"
                    >
                      <div className="fw-semibold mb-1">
                        {task.title}
                      </div>

                      <div className="fs-12 text-muted mb-2 text-truncate">
                        {task.description}
                      </div>

                      <div className="d-flex justify-content-between align-items-center">
                        <span
                          className={`badge bg-${task.priorityBgColor} text-${task.priorityColor}`}
                        >
                          {task.priority}
                        </span>

                        {/* ✅ YOUR TASK BADGE */}
                        {task.assignments?.some(
                          (a) => Number(a.user_id) === Number(userId)
                        ) && (
                            <span className="badge bg-primary ms-2">
                              Your Task
                            </span>
                          )}
                        {/* In kanban we dont need to show status */}
                          {!(task?.status === "completed") && (
                          <span className={badgeClass}>
                            {status}
                          </span>)
                        }
                        {/* !(task?.status === "completed" && status) &&  */}
                        {/* <img
                          src={task.assignments[0]?.user?.avatar_url || "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5OjcBCgoKDQwNGg8PGjclHyU3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3N//AABEIAJQAlwMBIgACEQEDEQH/xAAbAAEAAwEBAQEAAAAAAAAAAAAABAUGAwIBB//EADQQAAICAQEFBQUHBQAAAAAAAAABAgMEEQUTITGSEkFRU3EiMmGR4RQjQlJiscEVNHKB0f/EABUBAQEAAAAAAAAAAAAAAAAAAAAB/8QAFhEBAQEAAAAAAAAAAAAAAAAAABEB/9oADAMBAAIRAxEAPwD9bABUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABGuz8al6TtTl3qPHQ4f1fF15WevZAsARqc7GuaULVq/wy4MkgAAAAAAAAAAAAAAAAAAB5ssjVCVlj7MY8W33FDm7RsyG4w1hV4Lm/U97ZynZduIP2K37XxkVxUAAAJ2DtGeO1CxudXhza9CCANZXONkFOt6xa1TPRSbGynC37PN+zPjH4P6l2RQAAAAAAAAAAAAAPF091TOx8oxcvkj2RtpcMG/8AxAzbbk229W+LPgBUAAAAAH2MpQkpxekovVepq4SU4RmuUkmZM02BxwqdfyIaqQACAAAAAAAAAAAByyq97jW1rnKDS9dDqAMiCXtPGePlS09yXtR/4RCoAAAAAHoaqiG6phD8sUii2Vj7/KjJr7ut9p/HwRoRqgAIAAAAAAAAAAAAADhl40Mqh1z4PnGS7mZ3Jx7Max12rR9z7n6GpOd8KrION6i4fqAyoLO/BwtW68yEPg2pfsR/slWv97Rp/sqIh2xsezJsUK46+L7kTsfBw9U7cuE/gpKKLemFdcFGmMVH9IV4xceGNSq4L1fizsAQAAAAAAAAAAAAOOVk14tfbsfPlHvfoB1bSTbaSXiQMna1NWqpW9ku9cvmVeZnW5T0k+zBcoLl9SLzLBMu2llW8rN2vCHAiSlKb1m3J+MuJ8AQAAA9QnOD1hJxfinoeQBNp2nk1c5KxeE1/JZY21KLmo2fdT8HxXzKAAa1cVqj6Z3Cz7cV6e/X+V93oX1F1d9asqlrF/NEV0AAAAAAABzvthRVKyz3Y8/iZvKyLMm12WPj3LwRN23f2rVRF8IcZer+n7lYUAAEAAAAAAAAAAAJGHlTxbe2tXF8JR8URwFayucbYRnB6xktUz0VGw7/AH8eT5LtR/ktyAAAAAAzWVXdbk2z3Vj1m/wM5bi7ybOhmqGpaMruLvJs6GNxd5NnQzVajUUZXcXeTZ0Mbi7ybOhmq1Gooyu4u8mzoY3F3k2dDNVqNRRldxd5NnQxuLvJs6GarUaijK7i7ybOhjcXeTZ0M1Wo1FGV3F3k2dDG4u8mzoZqtRqKM7s+u6rNqk6rEu1o32X38DRDUEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB/9k="}
                          alt="user"
                          className="avatar-image avatar-sm"
                        /> */}
                        {/* Client approval state (clients approve or ask for changes in the portal) */}
                        {task.client_approval_required && (
                          <div className="mt-2">
                            {task.client_approval_status === 'approved' || task.client_approved
                              ? <span className="badge bg-soft-success text-success">Client approved</span>
                              : task.client_approval_status === 'changes_requested'
                                ? <span className="badge bg-soft-danger text-danger">Client requested changes</span>
                                : <span className="badge bg-soft-warning text-warning">Waiting for client approval</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

              {tasks2.filter((t) => columnOf(t) === col.key).length === 0 && (
                <div className="text-muted fs-12 text-center">
                  No Tasks
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default KanbanBoard
