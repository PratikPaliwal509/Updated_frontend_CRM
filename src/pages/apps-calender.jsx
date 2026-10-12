import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import TaskContent from '@/components/tasks/TaskContent'
import { verifyPagePermission } from '@/utils/verifyPagePermission'

// Calendar = the real task calendar (due dates of the tasks you can see); the old page showed sample events.
const AppsCalender = () => {
    const navigate = useNavigate()
    useEffect(() => { verifyPagePermission('tasks', 'view', navigate) }, []) // eslint-disable-line react-hooks/exhaustive-deps
    return <TaskContent initialView="calendar" />
}

export default AppsCalender
