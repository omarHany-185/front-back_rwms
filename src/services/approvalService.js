/**
 * approvalService.js - Manager Approval & Project Service
 *
 * Uses the real Spring Boot backend via realApi.
 *
 * Note: The backend does not have a separate "projectRequests" flow.
 * Projects are created directly by Team Leaders via POST /projects.
 * The TL-request flow (requestTeamLeader) is the approval mechanism
 * for assigning a TL to a project.
 */

import { createRealApi } from '../js/realApi.js';

const api = createRealApi();

const approvalService = {
    // ============ ADMIN (TEAM LEADER) REGISTRATIONS ============

    async getPendingAdmins() {
        const response = await api.manager.getPendingAdmins();
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not fetch pending admins');
        }
        const users = response.data || [];
        users.forEach(u => {
            if (u.role === 'ADMIN') u.role = 'TEAM_LEADER';
        });
        return users;
    },

    async approveAdmin(userId, employeeId) {
        const response = await api.manager.approveAdmin(userId, employeeId);
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not approve');
        }
    },

    async rejectAdmin(userId) {
        const response = await api.manager.rejectAdmin(userId);
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not reject');
        }
    },

    // ============ TEAM LEADER ASSIGNMENT REQUESTS ============

    async getPendingTLRequests() {
        const response = await api.manager.getPendingTLRequests();
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not fetch TL requests');
        }
        return response.data || [];
    },

    async approveTLRequest(requestId) {
        const response = await api.manager.approveTL(requestId);
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not approve request');
        }
    },

    async rejectTLRequest(requestId) {
        const response = await api.manager.rejectTL(requestId);
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not reject request');
        }
    },

    // ============ PROJECT REQUESTS (mapped to direct project creation) ============

    /**
     * "Create a project request" — in the real backend, Team Leaders
     * create projects directly via POST /projects.
     */
    async createProjectRequest(data) {
        const response = await api.projects.create({
            name: data.projectName || data.name,
            description: data.description,
            deadline: data.deadline,
            priority: data.priority || 'MEDIUM',
            department: data.department
        });
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not create project');
        }
        return response.data;
    },

    /**
     * "My project requests" — in the real backend this maps to /projects/my.
     */
    async getMyProjectRequests() {
        const response = await api.projects.getMy();
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not fetch projects');
        }
        return response.data || [];
    },

    /**
     * Get pending project requests — maps to backend TeamLeaderRequest.
     */
    async getPendingProjectRequests() {
        const response = await api.manager.getPendingTLRequests();
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not fetch project requests');
        }
        return (response.data || []).map(r => ({
            id: r.id,
            projectName: r.projectName || '',
            description: '',
            requesterName: r.requesterName || 'Unknown',
            priority: 'MEDIUM',
            requiredTeamSize: 1,
            deadline: null,
            notes: '',
            status: r.status || 'PENDING'
        }));
    },

    async approveProjectRequest(requestId) {
        const response = await api.manager.approveTL(requestId);
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not approve project request');
        }
    },

    async rejectProjectRequest(requestId, reason) {
        const response = await api.manager.rejectTL(requestId);
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not reject project request');
        }
    },

    // ============ PROJECT QUERIES ============

    async getProjectsByDepartment(department) {
        const response = await api.projects.getByDepartment(department);
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not fetch projects');
        }
        return response.data || [];
    },

    async getAllProjects() {
        const response = await api.projects.getAll();
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not fetch projects');
        }
        return response.data || [];
    },

    async getMyProjects() {
        const response = await api.projects.getMy();
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not fetch projects');
        }
        return response.data || [];
    },

    /**
     * Employee's projects — also uses /projects/my (backend returns projects
     * where user is a contributor or owner).
     */
    async getMyProjectsAsEmployee() {
        const response = await api.projects.getMy();
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not fetch projects');
        }
        return response.data || [];
    },

    // ============ CONTRIBUTOR MANAGEMENT ============

    async addContributors(projectId, userIds) {
        const response = await api.projects.addContributors(projectId, userIds);
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not add contributors');
        }
        return response.data;
    },

    async removeContributor(projectId, userId) {
        const response = await api.projects.removeContributor(projectId, userId);
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not remove contributor');
        }
        return response.data;
    },

    /**
     * Request Team Leader assignment for a project.
     */
    async requestTeamLeader(projectId) {
        const response = await api.projects.requestTeamLeader(projectId);
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not submit TL request');
        }
    },

    // ============ TEAM MEMBERS ============

    async getAllUsers() {
        const response = await api.manager.getAllUsers();
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not fetch users');
        }
        return response.data || [];
    },

    /**
     * Derive team members from a list of projects.
     */
    deriveTeamMembers(projects) {
        const members = new Map();
        (projects || []).forEach(p => {
            (p.contributors || []).forEach(c => members.set(c.id, c));
            if (p.teamLeader?.id) members.set(p.teamLeader.id, p.teamLeader);
        });

        return Array.from(members.values()).map(u => ({
            id: u.id,
            name: u.fullName || u.name,
            email: u.email,
            timeWorkedToday: 0,
            status: u.status === 'ACTIVE' ? 'Active' : 'Offline'
        }));
    }
};

export default approvalService;
