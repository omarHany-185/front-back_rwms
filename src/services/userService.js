/**
 * userService.js - User & Authentication Service
 *
 * Uses the real Spring Boot backend via realApi.
 * Token is stored in-memory only via setAuthToken / clearAuthToken.
 */

import { createRealApi, setAuthToken, clearAuthToken } from '../js/realApi.js';

const api = createRealApi();

const userService = {
    /**
     * Authenticate a user and return their profile with token.
     */
    async login(email, password) {
        let normalizedEmail = (email || '').trim().toLowerCase();
        if (normalizedEmail === 'manager') {
            normalizedEmail = 'manager@rwms.local';
        }
        const response = await api.auth.login(normalizedEmail, password);

        if (!response.ok) {
            const msg = response.error?.message || response.error || 'Login failed. Please check your credentials.';
            throw new Error(msg);
        }

        const { token, role, firstLogin, userId } = response.data;

        // Store token in-memory so all subsequent requests are authenticated.
        setAuthToken(token);

        // Fetch full user profile.
        const userResponse = await api.auth.getCurrentUser();
        if (!userResponse.ok) {
            throw new Error('Could not fetch user profile');
        }

        const user = userResponse.data;
        return {
            user: {
                id: user.id,
                name: user.fullName,
                email: user.email,
                role: user.role === 'ADMIN' ? 'TEAM_LEADER' : user.role,
                fullName: user.fullName,
                firstLogin: user.firstLogin,
                department: user.department,
                employeeId: user.employeeId,
                status: user.status
            },
            token
        };
    },

    /**
     * Clear the in-memory auth token on logout.
     */
    logout() {
        clearAuthToken();
    },

    /**
     * Get the currently authenticated user's profile.
     */
    async getCurrentUser() {
        const response = await api.auth.getCurrentUser();
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not fetch user profile');
        }
        const user = response.data;
        if (user && user.role === 'ADMIN') {
            user.role = 'TEAM_LEADER';
        }
        return user;
    },

    /**
     * Change the current user's password.
     */
    async changePassword(currentPassword, newPassword) {
        const response = await api.auth.changePassword({ currentPassword, newPassword });
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not change password.');
        }
    },

    /**
     * Register a new admin/team-leader account (pending manager approval).
     */
    async register(data) {
        const response = await api.auth.register(data);
        if (!response.ok) {
            throw new Error(response.error?.message || 'Registration failed');
        }
        return response.data;
    },

    /**
     * Create a new user account (Manager/Public Register).
     */
    async createUser(data) {
        const backendRole = data.role === 'TEAM_LEADER' ? 'ADMIN' : data.role;
        const response = await api.users.create({
            fullName: data.fullName || data.name,
            email: data.email,
            password: data.password,
            employeeId: data.employeeId,
            department: data.department,
            role: backendRole,
            githubUsername: data.githubUsername || '',
            phone: data.phone || ''
        });
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not create user');
        }
        const user = response.data;
        if (user && user.role === 'ADMIN') {
            user.role = 'TEAM_LEADER';
        }
        return user;
    },

    /**
     * Get all users (Manager view via /manager/users).
     */
    async getAllUsers() {
        const response = await api.manager.getAllUsers();
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not fetch users');
        }
        const users = response.data || [];
        users.forEach(u => {
            if (u.role === 'ADMIN') u.role = 'TEAM_LEADER';
        });
        return users;
    },

    /**
     * Get users by department.
     */
    async getUsersByDepartment(department) {
        const response = await api.users.getByDepartment(department);
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not fetch users');
        }
        const users = response.data || [];
        users.forEach(u => {
            if (u.role === 'ADMIN') u.role = 'TEAM_LEADER';
        });
        return users;
    },

    /**
     * Get all active employees available for task assignment.
     * Fetches all users and filters to ACTIVE EMPLOYEEs.
     */
    async getAvailableEmployees() {
        const response = await api.users.getAll();
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not fetch available employees');
        }
        return (response.data || []).map(u => {
            if (u.role === 'ADMIN') u.role = 'TEAM_LEADER';
            return u;
        }).filter(
            u => u.status === 'ACTIVE' && (u.role === 'EMPLOYEE' || u.role === 'TEAM_LEADER')
        );
    },

    /**
     * Get all managers.
     */
    async getManagers() {
        const response = await api.manager.getAllUsers();
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not fetch managers');
        }
        return (response.data || []).filter(u => u.role === 'MANAGER');
    },

    /**
     * Create a new user (used by Manager to add employees/admins).
     * Maps to POST /users.
     */
    async createManager(data) {
        const backendRole = data.role === 'TEAM_LEADER' ? 'ADMIN' : data.role;
        const response = await api.users.create({
            fullName: data.fullName || data.name,
            email: data.email,
            password: data.password || 'ChangeMe@123',
            employeeId: data.employeeId || `EMP-${Date.now()}`,
            department: data.department,
            role: backendRole || 'ADMIN',
            githubUsername: data.githubUsername || '',
            phone: data.phone || ''
        });
        if (!response.ok) {
            throw new Error(response.error?.message || 'Failed to create user');
        }
        const user = response.data;
        if (user && user.role === 'ADMIN') {
            user.role = 'TEAM_LEADER';
        }
        return user;
    },

    /**
     * Update user role/department (Manager).
     */
    async updateUserRoleAndDepartment(userId, role, department) {
        const backendRole = role === 'TEAM_LEADER' ? 'ADMIN' : role;
        const response = await api.manager.updateUserRole(userId, backendRole, department);
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not update user');
        }
        const user = response.data;
        if (user && user.role === 'ADMIN') {
            user.role = 'TEAM_LEADER';
        }
        return user;
    },

    /**
     * Deactivate a user (Manager).
     */
    async deactivateUser(userId) {
        const response = await api.manager.deactivateUser(userId);
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not deactivate user');
        }
    }
};

export default userService;
