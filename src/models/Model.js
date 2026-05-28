/**
 * Model.js - Data Layer
 * Encapsulates the application's state. Uses Vue's reactive system
 * so that updates automatically trigger UI re-renders in the View layer.
 *
 * All data is loaded from services on login — no hardcoded fallbacks.
 */
import { reactive } from 'vue';



function getInitialRoutePath() {
    if (typeof window === 'undefined') {
        return '/';
    }

    const path = window.location.pathname || '/';
    if (path === '/index.html' || path === '/') {
        return '/';
    }

    if (path === '/signin' || path === '/signup') {
        return '/signin';
    }

    if (path === '/dashboard') {
        return '/dashboard';
    }

    return '/';
}

export class RwmsModel {
    constructor() {
        // Intentionally in-memory only: do not persist credentials/session in the browser.
        const sessionUser = null;
        const initialRoute = getInitialRoutePath();

        this.state = reactive({
            // Global App State
            currentUser: sessionUser,
            currentRole: sessionUser?.role || 'EMPLOYEE',
            availableRoles: ['EMPLOYEE', 'TEAM_LEADER', 'MANAGER'],
            routePath: sessionUser ? '/dashboard' : initialRoute,
            showLoginPanel: !sessionUser && initialRoute === '/signin',
            authMode: 'login',
            authMessage: '',
            authMessageType: 'info',
            // registeredUsers no longer tracks local fallback data.
            registeredUsers: [],
            authToken: null,
            showProfileModal: false,
            profileForm: {
                currentPassword: '',
                newPassword: ''
            },
            profileBusy: false,

            // Loading & Error State
            dashboardLoading: false,
            actionLoading: false,
            loadError: null,

            // Employee: submit task modal
            showSubmissionModal: false,
            submissionBusy: false,
            submissionForm: {
                accomplishmentComment: '',
                alternativeGithubLink: '',
                file: null
            },

            // Team Leader/Admin: review submission modal + comment thread
            showReviewModal: false,
            reviewBusy: false,
            activeSubmissionId: null,
            activeSubmissionDetail: null,
            reviewForm: {
                action: 'APPROVED', // or REJECTED
                adminNote: '',
                rejectionReason: '',
                commentContent: ''
            },

            // TL: Project request modal
            showProjectRequestModal: false,
            projectRequestBusy: false,
            projectRequestForm: {
                projectName: '',
                description: '',
                deadline: '',
                priority: 'MEDIUM',
                requiredTeamSize: 1,
                notes: ''
            },
            myProjectRequests: [],

            // TL: Task creation modal
            showCreateTaskModal: false,
            createTaskBusy: false,
            createTaskProjectId: null,
            createTaskForm: {
                name: '',
                description: '',
                deadline: '',
                priority: 'MEDIUM',
                githubRepoLink: '',
                assignedEmployeeId: null,
                subtasks: []
            },

            // TL: Employee assignment modal
            showAssignEmployeeModal: false,
            assignEmployeeProjectId: null,
            availableEmployees: [],
            projectContributors: [],

            // Manager: Project requests queue
            pendingProjectRequests: [],

            // Manager: Administration Panel
            managers: [],
            showCreateManagerModal: false,
            createManagerBusy: false,
            createManagerForm: {
                fullName: '',
                email: '',
                password: ''
            },

            // Notification State
            showTimerWarning: false,
            timerWarningType: 'green',
            timerWarningMessage: '',
            timerWarningDescription: '',

            // Dashboard Data — loaded from services, no hardcoded fallbacks.
            projects: [],
            pendingApprovals: [],
            pendingSubmissions: [],
            teamMembers: [],

            // Employee Context Data
            timerRunning: false,
            shiftTime: 0,
            activeWorkTime: 0,
            breakTime: 0,
            timerStatus: 'Not Started',
            completedTasks: 0,
            totalSubtasks: 0,
            activeTaskIndex: -1,
            activeTask: null,
            assignedTasks: [],
            myProjects: [],

            // API-loaded data
            recentNotifications: [],
            tlRequests: [],
            allUsers: [],

            // TL: Project tasks (for project detail view)
            projectTasks: [],
            activeProjectId: null,

            // Manager: Rejection reason input
            rejectProjectRequestId: null,
            rejectProjectRequestReason: ''
        });
    }

    getState() {
        return this.state;
    }
}

// Instantiate a singleton model for global use
export const appModel = new RwmsModel();

export default appModel;
