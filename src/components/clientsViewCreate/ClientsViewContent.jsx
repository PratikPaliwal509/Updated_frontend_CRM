
import React from 'react'
import TabClientsProfile from './TabClientsProfile'
import ClientsEmptyCard from './ClientsEmptyCard'
import ClientProjectCost from './ClientProjectCost'
import KanbanBoard from '../kanban/KanbanBoard'
import ClientProjects from './ClientProjects'
import ClientOverviewTab from '../clientMgmt/ClientOverviewTab'
import ClientContactsTab from '../clientMgmt/ClientContactsTab'
import ClientNotesTab from '../clientMgmt/ClientNotesTab'
import ClientDocumentsTab from '../clientMgmt/ClientDocumentsTab'
import ClientOnboardingTab from '../clientMgmt/ClientOnboardingTab'
import ClientTimelineTab from '../clientMgmt/ClientTimelineTab'
import ClientPortalUsersTab from '../clientMgmt/ClientPortalUsersTab'
import ClientInvoicesTab from '../clientMgmt/ClientInvoicesTab'
const ClientsViewContent = ({ client }) => {
  return (
    <>
      {/* PROFILE TAB */}
      <TabClientsProfile client={client} />

      {/* PROPOSALS TAB */}
      {/* <div className="tab-pane fade" id="proposalTab" role="tabpanel">
        <ClientsEmptyCard
          title="No proposals yet!"
          description={`There are no proposals created for ${client?.company_name}`}
        />
      </div> */}
      {/* PROJECT COST TAB */}
      <div className="tab-pane fade" id="projectCostTab" role="tabpanel">
        {client?.projectCost.length > 0 ? (
          <ClientProjectCost projectCost={client?.projectCost} />
        ) : (
          <ClientsEmptyCard
            title="No project cost data"
            description={`No billing data available for ${client?.company_name}`}
          />
        )}
      </div>
      {/* TASKS TAB */}
      {/* <div className="tab-pane fade" id="tasksTab" role="tabpanel">
        <ClientsEmptyCard
          title="No tasks yet!"
          description={`There are no tasks created for ${client?.company_name}`}
        />
      </div> */}

      {/* NOTES TAB (one note per entry, with author and pinning) */}
      <div className="tab-pane fade" id="notesTab" role="tabpanel" style={{ minHeight: "50vh" }}>
        <ClientNotesTab clientId={client.client_id} />
      </div>

      {/* CLIENT MANAGEMENT TABS */}
      <div className="tab-pane fade" id="overviewTab" role="tabpanel"><ClientOverviewTab clientId={client.client_id} /></div>
      <div className="tab-pane fade" id="contactsTab" role="tabpanel"><ClientContactsTab clientId={client.client_id} /></div>
      <div className="tab-pane fade" id="onboardingTab" role="tabpanel"><ClientOnboardingTab clientId={client.client_id} /></div>
      <div className="tab-pane fade" id="documentsTab" role="tabpanel"><ClientDocumentsTab clientId={client.client_id} /></div>
      <div className="tab-pane fade" id="invoicesTab" role="tabpanel"><ClientInvoicesTab clientId={client.client_id} /></div>
      <div className="tab-pane fade" id="timelineTab" role="tabpanel"><ClientTimelineTab clientId={client.client_id} /></div>
      <div className="tab-pane fade" id="portalUsersTab" role="tabpanel"><ClientPortalUsersTab clientId={client.client_id} /></div>

      {/* TASKS TAB */}
      <div className="tab-pane fade " id="tasksTab" role="tabpanel" style={{height:"56vh" }}>
        <KanbanBoard tasks={client?.tasks || []} />
      </div>
      <div className="tab-pane fade " id="projectTab" role="tabpanel" style={{minHeight:"56vh" }}><ClientProjects projects={client.projects} /></div>


      {/* COMMENTS TAB */}
      {/* <div className="tab-pane fade" id="commentTab" role="tabpanel">
        <ClientsEmptyCard
          title="No comments yet!"
          description={`There are no comments for ${client?.company_name}`}
        />
      </div> */}
    </>
  )
}

export default ClientsViewContent
