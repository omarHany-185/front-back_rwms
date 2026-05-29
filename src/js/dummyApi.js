/**
 * dummyApi.js - Mock API service simulating RWMS backend
 *
 * IMPORTANT: This is a temporary dummy API for development/testing.
 * To connect to the real backend:
 * 1. Replace all simulated endpoints with actual HTTP calls (using fetch or axios)
 * 2. Update baseURL to point to your backend (e.g., http://localhost:8080)
 * 3. Remove all dummy data imports and local logic
 * 4. Implement token management and auth headers
 *
 * All endpoints match the spec in RWMS_Full_Project_Report.md
 */

import {
    DUMMY_USERS,
    DUMMY_PROJECTS,
    DUMMY_TASKS,
    DUMMY_SUBMISSIONS,
    DUMMY_WORK_SESSION,
    DUMMY_NOTIFICATIONS,
    DUMMY_TEAM_LEADER_REQUESTS,
    DUMMY_AUDIT_LOGS,
    buildProjectProgress,
    findUserByEmail,
    getUserLists
} from './dummyData.js';

// ============ CONFIGURATION ============
const API_BASE_URL = 'http://localhost:8080'; // Change this when connecting to real backend
const API_TIMEOUT = 500; // Simulate network delay (ms)
const USE_DUMMY_API = true; // Set to false to use real backend

// ============ IN-MEMORY AUTH CONTEXT ============
// These values simulate what the backend would infer from the Authorization header (JWT).
// The frontend should not store credentials/tokens in browser storage.
let currentUserId = null;
let currentUserEmail = null;

// ============ IN-MEMORY MUTABLE STORES ============
// The dashboard requires real workflow state changes, so we keep a local mutable copy
// of the dummy data and mutate it on approve/reject/submit/review actions.
function cloneDeep(value) {
    return JSON.parse(JSON.stringify(value));
}

let usersStore = cloneDeep(DUMMY_USERS);
let projectsStore = cloneDeep(DUMMY_PROJECTS);
let tasksStore = cloneDeep(DUMMY_TASKS);
let submissionsStore = cloneDeep(DUMMY_SUBMISSIONS);
let teamLeaderRequestsStore = cloneDeep(DUMMY_TEAM_LEADER_REQUESTS);

function findUserByEmailFromStore(email) {
    const lower = String(email || '').toLowerCase();
    return Object.values(usersStore).find(u => String(u.email || '').toLowerCase() === lower);
}

function findUserByIdFromStore(id) {
    return Object.values(usersStore).find(u => u.id === parseInt(id));
}

// ============ SIMULATION HELPER ============
function delay(ms = API_TIMEOUT) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function createResponse(data, status = 200) {
    return Promise.resolve({
        status,
        data,
        ok: status >= 200 && status < 300,
        headers: { 'content-type': 'application/json' }
    });
}

function createErrorResponse(message, status = 400) {
    return Promise.reject({
        status,
        error: {
            message,
            status,
            timestamp: new Date().toISOString(),
            path: '/api/unknown'
        }
    });
}

// ============ AUTH ENDPOINTS ============

