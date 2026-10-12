import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LatestLeads from '@/components/widgetsTables/LatestLeads'
import Project from '@/components/widgetsList/Project'
import TeamProgress from '@/components/widgetsList/Progress'
import TasksOverviewChart from '@/components/widgetsCharts/TasksOverviewChart'
import DashboardKpis from '@/components/widgetsStatistics/DashboardKpis'
import PageHeaderDate from '@/components/shared/pageHeader/PageHeaderDate'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import { verifyPagePermission } from '@/utils/verifyPagePermission'

/**
 * CRM dashboard (F-129): real KPIs for the selected period plus the task overview, latest clients,
 * project status and team progress widgets (all from the API; template widgets with demo data were removed).
 */
const Home = () => {
    const navigate = useNavigate()
    const [filters, setFilters] = useState({
        startDate: null,
        endDate: null,
        selectedFilters: []
    })
    useEffect(() => {
        verifyPagePermission('dashboard', 'view', navigate)
    }, [navigate])
    return (
        <>
            <PageHeader>
                <PageHeaderDate filters={filters} setFilters={setFilters} />
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <DashboardKpis filters={filters} />
                    <TasksOverviewChart filters={filters} />
                    <LatestLeads title={"Latest Clients"} />
                    <Project cardYSpaceClass="hrozintioal-card" borderShow={true} title="Project Status" />
                    <TeamProgress title={"Team Progress"} footerShow={true} />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default Home
