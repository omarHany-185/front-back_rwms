/**
 * taskService.js - Task & Timer Service
 *
 * Uses the real Spring Boot backend via realApi.
 */

import { createRealApi } from '../js/realApi.js';

const api = createRealApi();

const taskService = {
    /**
     * Get all tasks assigned to the currently authenticated user.
     */
    async getMyTasks() {
        const response = await api.tasks.getMy();
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not fetch tasks');
        }
        return response.data || [];
    },

    /**
     * Get all tasks for a specific project.
     * The backend does not expose GET /tasks/project/{id} separately;
     * tasks are embedded in the project response. Fetch via project and return tasks.
     */
    async getTasksByProject(projectId) {
        const response = await api.projects.getById(projectId);
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not fetch project tasks');
        }
        return response.data?.tasks || [];
    },

    /**
     * Create a new task in a project (Team Leader).
     */
    async createTask(projectId, data) {
        const response = await api.tasks.create(projectId, data);
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not create task');
        }
        return response.data;
    },

    /**
     * Update a task.
     */
    async updateTask(taskId, data) {
        const response = await api.tasks.update(taskId, data);
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not update task');
        }
        return response.data;
    },

    /**
     * Delete a task.
     */
    async deleteTask(taskId) {
        const response = await api.tasks.delete(taskId);
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not delete task');
        }
    },

    /**
     * Add a subtask to a task.
     */
    async addSubtask(taskId, data) {
        const response = await api.tasks.addSubtask(taskId, data);
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not add subtask');
        }
        return response.data;
    },

    /**
     * Update a subtask.
     */
    async updateSubtask(taskId, subtaskId, data) {
        const response = await api.tasks.updateSubtask(taskId, subtaskId, data);
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not update subtask');
        }
    },

    /**
     * Delete a subtask.
     */
    async deleteSubtask(taskId, subtaskId) {
        const response = await api.tasks.deleteSubtask(taskId, subtaskId);
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not delete subtask');
        }
    },

    /**
     * Assign a task to an employee (Team Leader).
     */
    async assignTask(taskId, employeeId) {
        const response = await api.tasks.assign(taskId, employeeId);
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not assign task');
        }
        return response.data;
    },

    /**
     * Mark a task as started (IN_PROGRESS).
     */
    async startTask(taskId) {
        const response = await api.tasks.start(taskId);
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not start task');
        }
        return response.data;
    },

    /**
     * Mark a subtask as completed by the employee.
     */
    async completeSubtask(taskId, subtaskId, comment = null) {
        const response = await api.tasks.completeSubtask(taskId, subtaskId, comment || '');
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not complete subtask');
        }
    },

    /**
     * Start a backend work-session timer for a task.
     */
    async startTimer(taskId) {
        const response = await api.timer.start(taskId);
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not start timer');
        }
        return response.data;
    },

    /**
     * Get the currently active work session (if any).
     */
    async getActiveSession() {
        const response = await api.timer.getActive();
        // 404 means no active session — that's fine
        if (response.status === 404) return null;
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not fetch active session');
        }
        return response.data;
    },

    /**
     * Sync a tick to the backend timer.
     */
    async syncTimer() {
        const response = await api.timer.sync();
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not sync timer');
        }
        return response.data;
    },

    /**
     * End the current work session.
     */
    async endTimer() {
        const response = await api.timer.end();
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not end timer');
        }
    },

    /**
     * Pure logic check: is a task ready for submission?
     */
    isTaskReadyForSubmission(task) {
        if (!task) return false;
        if (!task.subtasks || task.subtasks.length === 0) return true;
        return task.subtasks.every(s => s.completedByEmployee === true);
    }
};

export default taskService;
