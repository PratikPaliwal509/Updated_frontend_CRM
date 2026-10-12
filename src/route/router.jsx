import { createBrowserRouter, Navigate } from "react-router-dom";
import RootLayout from "../layout/root";
import Home from "../pages/home";
// import ReportsLeads from "../pages/reports-leads";
import ReportsProject from "../pages/projectMgmt/ProjectsReportPage"; // template page replaced by the real projects report
import AppsChat from "../pages/apps-chat";
import LayoutApplications from "../layout/layoutApplications";
import AppsEmail from "../pages/apps-email";
import LoginCover from "../pages/login-cover";
import AppsTasks from "../pages/apps-tasks";
import AppsNotes from "../pages/apps-notes";
import AppsCalender from "../pages/apps-calender";
import AppsStorage from "../pages/apps-storage";
// import Proposalist from "../pages/proposal-list"; (template page replaced by Client Management)
// import CustomersList from "../pages/customers-list"; (template page replaced by Client Management)
// import ProposalView from "../pages/proposal-view"; (template page replaced by Client Management)
// import ProposalEdit from "../pages/proposal-edit"; (template page replaced by Client Management)
// import CustomersView from "../pages/customers-view"; (template page replaced by Client Management)
// import CustomersCreate from "../pages/customers-create"; (template page replaced by Client Management)
// import ProposalCreate from "../pages/proposal-create"; (template page replaced by Client Management)
// import PaymentList from "../pages/payment-list"; (template page replaced by Client Management)
// import PaymentView from "../pages/payment-view/"; (template page replaced by Client Management)
// import PaymentCreate from "../pages/payment-create"; (template page replaced by Client Management)
import ProjectsList from "../pages/projects-list";
import ProjectsView from "../pages/projects-view";
import ProjectsCreate from "../pages/projects-create";
import ProjectEdit from "../pages/project-edit";
import ProjectMember from "../pages/project-member";
import SettingsGaneral from "../pages/settings-ganeral";
import LayoutSetting from "../layout/layoutSetting";
import SettingsSeo from "../pages/settings-seo";
import SettingsTags from "../pages/settings-tags";
import SettingsEmail from "../pages/settings-email";
import SettingsTasks from "../pages/settings-tasks";
import SettingsLeads from "../pages/settings-leads";
// import SettingsMiscellaneous from "../pages/settings-miscellaneous";
// import SettingsRecaptcha from "../pages/settings-recaptcha";
// import SettingsLocalization from "../pages/settings-localization";
// import SettingsCustomers from "../pages/settings-customers";
// import SettingsGateways from "../pages/settings-gateways";
// import SettingsFinance from "../pages/settings-finance";
// import SettingsSupport from "../pages/settings-support";
import LayoutAuth from "../layout/layoutAuth";
// import LoginMinimal from "../pages/login-minimal";
// import LoginCreative from "../pages/login-creative";
import RegisterCover from "../pages/register-cover";
// import RegisterMinimal from "../pages/register-minimal";
// import RegisterCreative from "../pages/register-creative";
import ResetCover from "../pages/reset-cover";
// import ResetMinimal from "../pages/reset-minimal";
// import ResetCreative from "../pages/reset-creative";
import ErrorCover from "../pages/error-cover";
// import ErrorCreative from "../pages/error-creative";
// import ErrorMinimal from "../pages/error-minimal";
import OtpCover from "../pages/otp-cover";
// import OtpMinimal from "../pages/otp-minimal";
// import OtpCreative from "../pages/otp-creative";
// import MaintenanceCover from "../pages/maintenance-cover";
// import MaintenanceMinimal from "../pages/maintenance-minimal";
// import MaintenanceCreative from "../pages/maintenance-creative";
// import HelpKnowledgebase from "../pages/help-knowledgebase";
// WidgetsLists have error and it is not required also
// import WidgetsLists from "../pages/widgets-lists";
// import WidgetsTables from "../pages/widgets-tables";
// import WidgetsCharts from "../pages/widgets-charts";
// import WidgetsStatistics from "../pages/widgets-statistics";
// import WidgetsMiscellaneous from "../pages/widgets-miscellaneous";