export const authApi = {
    /**
     * POST /auth/login
     * @param {string} email
     * @param {string} password
     * @returns {Promise<{token: string, role: string, firstLogin: boolean, userId: number}>}
     */
    login: async (email, password) => {
        await delay();
        const user = findUserByEmailFromStore(email);

        if (!user) {
            return createErrorResponse('User not found with this email', 401);
        }

        // Check password against dummy data
        if (String(user.email).toLowerCase() === String(email).toLowerCase()) {
            // Simulate JWT token
            const token = btoa(JSON.stringify({ userId: user.id, email: user.email, role: user.role }));
            currentUserId = user.id;
            currentUserEmail = user.email;
            return createResponse({
                token,
                role: user.role,
                firstLogin: user.firstLogin,
                userId: user.id
            });
        }

        return createErrorResponse('Invalid email or password', 401);
    },

    /**
     * POST /auth/register
     * Self-register as pending ADMIN
     */
    register: async (data) => {
        await delay();
        const { fullName, employeeId, gmailAddress, githubUsername } = data;

        if (!fullName || !employeeId || !gmailAddress) {
            return createErrorResponse('Missing required fields', 400);
        }

        // Check for duplicates
        const existing = findUserByEmail(gmailAddress);
        if (existing) {
            return createErrorResponse('Email already registered', 409);
        }

        return createResponse({ message: 'Admin registration pending. Manager approval required.' }, 201);
    },

    /**
     * POST /auth/change-password
     */
    changePassword: async (data) => {
        await delay();
        const { currentPassword, newPassword } = data;

        if (!currentPassword || !newPassword) {
            return createErrorResponse('Missing password fields', 400);
        }

        return createResponse({ message: 'Password changed successfully' });
    },

    /**
     * GET /auth/me
     */
    getCurrentUser: async () => {
        await delay();
        const user = findUserByIdFromStore(currentUserId);

        if (!user) {
            return createErrorResponse('User not found', 404);
        }

        return createResponse(user);
    }
};

// ============ USERS ENDPOINTS ============

