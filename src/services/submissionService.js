/**
 * submissionService.js - Submission & Review Service
 *
 * Uses the real Spring Boot backend via realApi.
 */

import { createRealApi } from '../js/realApi.js';

const api = createRealApi();

const submissionService = {
    /**
     * Submit completed work for a task.
     */
    async submitTask(taskId, data, file = null) {
        const response = await api.submissions.submit(taskId, data, file);
        if (!response.ok) {
            throw new Error(response.error?.message || 'Submission failed');
        }
        return response.data;
    },

    /**
     * Get all submissions by the current user.
     */
    async getMySubmissions() {
        const response = await api.submissions.getMy();
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not fetch submissions');
        }
        return response.data || [];
    },

    /**
     * Get detailed view of a single submission (with comments).
     */
    async getSubmissionDetail(submissionId) {
        const response = await api.submissions.getDetail(submissionId);
        if (!response.ok) {
            throw new Error(response.error?.message || 'Submission not found');
        }
        return response.data;
    },

    /**
     * Get all pending submissions for a project (Team Leader review queue).
     */
    async getPendingByProject(projectId) {
        const response = await api.submissions.getPendingByProject(projectId);
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not fetch pending submissions');
        }
        return response.data || [];
    },

    /**
     * Approve or reject a submission.
     * @param {number} submissionId
     * @param {Object} reviewData - { approved: boolean, adminNote, rejectionReason }
     */
    async reviewSubmission(submissionId, reviewData) {
        const response = await api.submissions.review(submissionId, reviewData);
        if (!response.ok) {
            throw new Error(response.error?.message || 'Review failed');
        }
        return response.data;
    },

    /**
     * Add a comment to a submission.
     */
    async addComment(submissionId, content) {
        const response = await api.submissions.addComment(submissionId, { content });
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not add comment');
        }
        return response.data;
    },

    /**
     * Get all comments on a submission.
     */
    async getComments(submissionId) {
        const response = await api.submissions.getComments(submissionId);
        if (!response.ok) {
            throw new Error(response.error?.message || 'Could not fetch comments');
        }
        return response.data || [];
    }
};

export default submissionService;