// Removed this roles, added new roles pages
// import AddRoles from "@/components/Roles/AddRoles";
// import RoleList from "@/components/Roles/RoleList";
// import EditRole from "@/components/Roles/EditRoles";
// import ViewRole from "@/components/Roles/View.Roles";
import ClientsList from "../pages/clientsList";
import ClientsView from "../pages/clients-view";
import ClientsCreate from "../pages/clients-create";
import ClientEdit from "../pages/clients-edit";
// ReportsClients have error and it is not required also
// import ReportsClients from "../pages/reports-clients";
import AddDepartments from "../pages/add-departments";
import DepartmentsList from "../pages/departments-list";
import DepartmentsView from "../pages/department-view";
import DepartmentEdit from "../pages/edit-department";
import TeamCreate from "../pages/team-create";
import TeamsView from "../pages/team-view";
import TeamEdit from "../pages/teams-edit";
import TeamsList from "../pages/teams-list";
import AllNotifications from "../pages/AllNotifications";
import Profile from "../pages/profile";
import ProfileEdit from "../pages/profile-edit";
import CreateUser from "../pages/user-add";
import UsersList from "../pages/user-list";
import UsersView from "../pages/user-view";
import UserEditPage from "../pages/user-edit";
import RolesList from "../pages/role-list";
import RolesCreate from "../pages/role-add";
import RolesEdit from "../pages/role-edit";
import RoleView from "../pages/role-view";
import TimesheetPage from "../pages/timesheetPage";
import TeamTimesheetPage from "../pages/teamTimesheetPage";
import UserHierarchy from "../pages/UserHierchy";
import Logout from "../pages/logout";
import CreateWeeklyPlan from "../pages/CreateWeeklyPlan";
import WeeklyPlanDetails from "../pages/WeeklyPlanDetails";
import WeeklyPlans from "../pages/WeeklyPlans";
import MetaPosts from "../pages/MetaPosts";
import MetaForms from "../pages/metaForms";
import ComposePostPage from "../pages/meta/ComposePostPage";
import ScheduledPostsPage from "../pages/meta/ScheduledPostsPage";
import InboxPage from "../pages/meta/InboxPage";
import IntegrationsPage from "../pages/meta/IntegrationsPage";
import AdsInsightsPage from "../pages/meta/AdsInsightsPage";
import AdChangesPage from "../pages/meta/AdChangesPage";
import ReportsPage from "../pages/reports/ReportsPage";
import ReportBuilderPage from "../pages/reports/ReportBuilderPage";
import ReportRunPage from "../pages/reports/ReportRunPage";
import SharedReportPage from "../pages/reports/SharedReportPage";
import MetaCallbackPage from "../pages/meta/MetaCallbackPage";
import DataDeletionStatusPage from "../pages/meta/DataDeletionStatusPage";
import MetaFormLeads from "../pages/metaFormLeads";
import CampaignsList from "../pages/campaignsList";
import CampaignCreate from "../pages/campaignCreate";
import CampaignEdit from "../pages/CampaignEdit";
import CampaignView from "../pages/CampaignView";
import AdSetCreate from "../pages/AdSetCreate";
import CreativesList from "../pages/CreativesList";
import CreativeCreate from "../pages/CreativeCreate";
import CreativeEdit from "../pages/CreativeEdit";
import AdSetsList from "../pages/AdSetsList";
import AdSetView from "../pages/AdSetView";
import AdsList from "../pages/AdsList";
import AdView from "../pages/AdView";
import CreativeView from "../pages/CreativeView";
import AdCreate from "../pages/AdCreate";
import AdSetEdit from "../pages/AdSetEdit";
import AdEdit from "../pages/AdEdit";
import SeoReport from "../pages/SeoReport";
// import MetaAdView from "../pages/MetaAdView";
import RequireAuth from "@/components/authentication/RequireAuth";
import LeadsPage from "../pages/clientMgmt/LeadsPage";
import LeadViewPage from "../pages/clientMgmt/LeadViewPage";
import CustomersPage from "../pages/clientMgmt/CustomersPage";
import ProposalsPage from "../pages/clientMgmt/ProposalsPage";
import ProposalEditorPage from "../pages/clientMgmt/ProposalEditorPage";
import ProposalViewPage from "../pages/clientMgmt/ProposalViewPage";
import InvoicesPage from "../pages/clientMgmt/InvoicesPage";
import InvoiceEditorPage from "../pages/clientMgmt/InvoiceEditorPage";
import InvoiceViewPage from "../pages/clientMgmt/InvoiceViewPage";
import PaymentsPage from "../pages/clientMgmt/PaymentsPage";
import TeamActivityPage from "../pages/team/TeamActivityPage";
import ActivityLogPage from "../pages/team/ActivityLogPage";
import ResetPasswordPage from "../pages/platformAuth/ResetPasswordPage";
import VerifyEmailPage from "../pages/platformAuth/VerifyEmailPage";
import AcceptInvitePage from "../pages/platformAuth/AcceptInvitePage";
import OnboardingPage from "../pages/platformAuth/OnboardingPage";
import PortalPage from "../pages/platformAuth/PortalPage";
import AccountSecurityPage from "../pages/platformAuth/AccountSecurityPage";
import NotificationSettingsPage from "../pages/taskMgmt/NotificationSettingsPage";
import UnsubscribePage from "../pages/taskMgmt/UnsubscribePage";
import WorkspaceSettingsPage from "../pages/platformAuth/WorkspaceSettingsPage";
import InvitationsPage from "../pages/platformAuth/InvitationsPage";
import SecurityLogPage from "../pages/platformAuth/SecurityLogPage";
import PlatformWorkspacesPage from "../pages/platformAuth/PlatformWorkspacesPage";
export const router = createBrowserRouter([
    {
        path: "/",
        element: <RequireAuth><RootLayout /></RequireAuth>,
        children: [
            {
                path: "/",
                element: <Home />
            },
            {
                path: "/account/security",
                element: <AccountSecurityPage />
            },
            {
                path: "/account/notifications",
                element: <NotificationSettingsPage />
            },
            {
                path: "/user/invitations",
                element: <InvitationsPage />
            },
            {
                path: "/platform/workspaces",
                element: <PlatformWorkspacesPage />
            },
            {
                path: "profile",
                element: <Profile />
            },
            {
                path: "profile/edit",
                element: <ProfileEdit />
            },
            {
                path: "/notifications",
                element: <AllNotifications />
            },
            {
                // demo-data template page removed (F-129) -> the real dashboard
                path: "/dashboards/analytics",
                element: <Navigate to="/" replace />
            },
            {
                // demo-data template page removed (F-129) -> client reports
                path: "/reports/sales",
                element: <Navigate to="/reports" replace />
            },
            // {
            //     path: "/reports/leads",
            //     element: <ReportsLeads />
            // },
            // {
            //     path: "/reports/clients",
            //     element: <ReportsClients />
            // },
            {
                path: "/reports/project",
                element: <ReportsProject />
            },
            {
                // demo-data template page removed (F-129) -> projects report (hours per project)
                path: "/reports/timesheets",
                element: <Navigate to="/reports/project" replace />
            },
            // Client Management: sales pipeline, customers, proposals, invoices, payments
            { path: "/leads/list", element: <LeadsPage /> },
            { path: "/leads/view/:id", element: <LeadViewPage /> },
            { path: "/customers/list", element: <CustomersPage /> },
            { path: "/proposal/list", element: <ProposalsPage /> },
            { path: "/proposal/create", element: <ProposalEditorPage /> },
            { path: "/proposal/edit/:id", element: <ProposalEditorPage /> },
            { path: "/proposal/view/:id", element: <ProposalViewPage /> },
            { path: "/invoices/list", element: <InvoicesPage /> },
            { path: "/invoices/create", element: <InvoiceEditorPage /> },
            { path: "/invoices/edit/:id", element: <InvoiceEditorPage /> },
            { path: "/invoices/view/:id", element: <InvoiceViewPage /> },
            { path: "/payment/list", element: <PaymentsPage /> },
            // Team Management
            { path: "/user/activity", element: <TeamActivityPage /> },
            {
                path: "/clients/list",
                element: <ClientsList />
            },
            {
                path: "/clients/view/:id",
                element: <ClientsView />
            },
            {
                path: "/clients/create",
                element: <ClientsCreate />
            },
            {
                path: "/clients/edit/:id",
                element: <ClientEdit />
            },
            {
                path: "/projects/create",
                element: <ProjectsCreate />
            },
            {
                path: "/projects/list",
                element: <ProjectsList />
            },
            {
                path: "/projects/view/:id",
                element: <ProjectsView />
            },
            {
                path: "/projects/edit/:id",
                element: <ProjectEdit />
            },
            {
                path: "/projects/members/create",
                element: <ProjectMember />
            },
            // {
            //     path: "/widgets/lists",
            //     element: <WidgetsLists />
            // },
            // {
            //     path: "/widgets/tables",
            //     element: <WidgetsTables />
            // },
            // {
            //     path: "/widgets/charts",
            //     element: <WidgetsCharts />
            // },
            // {
            //     path: "/widgets/statistics",
            //     element: <WidgetsStatistics />
            // },
            // {
            //     path: "/widgets/miscellaneous",
            //     element: <WidgetsMiscellaneous />
            // },
            // {
            //     path: "/help/knowledgebase",
            //     element: <HelpKnowledgebase />
            // },
            {
                path: "/teams/create",
                element: <TeamCreate />
            },
            {
                path: "/teams/view/:id",
                element: <TeamsView />
            },
            {
                path: "/teams/edit/:id",
                element: <TeamEdit />
            },
            {
                path: "/teams/list",
                element: <TeamsList />
            },
            {
                path: "/departments/view/:id",
                element: <DepartmentsView />
            },
            {
                path: "/departments/edit/:id",
                element: <DepartmentEdit />
            },
            {
                path: "/departments/list",
                element: <DepartmentsList />
            },
            {
                path: "/departments/create",
                element: <AddDepartments />
            },
            {
                path: "/user/create",
                element: <CreateUser />
            },
            {
                path: "/user/list",
                element: <UsersList />
            },
            {
                path: "/user/view/:id",
                element: <UsersView />
            },
            {
                path: "/user/edit/:id",
                element: <UserEditPage />
            },
            {
                path: "/user/hierarchy",
                element: <UserHierarchy />
            },
            {
                path:"/roles/list",
                element:<RolesList/>
            },
            {
                path:"/roles/create",
                element:<RolesCreate/>
            },
            {
                path:"/roles/edit/:id",
                element:<RolesEdit/>
            },
            {
                path:"/roles/view/:id",
                element:<RoleView/>
            },
            {
                path: "/weekly-plans",
                element: <WeeklyPlans />
            },
            {
                path: "/weekly-plans/create",
                element: <CreateWeeklyPlan />
            },
            {
                path: "/weekly-plans/:id",
                element: <WeeklyPlanDetails />
            },
            {
                path: "/meta/posts/list",
                element: <MetaPosts />
            },
            {
                path: "/meta/posts/create",
                element: <ComposePostPage />
            },
            {
                path: "/meta/posts/scheduled",
                element: <ScheduledPostsPage />
            },
            {
                path: "/meta/inbox",
                element: <InboxPage />
            },
            {
                path: "/meta/forms",
                element: <MetaForms />
            },
            {
                path: "/meta/forms/:formId/leads",
                element: <MetaFormLeads />
            },
            {
                path: "/meta-ads/campaigns",
                element: <CampaignsList />
            },
            {
                path: "/reports",
                element: <ReportsPage />
            },
            {
                path: "/reports/new",
                element: <ReportBuilderPage />
            },
            {
                path: "/reports/edit/:id",
                element: <ReportBuilderPage />
            },
            {
                path: "/reports/runs/:id",
                element: <ReportRunPage />
            },
            {
                path: "/meta-ads/insights",
                element: <AdsInsightsPage />
            },
            {
                path: "/meta-ads/changes",
                element: <AdChangesPage />
            },
            {
                path: "/meta-ads/campaigns/create",
                element: <CampaignCreate  />
            },
            {
                path: "/meta-ads/campaigns/edit/:id",
                element: <CampaignEdit  />
            },


            {
                path: "/meta-ads/campaigns/view/:id",
                element: <CampaignView  />
            },


            {
                path: "/meta-ads/campaigns/:campaignId/adsets",
                element: <AdSetsList  />
            },
            {
                path: "/meta-ads/campaigns/:campaignId/adsets/create",
                element: <AdSetCreate  />
            },
            {
                path: "/meta-ads/adsets/edit/:id",
                element: <AdSetEdit  />
            },
            {
                path: "/meta-ads/adsets/view/:id",
                element: <AdSetView  />
            },
            {
                path: "/meta-ads/adsets/:adSetId/ads",
                element: <AdsList  />
            },
            {
                path: "/meta-ads/adsets/:adSetId/ads/create",
                element: <AdCreate  />
            },
            {
                path: "/meta-ads/ads/edit/:id",
                element: <AdEdit   />
            },
            {
                path: "/meta-ads/ads/view/:adId",
                element: <AdView   />
            },


            {
                path: "/meta-ads/ads/:adId/creatives",
                element: <CreativesList   />
            },


            {
                path: "/meta-ads/ads/:adId/creatives/create",
                element: <CreativeCreate />
            },
            {
                path: "/meta-ads/creatives/edit/:id",
                element: <CreativeEdit   />
            },


            {
                path: "/meta-ads/creatives/view/:creativeId",
                element: <CreativeView  />
            },
            {
                path: "/seo",
                element: <SeoReport  />
            },
        ]
    },
    {
        path: "/",
        element: <RequireAuth><LayoutApplications /></RequireAuth>,
        children: [
            {
                path: "/applications/chat",
                element: <AppsChat />
            },
            {
                path: "/applications/email",
                element: <AppsEmail />
            },
            {
                path: "/applications/tasks",
                element: <AppsTasks />
            },
            {
                path: "/applications/my-timesheet",
                element: <TimesheetPage />
            },
            {
                path: "/applications/team-timesheet",
                element: <TeamTimesheetPage />
            },
            {
                path: "/applications/notes",
                element: <AppsNotes />
            },
            {
                path: "/applications/calender",
                element: <AppsCalender />
            },
            {
                path: "/applications/storage",
                element: <AppsStorage />
            },
            
            
        ]
    },

    {
        path: "/",
        element: <RequireAuth><LayoutSetting /></RequireAuth>,
        children: [
            {
                path: "/settings/workspace",
                element: <WorkspaceSettingsPage />
            },
            {
                path: "/settings/security-log",
                element: <SecurityLogPage />
            },
            {
                path: "/settings/integrations",
                element: <IntegrationsPage />
            },
            {
                path: "/settings/integrations/meta/callback",
                element: <MetaCallbackPage />
            },
            {
                path: "/settings/activity-log",
                element: <ActivityLogPage />
            },

            {
                path: "/settings/ganeral",
                element: <SettingsGaneral />
            },
            {
                path: "/settings/seo",
                element: <SettingsSeo />
            },
            {
                path: "/settings/tags",
                element: <SettingsTags />
            },
            {
                path: "/settings/email",
                element: <SettingsEmail />
            },
            {
                path: "/settings/tasks",
                element: <SettingsTasks />
            },
            {
                path: "/settings/leads",
                element: <SettingsLeads />
            },
            {
            //     path: "/settings/Support",
            //     element: <SettingsSupport />
            // },
            // {
            //     path: "/settings/finance",
            //     element: <SettingsFinance />
            // },
            // {
            //     path: "/settings/gateways",
            //     element: <SettingsGateways />
            // },
            // {
            //     path: "/settings/customers",
            //     element: <SettingsCustomers />
            // },
            // {
            //     path: "/settings/localization",
            //     element: <SettingsLocalization />
            // },
            // {
            //     path: "/settings/recaptcha",
            //     element: <SettingsRecaptcha />
            // },
            // {
            //     path: "/settings/miscellaneous",
            //     element: <SettingsMiscellaneous />
            },

            // {
            //     path: "/",
            //     // element: <LayoutSetting />,
            //     children: [
            //         {
            //             path: "/settings/roles",
            //             element: <RoleList />
            //         },
            //         {
            //             path: "/settings/roles/create",
            //             element: <AddRoles />
            //         },
            //         {
            //             path: "/settings/roles/edit/:id",
            //             element: <EditRole />
            //         },
            //         {
            //             path: "/settings/roles/view/:id",
            //             element: <ViewRole />
            //         },
            //     ]
            // },
        ]
    },
    {
        path: "/",
        element: <LayoutAuth />,
        children: [
            {
                path: "/authentication/login",
                element: <LoginCover />
            },
            {
                path: "/authentication/logout",
                element: <Logout />
            },
            {
                path: "/authentication/reset/new",
                element: <ResetPasswordPage />
            },
            {
                path: "/authentication/verify-email",
                element: <VerifyEmailPage />
            },
            {
                path: "/authentication/invite",
                element: <AcceptInvitePage />
            },
            {
                path: "/notifications/unsubscribe",
                element: <UnsubscribePage />
            },
            {
                path: "/meta/data-deletion",
                element: <DataDeletionStatusPage />
            },
            {
                path: "/shared/report/:token",
                element: <SharedReportPage />
            },
            {
                path: "/onboarding",
                element: <OnboardingPage />
            },
            {
                path: "/portal",
                element: <PortalPage />
            },
            // {
            //     path: "/authentication/login/minimal",
            //     element: <LoginMinimal />
            // },
            // {
            //     path: "/authentication/login/creative",
            //     element: <LoginCreative />
            // },
            {
                path: "/authentication/register/cover",
                element: <RegisterCover />
            },
            // {
            //     path: "/authentication/register/minimal",
            //     element: <RegisterMinimal />
            // },
            // {
            //     path: "/authentication/register/creative",
            //     element: <RegisterCreative />
            // },
            {
                path: "/authentication/reset/cover",
                element: <ResetCover />
            },
            // {
            //     path: "/authentication/reset/minimal",
            //     element: <ResetMinimal />
            // },
            // {
            //     path: "/authentication/reset/creative",
            //     element: <ResetCreative />
            // },
            {
                path: "/authentication/404/cover",
                element: <ErrorCover />
            },
            // {
            //     path: "/authentication/404/minimal",
            //     element: <ErrorMinimal />
            // },
            // {
            //     path: "/authentication/404/creative",
            //     element: <ErrorCreative />
            // },
            {
                path: "/authentication/verify/cover",
                element: <OtpCover />
            },
            // {
            //     path: "/authentication/verify/minimal",
            //     element: <OtpMinimal />
            // },
            // {
            //     path: "/authentication/verify/creative",
            //     element: <OtpCreative />
            // },
            // {
            //     path: "/authentication/maintenance/cover",
            //     element: <MaintenanceCover />
            // },
            // {
            //     path: "/authentication/maintenance/minimal",
            //     element: <MaintenanceMinimal />
            // },
            // {
            //     path: "/authentication/maintenance/creative",
            //     element: <MaintenanceCreative />
            // },
        ]
    },
    {
    path: "*",
    element: <ErrorCover />
  }
])