export const usersApi = {
    /**
     * GET /users
     */
    getAll: async () => {
        await delay();
        return createResponse(Object.values(usersStore));
    },

    /**
     * GET /users/{id}
     */
    getById: async (id) => {
        await delay();
        const user = Object.values(DUMMY_USERS).find(u => u.id === parseInt(id));

        if (!user) {
            return createErrorResponse('User not found', 404);
        }

        return createResponse(user);
    },

    /**
     * GET /users/email/{email}
     */
    getByEmail: async (email) => {
        await delay();
        const user = findUserByEmail(email);

        if (!user) {
            return createErrorResponse('User not found', 404);
        }

        return createResponse(user);
    },

    /**
     * GET /users/department/{dept}
     */
    getByDepartment: async (department) => {
        await delay();
        const users = Object.values(DUMMY_USERS).filter(
            u => u.department.toLowerCase() === department.toLowerCase()
        );

        return createResponse(users);
    },

    /**
     * POST /users
     */
    create: async (data) => {
        await delay();
        const { fullName, employeeId, email, password, role } = data;

        if (!fullName || !employeeId || !email || !password || !role) {
            return createErrorResponse('Missing required fields', 400);
        }

        // Check for duplicates
        if (findUserByEmail(email)) {
            return createErrorResponse('Email already exists', 409);
        }

        const maxId = Object.values(usersStore).length
            ? Math.max(...Object.values(usersStore).map(u => u.id))
            : 0;
        const newUser = {
            id: maxId + 1,
            fullName,
            employeeId,
            email,
            githubUsername: data.githubUsername || '',
            phone: data.phone || '',
            department: data.department || 'Engineering',
            role,
            status: 'PENDING',
            firstLogin: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        usersStore[newUser.id] = newUser;
        return createResponse(newUser, 201);
    },

    /**
     * PUT /users/{id}
     */
    update: async (id, data) => {
        await delay();
        const user = Object.values(DUMMY_USERS).find(u => u.id === parseInt(id));

        if (!user) {
            return createErrorResponse('User not found', 404);
        }

        const updated = { ...user, ...data, updatedAt: new Date().toISOString() };
        return createResponse(updated);
    }
};

// ============ MANAGER ENDPOINTS ============

export const managerApi = {
    /**
     * GET /manager/pending-admins
     */
    getPendingAdmins: async () => {
        await delay();
        // In the docs the Team Leader is referred to as "Admin".
        // Backend stores these as TEAM_LEADER users with status=PENDING.
        const pending = Object.values(usersStore)
            .filter(u => u.status === 'PENDING' && u.role === 'TEAM_LEADER');
        // Shape for frontend dashboard cards: { id, name, email }
        const mapped = pending.map(u => ({
            id: u.id,
            name: u.fullName,
            email: u.email,
            role: u.role,
            status: u.status
        }));
        return createResponse(mapped);
    },

    /**
     * POST /manager/approve-admin/{userId}
     */
    approveAdmin: async (userId, employeeId) => {
        await delay();
        const user = findUserByIdFromStore(userId);

        if (!user) {
            return createErrorResponse('User not found', 404);
        }

        if (user.status !== 'PENDING') {
            return createErrorResponse('User is not pending', 400);
        }

        user.status = 'ACTIVE';
        user.firstLogin = true;
        if (employeeId) {
            user.employeeId = employeeId;
        }
        return createResponse({ message: 'Team leader approved successfully' });
    },

    /**
     * POST /manager/reject-admin/{userId}
     */
    rejectAdmin: async (userId) => {
        await delay();
        const user = findUserByIdFromStore(userId);
        if (!user) {
            return createErrorResponse('User not found', 404);
        }
        if (user.status !== 'PENDING') {
            return createErrorResponse('User is not pending', 400);
        }

        user.status = 'REJECTED';
        return createResponse({ message: 'Team leader rejected' });
    },

    /**
     * GET /manager/pending-tl-requests
     */
    getPendingTLRequests: async () => {
        await delay();
        const pending = teamLeaderRequestsStore
            .filter(r => r.status === 'PENDING')
            .map(r => ({
                id: r.id,
                name: r.requesterName,
                email: r.requesterEmail,
                projectId: r.projectId,
                projectName: r.projectName,
                status: r.status,
                submittedAt: r.submittedAt
            }));
        return createResponse(pending);
    },

    /**
     * POST /manager/approve-tl/{requestId}
     */
    approveTL: async (requestId) => {
        await delay();
        const request = teamLeaderRequestsStore.find(r => r.id === parseInt(requestId));

        if (!request) {
            return createErrorResponse('Request not found', 404);
        }

        if (request.status !== 'PENDING') {
            return createErrorResponse('Request is not pending', 400);
        }

        request.status = 'APPROVED';

        // Update requester's status (becomes active TEAM_LEADER).
        const requester = findUserByIdFromStore(request.requesterId);
        if (requester) {
            requester.status = 'ACTIVE';
            requester.role = 'TEAM_LEADER';
            requester.firstLogin = true;
        }

        // Assign team leader to the project.
        const project = projectsStore.find(p => p.id === parseInt(request.projectId));
        if (project && requester) {
            project.teamLeaderId = requester.id;
            project.teamLeader = requester;
        }

        return createResponse({ message: 'Team leader request approved' });
    },

    /**
     * POST /manager/reject-tl/{requestId}
     */
    rejectTL: async (requestId) => {
        await delay();
        const request = teamLeaderRequestsStore.find(r => r.id === parseInt(requestId));
        if (!request) {
            return createErrorResponse('Request not found', 404);
        }
        if (request.status !== 'PENDING') {
            return createErrorResponse('Request is not pending', 400);
        }

        request.status = 'REJECTED';

        const requester = findUserByIdFromStore(request.requesterId);
        if (requester) {
            requester.status = 'REJECTED';
        }

        return createResponse({ message: 'Team leader request rejected' });
    },

    /**
     * GET /manager/users
     */
    getAllUsers: async () => {
        await delay();
        const all = Object.values(usersStore).map(u => {
            // Derive a lightweight completion metric for the dashboard.
            const tasks = tasksStore.filter(t => t.assignedEmployeeId === u.id);
            const subtasks = tasks.flatMap(t => t.subtasks || []);
            const total = subtasks.length;
            const completed = subtasks.filter(s => s.completedByEmployee).length;
            const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

            const statusLabel = u.status === 'ACTIVE' ? 'Active' : (u.status === 'REJECTED' ? 'Offline' : 'Offline');

            return {
                ...u,
                // Frontend-friendly aliases
                name: u.fullName,
                email: u.email,
                completionRate,
                status: statusLabel
            };
        });
        return createResponse(all);
    },

    /**
     * PUT /manager/users/{userId}/role
     */
    updateUserRole: async (userId, role, department) => {
        await delay();

        return createResponse({ message: 'User role updated' });
    },

    /**
     * PUT /manager/users/{userId}/deactivate
     */
    deactivateUser: async (userId) => {
        await delay();

        return createResponse({ message: 'User deactivated' });
    },

    /**
     * DELETE /manager/users/{userId}
     *
     * NOTE: This endpoint does not exist in the current backend controllers.
     * Use DELETE /users/{id} instead (UserController) when implementing UI deletion.
     */
    // deleteUser: async (userId) => { ... }
};

// ============ PROJECTS ENDPOINTS ============

export const projectsApi = {
    /**
     * POST /projects
     */
    create: async (data) => {
        await delay();
        const newProject = {
            id: Math.random(),
            ...data,
            teamLeaderId: currentUserId,
            contributors: [],
            createdAt: new Date().toISOString()
        };
        projectsStore.push(newProject);
        return createResponse(newProject, 201);
    },

    /**
     * GET /projects/department/{dept}
     */
    getByDepartment: async (dept) => {
        await delay();
        const projects = projectsStore.filter(p => p.department.toLowerCase() === dept.toLowerCase());
        return createResponse(projects);
    },

    /**
     * GET /projects/my
     */
    getMy: async () => {
        await delay();
        // Return projects where user is contributor or team leader
        return createResponse(
            projectsStore.filter(p =>
                p.teamLeaderId === currentUserId ||
                p.contributors.some(c => c.id === currentUserId)
            )
        );
    },

    /**
     * GET /projects/{id}
     */
    getById: async (id) => {
        await delay();
        const project = DUMMY_PROJECTS.find(p => p.id === parseInt(id));

        if (!project) {
            return createErrorResponse('Project not found', 404);
        }

        return createResponse(project);
    },

    /**
     * POST /projects/{id}/contributors
     */
    addContributors: async (projectId, userIds) => {
        await delay();
        const project = projectsStore.find(p => p.id === parseInt(projectId));
        const users = Object.values(usersStore);
        if (project && Array.isArray(userIds)) {
            for (const uid of userIds) {
                const user = users.find(u => u.id === parseInt(uid));
                if (user && !project.contributors.some(c => c.id === user.id)) {
                    project.contributors.push({
                        id: user.id,
                        fullName: user.fullName,
                        email: user.email,
                        role: user.role
                    });
                }
            }
        }
        return createResponse(project || { message: 'Contributors added' });
    },

    /**
     * DELETE /projects/{id}/contributors/{userId}
     */
    removeContributor: async (projectId, userId) => {
        await delay();
        const project = projectsStore.find(p => p.id === parseInt(projectId));
        if (project) {
            project.contributors = project.contributors.filter(c => c.id !== parseInt(userId));
        }
        return createResponse(project || { message: 'Contributor removed' });
    },

    /**
     * POST /projects/{id}/request-tl
     */
    requestTeamLeader: async (projectId, userId) => {
        await delay();

        return createResponse({ message: 'Team leader request submitted' });
    }
};

// ============ PROGRESS ENDPOINTS ============

export const progressApi = {
    /**
     * GET /progress/project/{projectId}
     */
    getProjectProgress: async (projectId) => {
        await delay();
        const progress = buildProjectProgress(parseInt(projectId));
        return createResponse(progress);
    },

    /**
     * GET /progress/manager/all
     */
    getAllProgress: async () => {
        await delay();
        const allProgress = DUMMY_PROJECTS.map(p => buildProjectProgress(p.id));
        return createResponse(allProgress);
    }
};

// ============ TASKS ENDPOINTS ============

export const tasksApi = {
    /**
     * POST /tasks/project/{projectId}
     */
    create: async (projectId, data) => {
        await delay();
        const newTask = {
            id: Math.random(),
            ...data,
            projectId: parseInt(projectId),
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            startedAt: null,
            subtasks: (data.subtasks || []).map((s, idx) => ({
                ...s,
                id: s.id || idx + 1,
                completedByEmployee: false,
                approvedByAdmin: false,
                completedAt: null,
                employeeComment: null
            }))
        };
        tasksStore.push(newTask);
        return createResponse(newTask, 201);
    },

    /**
     * PUT /tasks/{taskId}
     */
    update: async (taskId, data) => {
        await delay();
        const task = DUMMY_TASKS.find(t => t.id === parseInt(taskId));

        if (!task) {
            return createErrorResponse('Task not found', 404);
        }

        return createResponse({ ...task, ...data });
    },

    /**
     * DELETE /tasks/{taskId}
     */
    delete: async (taskId) => {
        await delay();

        return createResponse({ message: 'Task deleted' }, 204);
    },

    /**
     * POST /tasks/{taskId}/subtasks
     */
    addSubtask: async (taskId, data) => {
        await delay();

        return createResponse({
            id: Math.random(),
            ...data,
            taskId: parseInt(taskId),
            completedByEmployee: false,
            approvedByAdmin: false
        }, 201);
    },

    /**
     * PUT /tasks/{taskId}/subtasks/{subtaskId}
     */
    updateSubtask: async (taskId, subtaskId, data) => {
        await delay();

        return createResponse({ message: 'Subtask updated' });
    },

    /**
     * DELETE /tasks/{taskId}/subtasks/{subtaskId}
     */
    deleteSubtask: async (taskId, subtaskId) => {
        await delay();

        return createResponse({ message: 'Subtask deleted' }, 204);
    },

    /**
     * POST /tasks/{taskId}/assign
     */
    assign: async (taskId, employeeId) => {
        await delay();
        const task = tasksStore.find(t => t.id === parseInt(taskId));
        if (task) {
            task.assignedEmployeeId = parseInt(employeeId);
        }
        return createResponse({ message: 'Task assigned' });
    },

    /**
     * GET /tasks/my
     */
    getMy: async () => {
        await delay();
        const effectiveUserId = currentUserId;
        const tasks = tasksStore.filter(t => t.assignedEmployeeId === effectiveUserId);
        return createResponse(tasks);
    },

    /**
     * POST /tasks/{taskId}/start
     */
    start: async (taskId) => {
        await delay();
        const task = tasksStore.find(t => t.id === parseInt(taskId));

        if (!task) {
            return createErrorResponse('Task not found', 404);
        }

        task.status = 'IN_PROGRESS';
        task.startedAt = new Date().toISOString();
        return createResponse(task);
    },

    /**
     * POST /tasks/{taskId}/subtasks/{subtaskId}/complete
     */
    completeSubtask: async (taskId, subtaskId, comment) => {
        await delay();

        const task = tasksStore.find(t => t.id === parseInt(taskId));
        if (!task) {
            return createErrorResponse('Task not found', 404);
        }

        const subtask = task.subtasks?.find(s => s.id === parseInt(subtaskId));
        if (!subtask) {
            return createErrorResponse('Subtask not found', 404);
        }

        subtask.completedByEmployee = true;
        subtask.completedAt = new Date().toISOString();
        subtask.employeeComment = comment || null;

        return createResponse({ message: 'Subtask completed' });
    }
};

// ============ SUBMISSIONS ENDPOINTS ============

export const submissionsApi = {
    /**
     * POST /submissions/task/{taskId}
     */
    submit: async (taskId, data, file = null) => {
        await delay();

        const task = tasksStore.find(t => t.id === parseInt(taskId));
        if (!task) {
            return createErrorResponse('Task not found', 404);
        }

        const employee = findUserByIdFromStore(currentUserId);
        if (!employee) {
            return createErrorResponse('User not authenticated', 401);
        }

        const nextId = submissionsStore.length ? Math.max(...submissionsStore.map(s => s.id)) + 1 : 1;

        const submission = {
            id: nextId,
            taskId: task.id,
            taskName: task.name,
            employeeId: currentUserId,
            employeeName: employee.fullName,
            accomplishmentComment: data?.accomplishmentComment || '',
            alternativeGithubLink: data?.alternativeGithubLink || null,
            attachmentPath: file ? `/uploads/${file.name}` : null,
            submittedAt: new Date().toISOString(),
            reviewStatus: 'PENDING',
            adminNote: null,
            rejectionReason: null,
            comments: []
        };

        submissionsStore.unshift(submission);
        task.status = 'SUBMITTED';

        return createResponse(submission, 201);
    },

    /**
     * GET /submissions/my
     */
    getMy: async () => {
        await delay();
        const submissions = submissionsStore.filter(s => s.employeeId === currentUserId);
        return createResponse(submissions);
    },

    /**
     * GET /submissions/{id}/detail
     */
    getDetail: async (submissionId) => {
        await delay();
        const submission = submissionsStore.find(s => s.id === parseInt(submissionId));

        if (!submission) {
            return createErrorResponse('Submission not found', 404);
        }

        return createResponse(submission);
    },

    /**
     * POST /submissions/{id}/review
     */
    review: async (submissionId, data) => {
        await delay();
        const submission = submissionsStore.find(s => s.id === parseInt(submissionId));

        if (!submission) {
            return createErrorResponse('Submission not found', 404);
        }

        submission.reviewStatus = data.approved ? 'APPROVED' : 'REJECTED';
        submission.adminNote = data.adminNote || null;
        submission.rejectionReason = data.rejectionReason || null;

        // Update corresponding task status.
        const task = tasksStore.find(t => t.id === submission.taskId);
        if (task) {
            task.status = submission.reviewStatus;
            if (task.subtasks) {
                task.subtasks.forEach(st => {
                    if (submission.reviewStatus === 'APPROVED') {
                        if (st.completedByEmployee) st.approvedByAdmin = true;
                    } else {
                        st.approvedByAdmin = false;
                    }
                });
            }
        }

        return createResponse(submission);
    },

    /**
     * GET /submissions/pending/project/{projectId}
     */
    getPendingByProject: async (projectId) => {
        await delay();
        const projectTasks = tasksStore.filter(t => t.projectId === parseInt(projectId));
        const taskIds = new Set(projectTasks.map(t => t.id));
        const pending = submissionsStore.filter(s => s.reviewStatus === 'PENDING' && taskIds.has(s.taskId));
        return createResponse(pending);
    },

    /**
     * POST /submissions/{id}/comments
     */
    addComment: async (submissionId, data) => {
        await delay();
        const submission = submissionsStore.find(s => s.id === parseInt(submissionId));
        if (!submission) {
            return createErrorResponse('Submission not found', 404);
        }
        const author = findUserByIdFromStore(currentUserId);
        if (!author) {
            return createErrorResponse('User not authenticated', 401);
        }

        const nextCommentId = submission.comments?.length
            ? Math.max(...submission.comments.map(c => c.id)) + 1
            : 1;

        const comment = {
            id: nextCommentId,
            submissionId: submission.id,
            authorId: currentUserId,
            authorName: author.fullName,
            content: data?.content || '',
            createdAt: new Date().toISOString()
        };

        submission.comments = submission.comments || [];
        submission.comments.unshift(comment);
        return createResponse(comment, 201);
    },

    /**
     * GET /submissions/{id}/comments
     */
    getComments: async (submissionId) => {
        await delay();
        const submission = submissionsStore.find(s => s.id === parseInt(submissionId));

        if (!submission) {
            return createErrorResponse('Submission not found', 404);
        }

        return createResponse(submission.comments || []);
    }
};

// ============ TIMER ENDPOINTS ============

export const timerApi = {
    /**
     * POST /timer/start/{taskId}
     */
    start: async (taskId) => {
        await delay();

        return createResponse({
            sessionState: 'RUNNING',
            workedSeconds: 0,
            breakSeconds: 0,
            breakTaken: false,
            breakWarning: false,
            breakEndingWarning: false,
            triggerSubmitPage: false
        });
    },

    /**
     * GET /timer/active
     */
    getActive: async () => {
        await delay();
        // Return mock active session
        return createResponse(DUMMY_WORK_SESSION);
    },

    /**
     * POST /timer/sync
     */
    sync: async () => {
        await delay();

        return createResponse({
            sessionState: 'RUNNING',
            workedSeconds: DUMMY_WORK_SESSION.workedSeconds,
            breakSeconds: DUMMY_WORK_SESSION.breakSeconds,
            breakTaken: DUMMY_WORK_SESSION.breakTaken,
            breakWarning: false,
            breakEndingWarning: false,
            triggerSubmitPage: false
        });
    },

    /**
     * POST /timer/end
     */
    end: async () => {
        await delay();

        return createResponse({ message: 'Session ended' });
    }
};

// ============ NOTIFICATIONS ENDPOINTS ============

export const notificationsApi = {
    /**
     * GET /api/notifications
     */
    getAll: async (page = 0, size = 10) => {
        await delay();

        const start = page * size;
        const notifications = DUMMY_NOTIFICATIONS.slice(start, start + size);

        return createResponse({
            content: notifications,
            totalElements: DUMMY_NOTIFICATIONS.length,
            totalPages: Math.ceil(DUMMY_NOTIFICATIONS.length / size),
            currentPage: page,
            pageSize: size
        });
    },

    /**
     * GET /api/notifications/unread-count
     */
    getUnreadCount: async () => {
        await delay();
        const count = DUMMY_NOTIFICATIONS.filter(n => !n.isRead).length;
        return createResponse(count);
    },

    /**
     * POST /api/notifications/{id}/read
     */
    markRead: async (notificationId) => {
        await delay();

        return createResponse({ message: 'Notification marked as read' });
    },

    /**
     * POST /api/notifications/read-all
     */
    markAllRead: async () => {
        await delay();

        return createResponse({ message: 'All notifications marked as read' });
    }
};

// ============ AUDIT LOGS ENDPOINTS ============

export const auditApi = {
    /**
     * GET /api/audit/logs
     */
    getLogs: async (filters = {}, page = 0, size = 20) => {
        await delay();

        let logs = DUMMY_AUDIT_LOGS;

        // Apply filters
        if (filters.actionName) {
            logs = logs.filter(log =>
                log.actionName.toLowerCase().includes(filters.actionName.toLowerCase())
            );
        }
        if (filters.userEmail) {
            logs = logs.filter(log =>
                log.userEmail.toLowerCase().includes(filters.userEmail.toLowerCase())
            );
        }

        const start = page * size;
        const paginated = logs.slice(start, start + size);

        return createResponse({
            content: paginated,
            totalElements: logs.length,
            totalPages: Math.ceil(logs.length / size),
            currentPage: page,
            pageSize: size
        });
    },

    /**
     * GET /api/audit/logs/export
     * Returns CSV data
     */
    exportLogs: async (filters = {}) => {
        await delay();

        const headers = 'ID,Action Name,User Email,Performed By,Timestamp,Details\n';
        const rows = DUMMY_AUDIT_LOGS.map(log =>
            `${log.id},"${log.actionName}","${log.userEmail}","${log.performedByEmail}","${log.timestamp}","${log.details}"`
        );

        const csv = headers + rows.join('\n');
        return createResponse({ csv, filename: 'audit_logs.csv' });
    }
};

// ============ MAIN API SERVICE EXPORT ============
/**
 * Unified API service combining all endpoints
 * Easy to replace with real API calls
 */
export const dummyApi = {
    auth: authApi,
    users: usersApi,
    manager: managerApi,
    projects: projectsApi,
    progress: progressApi,
    tasks: tasksApi,
    submissions: submissionsApi,
    timer: timerApi,

    // Utility for switching between dummy and real API
    isUsingDummyApi: () => USE_DUMMY_API,
    setBaseUrl: (url) => {
        // For when connecting real backend - store config
        // Real implementation would update fetch/axios baseURL
    }
};

export default dummyApi;

