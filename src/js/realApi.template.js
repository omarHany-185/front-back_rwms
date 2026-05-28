/**
 * realApi.js - Template for Real Backend Integration
 *
 * COPY THIS FILE when you're ready to connect to the real backend.
 * Update the base URL and implement actual HTTP calls using axios or fetch.
 *
 * This template shows the structure you need to match the dummy API interface.
 */

import axios from 'axios';

// ============ CONFIGURATION ============
const API_BASE_URL = 'http://localhost:8080'; // Update to your backend URL

// ============ AXIOS SETUP ============
const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add JWT token to every request
axiosInstance.interceptors.request.use(
    config => {
        // IMPORTANT: do not read tokens from localStorage/sessionStorage.
        // Prefer httpOnly cookies (recommended) or pass a token explicitly via an in-memory auth layer.
        return config;
    },
    error => Promise.reject(error)
);

// Handle responses and normalize to our format
axiosInstance.interceptors.response.use(
    response => ({
        status: response.status,
        data: response.data,
        ok: response.status >= 200 && response.status < 300,
        headers: response.headers
    }),
    error => Promise.reject({
        status: error.response?.status || error.code,
        error: error.response?.data || { message: error.message },
        ok: false
    })
);

// ============ AUTH ENDPOINTS ============
export const authApi = {
    login: (email, password) => {
        return axiosInstance.post('/auth/login', { email, password });
    },

    register: (data) => {
        return axiosInstance.post('/auth/register', data);
    },

    changePassword: (data) => {
        return axiosInstance.post('/auth/change-password', data);
    },

    getCurrentUser: () => {
        return axiosInstance.get('/auth/me');
    }
};

// ============ USERS ENDPOINTS ============
export const usersApi = {
    getAll: () => {
        return axiosInstance.get('/users');
    },

    getById: (id) => {
        return axiosInstance.get(`/users/${id}`);
    },

    getByEmail: (email) => {
        return axiosInstance.get(`/users/email/${email}`);
    },

    getByDepartment: (department) => {
        return axiosInstance.get(`/users/department/${department}`);
    },

    create: (data) => {
        return axiosInstance.post('/users', data);
    },

    update: (id, data) => {
        return axiosInstance.put(`/users/${id}`, data);
    }
};

// ============ MANAGER ENDPOINTS ============
export const managerApi = {
    getPendingAdmins: () => {
        return axiosInstance.get('/manager/pending-admins');
    },

    approveAdmin: (userId) => {
        return axiosInstance.post(`/manager/approve-admin/${userId}`);
    },

    rejectAdmin: (userId) => {
        return axiosInstance.post(`/manager/reject-admin/${userId}`);
    },

    getPendingTLRequests: () => {
        return axiosInstance.get('/manager/pending-tl-requests');
    },

    approveTL: (requestId) => {
        return axiosInstance.post(`/manager/approve-tl/${requestId}`);
    },

    rejectTL: (requestId) => {
        return axiosInstance.post(`/manager/reject-tl/${requestId}`);
    },

    getAllUsers: () => {
        return axiosInstance.get('/manager/users');
    },

    updateUserRole: (userId, role, department) => {
        const params = new URLSearchParams();
        if (role) params.append('role', role);
        if (department) params.append('department', department);
        return axiosInstance.put(`/manager/users/${userId}/role?${params}`);
    },

    deactivateUser: (userId) => {
        return axiosInstance.put(`/manager/users/${userId}/deactivate`);
    },

    deleteUser: (userId) => {
        return axiosInstance.delete(`/manager/users/${userId}`);
    }
};

// ============ PROJECTS ENDPOINTS ============
export const projectsApi = {
    create: (data) => {
        return axiosInstance.post('/projects', data);
    },

    getByDepartment: (dept) => {
        return axiosInstance.get(`/projects/department/${dept}`);
    },

    getMy: () => {
        return axiosInstance.get('/projects/my');
    },

    getById: (id) => {
        return axiosInstance.get(`/projects/${id}`);
    },

    addContributors: (projectId, userIds) => {
        return axiosInstance.post(`/projects/${projectId}/contributors`, { userIds });
    },

    removeContributor: (projectId, userId) => {
        return axiosInstance.delete(`/projects/${projectId}/contributors/${userId}`);
    },

    requestTeamLeader: (projectId) => {
        return axiosInstance.post(`/projects/${projectId}/request-tl`);
    }
};

