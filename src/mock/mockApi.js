/**
 * mockApi.js - HTTP-Shaped Mock API Adapter
 *
 * Wraps the centralized mockDatabase with async methods that return
 * the same { status, data, ok, error } response shape used by dummyApi
 * and realApi. Simulates network latency with configurable delays.
 *
 * To switch to the real backend, services import from realApi.js instead.
 */

import db from './mockDatabase.js';
import { MANAGER_PASSWORD_HASH } from '../js/dummyData.js';

// ============ CONFIGURATION ============
const API_DELAY_MS = 300; // Simulated network latency (ms)

// ============ HELPERS ============

function delay(ms = API_DELAY_MS) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function ok(data, status = 200) {
    return {
        status,
        data,
        ok: true,
        headers: { 'content-type': 'application/json' }
    };
}

function err(message, status = 400) {
    return {
        status,
        data: null,
        ok: false,
        error: {
            message,
            status,
            timestamp: new Date().toISOString()
        }
    };
}

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============ AUTH API ============

const authApi = {
    login: async (email, password) => {
        await delay();
        const normalizedEmail = String(email || '').toLowerCase();
        const user = db.findOne('users', u =>
            String(u.email || '').toLowerCase() === normalizedEmail
        );

        if (!user) {
            return err('User not found with this email', 401);
        }

        // Block login for accounts that haven't been approved yet.
        if (user.status === 'PENDING') {
            return err('Your account is pending manager approval. Please wait for activation.', 403);
        }
        if (user.status === 'REJECTED') {
            return err('Your account registration was rejected by the manager.', 403);
        }

        // In a real backend this would validate the password hash.
        // For the mock, we verify the manager password using SHA-256.
        if (user.role === 'MANAGER') {
            const hash = await hashPassword(password);
            if (hash !== MANAGER_PASSWORD_HASH) {
                return err('Invalid email or password', 401);
            }
        }

        const token = btoa(JSON.stringify({
            userId: user.id, email: user.email, role: user.role
        }));

        db.setAuth(user.id, user.email, token);

        return ok({
            token,
            role: user.role,
            firstLogin: user.firstLogin,
            userId: user.id
        });
    },

    register: async (data) => {
        await delay();
        const { fullName, gmailAddress } = data;
        if (!fullName || !gmailAddress) {
            return err('Missing required fields', 400);
        }

        const existing = db.findOne('users', u =>
            String(u.email || '').toLowerCase() === String(gmailAddress).toLowerCase()
        );
        if (existing) {
            return err('Email already registered', 409);
        }

        // Persist the new user in the mock database with PENDING status
        // so they appear in the Manager's approval queue.
        db.insert('users', {
            fullName,
            email: gmailAddress,
            githubUsername: data.githubUsername || '',
            phone: '',
            role: 'TEAM_LEADER',
            status: 'PENDING',
            firstLogin: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        return ok({ message: 'Registration pending. Manager approval required.' }, 201);
    },

    changePassword: async (data) => {
        await delay();
        const { currentPassword, newPassword } = data;
        if (!currentPassword || !newPassword) {
            return err('Missing password fields', 400);
        }
        return ok({ message: 'Password changed successfully' });
    },

    getCurrentUser: async () => {
        await delay();
        const userId = db.getCurrentUserId();
        const user = db.getById('users', userId);
        if (!user) {
            return err('User not found', 404);
        }
        return ok(user);
    }
};

// ============ USERS API ============

const usersApi = {
    getAll: async () => {
        await delay();
        return ok(db.getAll('users'));
    },

    getAllManagers: async () => {
        await delay();
        const managers = db.query('users', u => u.role === 'MANAGER');
        return ok(managers);
    },

    getById: async (id) => {
        await delay();
        const user = db.getById('users', id);
        if (!user) return err('User not found', 404);
        return ok(user);
    },

    getByEmail: async (email) => {
        await delay();
        const user = db.findOne('users', u =>
            String(u.email || '').toLowerCase() === String(email).toLowerCase()
        );
        if (!user) return err('User not found', 404);
        return ok(user);
    },

    getByDepartment: async (department) => {
        await delay();
        const users = db.query('users', u =>
            u.department.toLowerCase() === department.toLowerCase()
        );
        return ok(users);
    },

    createManager: async (data) => {
        await delay();
        const { fullName, email, password } = data;
        if (!fullName || !email || !password) {
            return err('Missing required fields', 400);
        }
        const existing = db.findOne('users', u =>
            String(u.email || '').toLowerCase() === String(email).toLowerCase()
        );
        if (existing) {
            return err('Email already exists', 409);
        }

        const newUser = db.insert('users', {
            fullName,
            email,
            githubUsername: data.githubUsername || '',
            phone: data.phone || '',
            role: 'MANAGER',
            status: 'ACTIVE',
            firstLogin: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        return ok(newUser, 201);
    },

    create: async (data) => {
        await delay();
        const { fullName, email, password, role } = data;
        if (!fullName || !email || !password || !role) {
            return err('Missing required fields', 400);
        }
        const existing = db.findOne('users', u =>
            String(u.email || '').toLowerCase() === String(email).toLowerCase()
        );
        if (existing) {
            return err('Email already exists', 409);
        }

        const newUser = db.insert('users', {
            fullName,
            email,
            githubUsername: data.githubUsername || '',
            phone: data.phone || '',
            role,
            status: 'PENDING',
            firstLogin: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        return ok(newUser, 201);
    },

    update: async (id, data) => {
        await delay();
        const updated = db.update('users', id, {
            ...data,
            updatedAt: new Date().toISOString()
        });
        if (!updated) return err('User not found', 404);
        return ok(updated);
    }
};

// ============ MANAGER API ============

const managerApi = {
    getPendingAdmins: async () => {
        await delay();
        // Return ALL pending users (employees AND team leaders) for manager approval.
        const pending = db.query('users', u => u.status === 'PENDING')
            .map(u => ({
                id: u.id,
                name: u.fullName,
                email: u.email,
                role: u.role,
                status: u.status,
                department: u.department
            }));
        return ok(pending);
    },

    approveAdmin: async (userId) => {
        await delay();
        const user = db.getById('users', userId);
        if (!user) return err('User not found', 404);
        if (user.status !== 'PENDING') return err('User is not pending', 400);

        db.update('users', userId, { status: 'ACTIVE', firstLogin: true });
        return ok({ message: `${user.role === 'TEAM_LEADER' ? 'Team leader' : 'Employee'} approved successfully` });
    },

    rejectAdmin: async (userId) => {
        await delay();
        const user = db.getById('users', userId);
        if (!user) return err('User not found', 404);
        if (user.status !== 'PENDING') return err('User is not pending', 400);

        db.update('users', userId, { status: 'REJECTED' });
        return ok({ message: `${user.role === 'TEAM_LEADER' ? 'Team leader' : 'Employee'} rejected` });
    },

    getPendingTLRequests: async () => {
        await delay();
        const pending = db.query('teamLeaderRequests', r => r.status === 'PENDING')
            .map(r => ({
                id: r.id,
                name: r.requesterName,
                email: r.requesterEmail,
                projectId: r.projectId,
                projectName: r.projectName,
                status: r.status,
                submittedAt: r.submittedAt
            }));
        return ok(pending);
    },

    approveTL: async (requestId) => {
        await delay();
        const request = db.getById('teamLeaderRequests', requestId);
        if (!request) return err('Request not found', 404);
        if (request.status !== 'PENDING') return err('Request is not pending', 400);

        db.update('teamLeaderRequests', requestId, { status: 'APPROVED' });

        // Activate the requester as a team leader.
        db.update('users', request.requesterId, {
            status: 'ACTIVE',
            role: 'TEAM_LEADER',
            firstLogin: true
        });

        // Assign team leader to the project.
        const requester = db.getById('users', request.requesterId);
        if (requester) {
            db.update('projects', request.projectId, r => {
                r.teamLeaderId = requester.id;
                r.teamLeader = requester;
            });
        }

        return ok({ message: 'Team leader request approved' });
    },

    rejectTL: async (requestId) => {
        await delay();
        const request = db.getById('teamLeaderRequests', requestId);
        if (!request) return err('Request not found', 404);
        if (request.status !== 'PENDING') return err('Request is not pending', 400);

        db.update('teamLeaderRequests', requestId, { status: 'REJECTED' });
        db.update('users', request.requesterId, { status: 'REJECTED' });

        return ok({ message: 'Team leader request rejected' });
    },

    getAllUsers: async () => {
        await delay();
        const allUsers = db.getAll('users');
        const allTasks = db.getAll('tasks');

        const mapped = allUsers.map(u => {
            const userTasks = allTasks.filter(t => t.assignedEmployeeId === u.id);
            const subtasks = userTasks.flatMap(t => t.subtasks || []);
            const total = subtasks.length;
            const completed = subtasks.filter(s => s.completedByEmployee).length;
            const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
            const statusLabel = u.status === 'ACTIVE' ? 'Active' : 'Offline';

            return {
                ...u,
                name: u.fullName,
                completionRate,
                status: statusLabel
            };
        });
        return ok(mapped);
    },

    updateUserRole: async (userId, role, department) => {
        await delay();
        return ok({ message: 'User role updated' });
    },

    deactivateUser: async (userId) => {
        await delay();
        return ok({ message: 'User deactivated' });
    }
};

// ============ PROJECTS API ============

const projectsApi = {
    create: async (data) => {
        await delay();
        const project = db.insert('projects', {
            ...data,
            teamLeaderId: null,
            contributors: [],
            createdAt: new Date().toISOString()
        });
        return ok(project, 201);
    },

    getByDepartment: async (dept) => {
        await delay();
        const projects = db.query('projects', p =>
            p.department.toLowerCase() === dept.toLowerCase()
        );
        return ok(projects);
    },

    getMy: async () => {
        await delay();
        const userId = db.getCurrentUserId();
        const projects = db.query('projects', p =>
            p.teamLeaderId === userId ||
            (p.contributors || []).some(c => c.id === userId)
        );
        return ok(projects);
    },

    getMyAsEmployee: async () => {
        await delay();
        const userId = db.getCurrentUserId();
        const projects = db.query('projects', p =>
            (p.contributors || []).some(c => c.id === userId)
        );
        return ok(projects);
    },

    getById: async (id) => {
        await delay();
        const project = db.getById('projects', id);
        if (!project) return err('Project not found', 404);
        return ok(project);
    },

    addContributors: async (projectId, userIds) => {
        await delay();
        const project = db.getById('projects', projectId);
        if (!project) return err('Project not found', 404);

        const idsToAdd = Array.isArray(userIds) ? userIds : [userIds];
        db.update('projects', projectId, rec => {
            rec.contributors = rec.contributors || [];
            for (const uid of idsToAdd) {
                const user = db.getById('users', uid);
                if (user && !rec.contributors.some(c => c.id === user.id)) {
                    rec.contributors.push({
                        id: user.id,
                        fullName: user.fullName,
                        email: user.email,
                        role: user.role,
                        status: user.status
                    });
                }
            }
        });
        const updated = db.getById('projects', projectId);
        return ok(updated);
    },

    removeContributor: async (projectId, userId) => {
        await delay();
        const project = db.getById('projects', projectId);
        if (!project) return err('Project not found', 404);

        db.update('projects', projectId, rec => {
            rec.contributors = (rec.contributors || []).filter(c => c.id !== parseInt(userId));
        });
        const updated = db.getById('projects', projectId);
        return ok(updated);
    },

    requestTeamLeader: async (projectId, userId) => {
        await delay();
        return ok({ message: 'Team leader request submitted' });
    }
};

// ============ PROGRESS API ============

const progressApi = {
    getProjectProgress: async (projectId) => {
        await delay();
        const project = db.getById('projects', projectId);
        const tasks = db.query('tasks', t => t.projectId === parseInt(projectId));
        const completedTasks = tasks.filter(t => t.status === 'APPROVED').length;
        const totalTasks = tasks.length;
        const progressPercent = totalTasks > 0
            ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return ok({
            projectId: parseInt(projectId),
            projectName: project?.name || 'Unknown Project',
            totalTasks,
            completedTasks,
            progressPercent,
            taskItems: tasks.map(t => ({
                id: t.id,
                name: t.name,
                status: t.status,
                assignedEmployee: t.assignedEmployee?.fullName || 'Unassigned',
                completedSubtasks: (t.subtasks || []).filter(s => s.completedByEmployee).length,
                totalSubtasks: (t.subtasks || []).length
            }))
        });
    },

    getAllProgress: async () => {
        await delay();
        const projects = db.getAll('projects');
        const allTasks = db.getAll('tasks');

        const allProgress = projects.map(p => {
            const tasks = allTasks.filter(t => t.projectId === p.id);
            const completedTasks = tasks.filter(t => t.status === 'APPROVED').length;
            const totalTasks = tasks.length;
            return {
                projectId: p.id,
                projectName: p.name,
                totalTasks,
                completedTasks,
                progressPercent: totalTasks > 0
                    ? Math.round((completedTasks / totalTasks) * 100) : 0,
                taskItems: tasks.map(t => ({
                    id: t.id,
                    name: t.name,
                    status: t.status,
                    assignedEmployee: t.assignedEmployee?.fullName || 'Unassigned',
                    completedSubtasks: (t.subtasks || []).filter(s => s.completedByEmployee).length,
                    totalSubtasks: (t.subtasks || []).length
                }))
            };
        });
        return ok(allProgress);
    }
};

// ============ TASKS API ============

const tasksApi = {
    create: async (projectId, data) => {
        await delay();
        const task = db.insert('tasks', {
            ...data,
            projectId: parseInt(projectId),
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            startedAt: null,
            subtasks: data.subtasks || []
        });
        return ok(task, 201);
    },

    update: async (taskId, data) => {
        await delay();
        const updated = db.update('tasks', taskId, data);
        if (!updated) return err('Task not found', 404);
        return ok(updated);
    },

    delete: async (taskId) => {
        await delay();
        db.remove('tasks', taskId);
        return ok({ message: 'Task deleted' }, 204);
    },

    addSubtask: async (taskId, data) => {
        await delay();
        const task = db.getById('tasks', taskId);
        if (!task) return err('Task not found', 404);

        const nextSubId = task.subtasks?.length
            ? Math.max(...task.subtasks.map(s => s.id)) + 1
            : 1;

        const subtask = {
            id: nextSubId,
            ...data,
            taskId: parseInt(taskId),
            completedByEmployee: false,
            approvedByAdmin: false
        };

        db.update('tasks', taskId, rec => {
            rec.subtasks = rec.subtasks || [];
            rec.subtasks.push(subtask);
        });

        return ok(subtask, 201);
    },

    updateSubtask: async (taskId, subtaskId, data) => {
        await delay();
        return ok({ message: 'Subtask updated' });
    },

    deleteSubtask: async (taskId, subtaskId) => {
        await delay();
        return ok({ message: 'Subtask deleted' }, 204);
    },

    assign: async (taskId, employeeId) => {
        await delay();
        const employee = db.getById('users', employeeId);
        if (!employee) return err('Employee not found', 404);

        const updated = db.update('tasks', taskId, {
            assignedEmployeeId: employee.id,
            assignedEmployee: {
                id: employee.id,
                fullName: employee.fullName,
                email: employee.email
            }
        });
        if (!updated) return err('Task not found', 404);
        return ok(updated);
    },

    getByProject: async (projectId) => {
        await delay();
        const tasks = db.query('tasks', t => t.projectId === parseInt(projectId));
        return ok(tasks);
    },

    getMy: async () => {
        await delay();
        const userId = db.getCurrentUserId();
        const tasks = db.query('tasks', t => t.assignedEmployeeId === userId);
        return ok(tasks);
    },

    start: async (taskId) => {
        await delay();
        const updated = db.update('tasks', taskId, {
            status: 'IN_PROGRESS',
            startedAt: new Date().toISOString()
        });
        if (!updated) return err('Task not found', 404);
        return ok(updated);
    },

    completeSubtask: async (taskId, subtaskId, comment) => {
        await delay();
        const task = db.getById('tasks', taskId);
        if (!task) return err('Task not found', 404);

        const subtask = (task.subtasks || []).find(s => s.id === parseInt(subtaskId));
        if (!subtask) return err('Subtask not found', 404);

        db.update('tasks', taskId, rec => {
            const sub = (rec.subtasks || []).find(s => s.id === parseInt(subtaskId));
            if (sub) {
                sub.completedByEmployee = true;
                sub.completedAt = new Date().toISOString();
                sub.employeeComment = comment || null;
            }
        });

        return ok({ message: 'Subtask completed' });
    }
};

// ============ SUBMISSIONS API ============

const submissionsApi = {
    submit: async (taskId, data, file = null) => {
        await delay();
        const task = db.getById('tasks', taskId);
        if (!task) return err('Task not found', 404);

        const userId = db.getCurrentUserId();
        const employee = db.getById('users', userId);
        if (!employee) return err('User not authenticated', 401);

        const submission = db.insertFirst('submissions', {
            taskId: task.id,
            taskName: task.name,
            employeeId: userId,
            employeeName: employee.fullName,
            accomplishmentComment: data?.accomplishmentComment || '',
            alternativeGithubLink: data?.alternativeGithubLink || null,
            attachmentPath: file ? `/uploads/${file.name}` : null,
            submittedAt: new Date().toISOString(),
            reviewStatus: 'PENDING',
            adminNote: null,
            rejectionReason: null,
            comments: []
        });

        // Mark task as submitted.
        db.update('tasks', taskId, { status: 'SUBMITTED' });

        return ok(submission, 201);
    },

    getMy: async () => {
        await delay();
        const userId = db.getCurrentUserId();
        const submissions = db.query('submissions', s => s.employeeId === userId);
        return ok(submissions);
    },

    getDetail: async (submissionId) => {
        await delay();
        const submission = db.getById('submissions', submissionId);
        if (!submission) return err('Submission not found', 404);
        return ok(submission);
    },

    review: async (submissionId, data) => {
        await delay();
        const submission = db.getById('submissions', submissionId);
        if (!submission) return err('Submission not found', 404);

        const newStatus = data.approved ? 'APPROVED' : 'REJECTED';

        db.update('submissions', submissionId, {
            reviewStatus: newStatus,
            adminNote: data.adminNote || null,
            rejectionReason: data.rejectionReason || null
        });

        // Update corresponding task status and subtask approval state.
        db.update('tasks', submission.taskId, rec => {
            rec.status = newStatus;
            if (rec.subtasks) {
                rec.subtasks.forEach(st => {
                    if (newStatus === 'APPROVED') {
                        if (st.completedByEmployee) st.approvedByAdmin = true;
                    } else {
                        st.approvedByAdmin = false;
                    }
                });
            }
        });

        const updated = db.getById('submissions', submissionId);
        return ok(updated);
    },

    getPendingByProject: async (projectId) => {
        await delay();
        const projectTasks = db.query('tasks', t => t.projectId === parseInt(projectId));
        const taskIds = new Set(projectTasks.map(t => t.id));
        const pending = db.query('submissions', s =>
            s.reviewStatus === 'PENDING' && taskIds.has(s.taskId)
        );
        return ok(pending);
    },

    addComment: async (submissionId, data) => {
        await delay();
        const submission = db.getById('submissions', submissionId);
        if (!submission) return err('Submission not found', 404);

        const userId = db.getCurrentUserId();
        const author = db.getById('users', userId);
        if (!author) return err('User not authenticated', 401);

        const nextCommentId = (submission.comments || []).length
            ? Math.max(...submission.comments.map(c => c.id)) + 1
            : 1;

        const comment = {
            id: nextCommentId,
            submissionId: submission.id,
            authorId: userId,
            authorName: author.fullName,
            content: data?.content || '',
            createdAt: new Date().toISOString()
        };

        db.update('submissions', submissionId, rec => {
            rec.comments = rec.comments || [];
            rec.comments.unshift(comment);
        });

        return ok(comment, 201);
    },

    getComments: async (submissionId) => {
        await delay();
        const submission = db.getById('submissions', submissionId);
        if (!submission) return err('Submission not found', 404);
        return ok(submission.comments || []);
    }
};

// ============ TIMER API ============

const timerApi = {
    start: async (taskId) => {
        await delay();
        return ok({
            sessionState: 'RUNNING',
            workedSeconds: 0,
            breakSeconds: 0,
            breakTaken: false,
            breakWarning: false,
            breakEndingWarning: false,
            triggerSubmitPage: false
        });
    },

    getActive: async () => {
        await delay();
        const sessions = db.getAll('workSessions');
        return ok(sessions[0] || null);
    },

    sync: async () => {
        await delay();
        const sessions = db.getAll('workSessions');
        const session = sessions[0] || {};
        return ok({
            sessionState: 'RUNNING',
            workedSeconds: session.workedSeconds || 0,
            breakSeconds: session.breakSeconds || 0,
            breakTaken: session.breakTaken || false,
            breakWarning: false,
            breakEndingWarning: false,
            triggerSubmitPage: false
        });
    },

    end: async () => {
        await delay();
        return ok({ message: 'Session ended' });
    }
};

// ============ NOTIFICATIONS API ============

const notificationsApi = {
    getAll: async (page = 0, size = 10) => {
        await delay();
        const all = db.getAll('notifications');
        const start = page * size;
        const notifications = all.slice(start, start + size);
        return ok({
            content: notifications,
            totalElements: all.length,
            totalPages: Math.ceil(all.length / size),
            currentPage: page,
            pageSize: size
        });
    },

    getUnreadCount: async () => {
        await delay();
        const all = db.getAll('notifications');
        const count = all.filter(n => !n.isRead).length;
        return ok(count);
    },

    markRead: async (notificationId) => {
        await delay();
        db.update('notifications', notificationId, { isRead: true });
        return ok({ message: 'Notification marked as read' });
    },

    markAllRead: async () => {
        await delay();
        db.updateWhere('notifications', () => true, { isRead: true });
        return ok({ message: 'All notifications marked as read' });
    }
};

// ============ AUDIT API ============

const auditApi = {
    getLogs: async (filters = {}, page = 0, size = 20) => {
        await delay();
        let logs = db.getAll('auditLogs');

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

        return ok({
            content: paginated,
            totalElements: logs.length,
            totalPages: Math.ceil(logs.length / size),
            currentPage: page,
            pageSize: size
        });
    },

    exportLogs: async (filters = {}) => {
        await delay();
        const logs = db.getAll('auditLogs');
        const headers = 'ID,Action Name,User Email,Performed By,Timestamp,Details\n';
        const rows = logs.map(log =>
            `${log.id},"${log.actionName}","${log.userEmail}","${log.performedByEmail}","${log.timestamp}","${log.details}"`
        );
        const csv = headers + rows.join('\n');
        return ok({ csv, filename: 'audit_logs.csv' });
    }
};

// ============ UNIFIED EXPORT ============

// ============ PROJECT REQUESTS API (TL → Manager) ============

const projectRequestsApi = {
    create: async (data) => {
        await delay();
        const userId = db.getCurrentUserId();
        const user = db.getById('users', userId);
        if (!user) return err('User not authenticated', 401);

        const request = db.insert('projectRequests', {
            requesterId: userId,
            requesterName: user.fullName,
            requesterEmail: user.email,
            projectName: data.projectName,
            description: data.description || '',
            deadline: data.deadline || null,
            priority: data.priority || 'MEDIUM',
            requiredTeamSize: data.requiredTeamSize || 1,
            notes: data.notes || '',
            status: 'PENDING',
            rejectionReason: null,
            submittedAt: new Date().toISOString(),
            resolvedAt: null
        });
        return ok(request, 201);
    },

    getMy: async () => {
        await delay();
        const userId = db.getCurrentUserId();
        const requests = db.query('projectRequests', r => r.requesterId === userId);
        return ok(requests);
    },

    getPending: async () => {
        await delay();
        const pending = db.query('projectRequests', r => r.status === 'PENDING');
        return ok(pending);
    },

    approve: async (requestId) => {
        await delay();
        const request = db.getById('projectRequests', requestId);
        if (!request) return err('Request not found', 404);
        if (request.status !== 'PENDING') return err('Request is not pending', 400);

        db.update('projectRequests', requestId, {
            status: 'APPROVED',
            resolvedAt: new Date().toISOString()
        });

        // Auto-create the project with the requester as team leader.
        const requester = db.getById('users', request.requesterId);
        db.insert('projects', {
            name: request.projectName,
            department: 'Engineering',
            description: request.description,
            descriptionPdfPath: null,
            teamLeaderId: request.requesterId,
            teamLeader: requester ? {
                id: requester.id,
                fullName: requester.fullName,
                email: requester.email,
                role: requester.role
            } : null,
            contributors: [],
            createdAt: new Date().toISOString()
        });

        return ok({ message: 'Project request approved. Project created.' });
    },

    reject: async (requestId, reason) => {
        await delay();
        const request = db.getById('projectRequests', requestId);
        if (!request) return err('Request not found', 404);
        if (request.status !== 'PENDING') return err('Request is not pending', 400);

        db.update('projectRequests', requestId, {
            status: 'REJECTED',
            rejectionReason: reason || 'No reason provided',
            resolvedAt: new Date().toISOString()
        });

        return ok({ message: 'Project request rejected.' });
    }
};

// ============ USERS API — extra helpers ============

const usersExtraApi = {
    getAvailableEmployees: async () => {
        await delay();
        const employees = db.query('users', u =>
            u.role === 'EMPLOYEE' && u.status === 'ACTIVE'
        ).map(u => ({
            id: u.id,
            fullName: u.fullName,
            email: u.email,
            department: u.department,
            status: u.status
        }));
        return ok(employees);
    }
};

// ============ UNIFIED EXPORT ============

export const mockApi = {
    auth: authApi,
    users: { ...usersApi, ...usersExtraApi },
    manager: managerApi,
    projects: projectsApi,
    progress: progressApi,
    tasks: tasksApi,
    submissions: submissionsApi,
    timer: timerApi,
    notifications: notificationsApi,
    audit: auditApi,
    projectRequests: projectRequestsApi,

    isUsingDummyApi: () => true,
    setBaseUrl: () => { /* no-op for mock */ }
};

export default mockApi;
