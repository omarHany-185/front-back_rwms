/**
 * realApi.js - Real Backend Integration (Spring Boot)
 *
 * Matches the backend controllers under Remote-Work-Management-System.
 * Token is provided from an in-memory auth layer (no localStorage).
 */
import axios from 'axios';

const DEFAULT_BASE_URL = 'http://localhost:8080';

let authToken = null;

export function setAuthToken(token) {
    authToken = token || null;
}

export function clearAuthToken() {
    authToken = null;
}

export function createRealApi({ baseURL = DEFAULT_BASE_URL } = {}) {
    const axiosInstance = axios.create({
        baseURL,
        timeout: 20000,
        headers: {
            'Content-Type': 'application/json'
        }
    });

    axiosInstance.interceptors.request.use(config => {
        if (authToken) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${authToken}`;
        }
        return config;
    });

    axiosInstance.interceptors.response.use(
        response => ({
            status: response.status,
            data: response.data,
            ok: response.status >= 200 && response.status < 300,
            headers: response.headers
        }),
        error => ({
            status: error.response?.status || 0,
            data: null,
            ok: false,
            error: error.response?.data || { message: error.message }
        })
    );

    return {
        auth: {
            login: (email, password) => axiosInstance.post('/auth/login', { email, password }),
            register: (data) => axiosInstance.post('/auth/register', data),
            changePassword: (data) => axiosInstance.post('/auth/change-password', data),
            getCurrentUser: () => axiosInstance.get('/auth/me')
        },
        users: {
            getAll: () => axiosInstance.get('/users'),
            getById: (id) => axiosInstance.get(`/users/${id}`),
            getByEmail: (email) => axiosInstance.get(`/users/email/${email}`),
            getByDepartment: (department) => axiosInstance.get(`/users/department/${department}`),
            create: (data) => axiosInstance.post('/users', data),
            update: (id, data) => axiosInstance.put(`/users/${id}`, data),
            delete: (id) => axiosInstance.delete(`/users/${id}`)
        },
        manager: {
            getPendingAdmins: () => axiosInstance.get('/manager/pending-admins'),
            approveAdmin: (userId, employeeId) => {
                const query = employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : '';
                return axiosInstance.post(`/manager/approve-admin/${userId}${query}`);
            },
            rejectAdmin: (userId) => axiosInstance.post(`/manager/reject-admin/${userId}`),
            getPendingTLRequests: () => axiosInstance.get('/manager/pending-tl-requests'),
            approveTL: (requestId) => axiosInstance.post(`/manager/approve-tl/${requestId}`),
            rejectTL: (requestId) => axiosInstance.post(`/manager/reject-tl/${requestId}`),
            getAllUsers: () => axiosInstance.get('/manager/users'),
            updateUserRole: (userId, role, department) => {
                const params = new URLSearchParams();
                if (role) params.append('role', role);
                if (department) params.append('department', department);
                const query = params.toString();
                return axiosInstance.put(`/manager/users/${userId}/role${query ? `?${query}` : ''}`);
            },
            deactivateUser: (userId) => axiosInstance.put(`/manager/users/${userId}/deactivate`)
        },
        projects: {
            create: (data) => axiosInstance.post('/projects', data),
            getByDepartment: (dept) => axiosInstance.get(`/projects/department/${dept}`),
            getMy: () => axiosInstance.get('/projects/my'),
            getById: (id) => axiosInstance.get(`/projects/${id}`),
            addContributors: (projectId, userIds) =>
                axiosInstance.post(`/projects/${projectId}/contributors`, { userIds }),
            removeContributor: (projectId, userId) =>
                axiosInstance.delete(`/projects/${projectId}/contributors/${userId}`),
            requestTeamLeader: (projectId) => axiosInstance.post(`/projects/${projectId}/request-tl`)
        },
        progress: {
            getProjectProgress: (projectId) => axiosInstance.get(`/progress/project/${projectId}`),
            getAllProgress: () => axiosInstance.get('/progress/manager/all')
        },
        tasks: {
            create: (projectId, data) => axiosInstance.post(`/tasks/project/${projectId}`, data),
            update: (taskId, data) => axiosInstance.put(`/tasks/${taskId}`, data),
            delete: (taskId) => axiosInstance.delete(`/tasks/${taskId}`),
            addSubtask: (taskId, data) => axiosInstance.post(`/tasks/${taskId}/subtasks`, data),
            updateSubtask: (taskId, subtaskId, data) =>
                axiosInstance.put(`/tasks/${taskId}/subtasks/${subtaskId}`, data),
            deleteSubtask: (taskId, subtaskId) =>
                axiosInstance.delete(`/tasks/${taskId}/subtasks/${subtaskId}`),
            assign: (taskId, employeeId) => axiosInstance.post(`/tasks/${taskId}/assign`, { employeeId }),
            getMy: () => axiosInstance.get('/tasks/my'),
            start: (taskId) => axiosInstance.post(`/tasks/${taskId}/start`),
            completeSubtask: (taskId, subtaskId, comment = '') =>
                axiosInstance.post(`/tasks/${taskId}/subtasks/${subtaskId}/complete`, comment)
        },
        submissions: {
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
            getMy: () => axiosInstance.get('/submissions/my'),
            getDetail: (submissionId) => axiosInstance.get(`/submissions/${submissionId}/detail`),
            review: (submissionId, data) => axiosInstance.post(`/submissions/${submissionId}/review`, data),
            getPendingByProject: (projectId) => axiosInstance.get(`/submissions/pending/project/${projectId}`),
            addComment: (submissionId, data) => axiosInstance.post(`/submissions/${submissionId}/comments`, data),
            getComments: (submissionId) => axiosInstance.get(`/submissions/${submissionId}/comments`)
        },
        timer: {
            start: (taskId) => axiosInstance.post(`/timer/start/${taskId}`),
            getActive: () => axiosInstance.get('/timer/active'),
            sync: () => axiosInstance.post('/timer/sync'),
            end: () => axiosInstance.post('/timer/end')
        }
    };
}

