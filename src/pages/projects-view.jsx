
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import ProjectViewHeader from '@/components/projectsView/ProjectViewHeader'
import ProjectViewTabItems from '@/components/projectsView/ProjectViewTabItems'
import TabProjectOverview from '@/components/projectsView/TabProjectOverview'
import LeadsEmptyCard from '@/components/leadsViewCreate/LeadsEmptyCard'
import GanttTimeline from '@/components/Gantt/GanttTimeline'
import { useNavigate } from 'react-router-dom'
import { verifyPagePermission } from '@/utils/verifyPagePermission'
import TabProjectMembers from '@/components/projectsView/TabProjectMembers'
import Footer from '@/components/shared/Footer'
import Loader from '@/components/loader'
import KanbanBoard from '../components/kanban/KanbanBoard'
import ClientEdit from './clients-edit'
import ClientTab from '@/components/projectsView/ClientTab'
import { API_BASE_URL } from '../config/api';
import ProjectDashboardTab from '@/components/projectMgmt/ProjectDashboardTab'
import ProjectNotesTab from '@/components/projectMgmt/ProjectNotesTab'
const ProjectsView = () => {
  const { id } = useParams() // project id from route
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)

  const navigate = useNavigate();
  useEffect(() => {
    const checkPermission = async () => {
      await verifyPagePermission('projects', 'view', navigate);
    };

    checkPermission();
  }, []);
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const token = localStorage.getItem('token')

        const res = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const json = await res.json()

        if (json.success) {
          setProject(json.data)
        }
      } catch (error) {
        console.error('Failed to fetch project', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProject()
  }, [id])

  if (loading) {
    return <Loader />
  }

  if (!project) {
    return <div className="p-4 text-danger">Project not found</div>
  }

  return (
    <>
      <PageHeader>
        {/* pass project to header */}
        <ProjectViewHeader project={project} />
      </PageHeader>

      {/* <ProjectViewTabItems /> */}
      <ProjectViewTabItems
        tabs={[
          { id: 'overviewTab', label: 'Overview', active: true },
          { id: 'dashboardTab', label: 'Dashboard' },
          { id: 'ganttTab', label: 'Gantt Timeline' },
          { id: 'notesTab', label: 'Notes' },
        ]}
      />


      <div className="main-content">
        <div className="tab-content">
          {/* pass project to overview */}
          <TabProjectOverview project={project} />
          <TabProjectMembers project={project} />
          <div className="tab-pane fade" id="ganttTab">
            <GanttTimeline projectId={project.project_id} />
          </div>
          <div className="tab-pane fade" id="tasksTab" role="tabpanel" style={{height:"56vh" }}>
            <KanbanBoard tasks={project?.tasks} project_name={project?.project_name}
            />
          </div>
          <div className="tab-pane fade" id="clientTab" role="tabpanel">
            <ClientTab client={project?.client}
            />
          </div>
          <div className="tab-pane fade" id="dashboardTab">
            <ProjectDashboardTab projectId={project.project_id} />
          </div>
          <div className="tab-pane fade" id="notesTab">
            <ProjectNotesTab projectId={project.project_id} canManage={project.can_manage === true} />
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}

export default ProjectsView