// ============ PROGRESS ENDPOINTS ============
export const progressApi = {
    getProjectProgress: (projectId) => {
        return axiosInstance.get(`/progress/project/${projectId}`);
    },

    getAllProgress: () => {
        return axiosInstance.get('/progress/manager/all');
    }
};

// ============ TASKS ENDPOINTS ============
export const tasksApi = {
    create: (projectId, data) => {
        return axiosInstance.post(`/tasks/project/${projectId}`, data);
    },

    update: (taskId, data) => {
        return axiosInstance.put(`/tasks/${taskId}`, data);
    },

    delete: (taskId) => {
        return axiosInstance.delete(`/tasks/${taskId}`);
    },

    addSubtask: (taskId, data) => {
        return axiosInstance.post(`/tasks/${taskId}/subtasks`, data);
    },

    updateSubtask: (taskId, subtaskId, data) => {
        return axiosInstance.put(`/tasks/${taskId}/subtasks/${subtaskId}`, data);
    },

    deleteSubtask: (taskId, subtaskId) => {
        return axiosInstance.delete(`/tasks/${taskId}/subtasks/${subtaskId}`);
    },

    assign: (taskId, employeeId) => {
        return axiosInstance.post(`/tasks/${taskId}/assign`, { employeeId });
    },

    getMy: () => {
        return axiosInstance.get('/tasks/my');
    },

    start: (taskId) => {
        return axiosInstance.post(`/tasks/${taskId}/start`);
    },

    completeSubtask: (taskId, subtaskId, comment = '') => {
        return axiosInstance.post(`/tasks/${taskId}/subtasks/${subtaskId}/complete`, comment);
    }
};

// ============ SUBMISSIONS ENDPOINTS ============
export const submissionsApi = {
    submit: (taskId, data, file = null) => {
        const formData = new FormData();
        formData.append('request', JSON.stringify(data));
        if (file) {
            formData.append('file', file);
        }
        return axiosInstance.post(`/submissions/task/${taskId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    getMy: () => {
        return axiosInstance.get('/submissions/my');
    },

    getDetail: (submissionId) => {
        return axiosInstance.get(`/submissions/${submissionId}/detail`);
    },

    review: (submissionId, data) => {
        return axiosInstance.post(`/submissions/${submissionId}/review`, data);
    },

    getPendingByProject: (projectId) => {
        return axiosInstance.get(`/submissions/pending/project/${projectId}`);
    },

    addComment: (submissionId, data) => {
        return axiosInstance.post(`/submissions/${submissionId}/comments`, data);
    },

    getComments: (submissionId) => {
        return axiosInstance.get(`/submissions/${submissionId}/comments`);
    }
};

// ============ TIMER ENDPOINTS ============
export const timerApi = {
    start: (taskId) => {
        return axiosInstance.post(`/timer/start/${taskId}`);
    },

    getActive: () => {
        return axiosInstance.get('/timer/active');
    },

    sync: () => {
        return axiosInstance.post('/timer/sync');
    },

    end: () => {
        return axiosInstance.post('/timer/end');
    }
};

// ============ NOTIFICATIONS ENDPOINTS ============
export const notificationsApi = {
    getAll: (page = 0, size = 10) => {
        return axiosInstance.get(`/api/notifications?page=${page}&size=${size}`);
    },

    getUnreadCount: () => {
        return axiosInstance.get('/api/notifications/unread-count');
    },

    markRead: (notificationId) => {
        return axiosInstance.post(`/api/notifications/${notificationId}/read`);
    },

    markAllRead: () => {
        return axiosInstance.post('/api/notifications/read-all');
    }
};

// ============ AUDIT ENDPOINTS ============
export const auditApi = {
    getLogs: (filters = {}, page = 0, size = 20) => {
        const params = new URLSearchParams({ page, size, ...filters });
        return axiosInstance.get(`/api/audit/logs?${params}`);
    },

    exportLogs: (filters = {}) => {
        const params = new URLSearchParams(filters);
        return axiosInstance.get(`/api/audit/logs/export?${params}`, {
            responseType: 'blob'
        });
    }
};

// ============ MAIN API EXPORT ============
export default {
    auth: authApi,
    users: usersApi,
    manager: managerApi,
    projects: projectsApi,
    progress: progressApi,
    tasks: tasksApi,
    submissions: submissionsApi,
    timer: timerApi,
    notifications: notificationsApi,
    audit: auditApi
};