// import { createBrowserRouter } from "react-router-dom";
// import RootLayout from "../layout/root";
// import Home from "../pages/home";
// // import Analytics from "../pages/analytics";
// // import ReportsSales from "../pages/reports-sales";
// // import ReportsLeads from "../pages/reports-leads";
// // import ReportsProject from "../pages/reports-project";
// // // import AppsChat from "../pages/apps-chat";
// // import LayoutApplications from "../layout/layoutApplications";
// // // import AppsEmail from "../pages/apps-email";
// // import ReportsTimesheets from "../pages/reports-timesheets";
// import LoginCover from "../pages/login-cover";
// // import AppsTasks from "../pages/apps-tasks";
// // import AppsNotes from "../pages/apps-notes";
// // import AppsCalender from "../pages/apps-calender";
// // import AppsStorage from "../pages/apps-storage";
// // // import Proposalist from "../pages/proposal-list"; (template page replaced by Client Management)
// // // import CustomersList from "../pages/customers-list"; (template page replaced by Client Management)
// // // import ProposalView from "../pages/proposal-view"; (template page replaced by Client Management)
// // // import ProposalEdit from "../pages/proposal-edit"; (template page replaced by Client Management)
// // import LeadsList from "../pages/leadsList";
// // // import CustomersView from "../pages/customers-view"; (template page replaced by Client Management)
// // // import CustomersCreate from "../pages/customers-create"; (template page replaced by Client Management)
// // // import ProposalCreate from "../pages/proposal-create"; (template page replaced by Client Management)
// // import LeadsView from "../pages/leads-view";
// // import LeadsCreate from "../pages/leads-create";
// // // import PaymentList from "../pages/payment-list"; (template page replaced by Client Management)
// // // import PaymentView from "../pages/payment-view/"; (template page replaced by Client Management)
// // // import PaymentCreate from "../pages/payment-create"; (template page replaced by Client Management)
// import ProjectsList from "../pages/projects-list";
// import ProjectsView from "../pages/projects-view";
// import ProjectsCreate from "../pages/projects-create";
// // // import SettingsGaneral from "../pages/settings-ganeral";
// // // import LayoutSetting from "../layout/layoutSetting";
// // import SettingsSeo from "../pages/settings-seo";
// // import SettingsTags from "../pages/settings-tags";
// // import SettingsEmail from "../pages/settings-email";
// // import SettingsTasks from "../pages/settings-tasks";
// // import SettingsLeads from "../pages/settings-leads";
// // import SettingsMiscellaneous from "../pages/settings-miscellaneous";
// // import SettingsRecaptcha from "../pages/settings-recaptcha";
// // import SettingsLocalization from "../pages/settings-localization";
// // import SettingsCustomers from "../pages/settings-customers";
// // import SettingsGateways from "../pages/settings-gateways";
// // import SettingsFinance from "../pages/settings-finance";
// // import SettingsSupport from "../pages/settings-support";
// // import LayoutAuth from "../layout/layoutAuth";
// // import LoginMinimal from "../pages/login-minimal";
// // import LoginCreative from "../pages/login-creative";
// // // import RegisterCover from "../pages/register-cover";
// // // import RegisterMinimal from "../pages/register-minimal";
// // // import RegisterCreative from "../pages/register-creative";
// // // import ResetCover from "../pages/reset-cover";
// // // import ResetMinimal from "../pages/reset-minimal";
// // // import ResetCreative from "../pages/reset-creative";
// // // import ErrorCover from "../pages/error-cover";
// // // import ErrorCreative from "../pages/error-creative";
// // // import ErrorMinimal from "../pages/error-minimal";
// // // import OtpCover from "../pages/otp-cover";
// // // import OtpMinimal from "../pages/otp-minimal";
// // // import OtpCreative from "../pages/otp-creative";
// // // import MaintenanceCover from "../pages/maintenance-cover";
// // // import MaintenanceMinimal from "../pages/maintenance-minimal";
// // // import MaintenanceCreative from "../pages/maintenance-creative";
// // // import HelpKnowledgebase from "../pages/help-knowledgebase";
// // // import WidgetsLists from "../pages/widgets-lists";
// // // import WidgetsTables from "../pages/widgets-tables";
// // // import WidgetsCharts from "../pages/widgets-charts";
// // // import WidgetsStatistics from "../pages/widgets-statistics";
// // // import WidgetsMiscellaneous from "../pages/widgets-miscellaneous";
// // import AddRoles from "@/components/Roles/AddRoles";
// // import RoleList from "@/components/Roles/RoleList";
// // import EditRole from "@/components/Roles/EditRoles";
// // import ViewRole from "@/components/Roles/View.Roles";
// // import ClientsList from "../pages/clientsList";
// // import ClientsView from "../pages/clients-view";
// // import ClientsCreate from "../pages/clients-create";
// // // import ReportsClients from "../pages/reports-clients";
// // import ClientEdit from "../pages/clients-edit";
// import ProjectEdit from "../pages/project-edit";
// import ProjectMember from "../pages/project-member";
// // // import Departments from "../pages/departments";
// // import AddDepartments from "../pages/add-departments";
// // import DepartmentsList from "../pages/departments-list";
// // import DepartmentsView from "../pages/department-view";
// // import DepartmentEdit from "../pages/edit-department";
// // import TeamCreate from "../pages/team-create";
// // import TeamsView from "../pages/team-view";
// // import TeamEdit from "../pages/teams-edit";
// // import TeamsList from "../pages/teams-list";
// export const router = createBrowserRouter([
// {
//   path: "/",
//   element: <RootLayout />,
//   children: [
//     {
//       path: "/",        // ❌ WRONG
//       element: <Home />
//     },
//     {
//       path: "/authentication/login",        // ❌ WRONG
//       element: <LoginCover/>
//     },
//      {
//                 path: "/projects/create",
//                 element: <ProjectsCreate />
//             },
//             {
//                 path: "/projects/list",
//                 element: <ProjectsList />
//             },
//             {
//                 path: "/projects/view/:id",
//                 element: <ProjectsView />
//             },
//             {
//                 path: "/projects/edit/:id",
//                 element: <ProjectEdit />
//             },
//             {
//                 path: "/projects/members/create",
//                 element: <ProjectMember />
//             },
//   ]
// }

// ])
