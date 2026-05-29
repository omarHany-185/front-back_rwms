/**
 * Controller.js - Business Logic Layer
 * Acts as the intermediary. Receives input from the View, executes
 * logic via service methods, and updates the Model.
 *
 * MOCK API ARCHITECTURE:
 * All data reads/writes go through the service layer (services/),
 * which in turn calls mockApi. To connect a real backend, swap the
 * import inside each service from mockApi to realApi.
 */
import appModel from '../models/Model.js';
import userService from '../services/userService.js';
import taskService from '../services/taskService.js';
import submissionService from '../services/submissionService.js';
import approvalService from '../services/approvalService.js';

export class RwmsController {
    constructor(model) {
        this.model = model;
        this.timerInterval = null;
    }

    normalizeRoutePath(path) {
        const rawPath = typeof path === 'string' ? path.split('?')[0].split('#')[0].trim() : '/';

        if (!rawPath || rawPath === '/' || rawPath === '/index.html') {
            return '/';
        }

        const normalized = rawPath.length > 1 && rawPath.endsWith('/') ? rawPath.slice(0, -1) : rawPath;

        if (normalized === '/signin' || normalized === '/signup') {
            return '/signin';
        }

        if (normalized === '/dashboard') {
            return '/dashboard';
        }

        return '/';
    }

    updateRouteState(path, { replace = false } = {}) {
        const nextPath = this.normalizeRoutePath(path);

        if (typeof window !== 'undefined' && window.history) {
            if (replace) {
                window.history.replaceState({}, '', nextPath);
            } else if (window.location.pathname !== nextPath) {
                window.history.pushState({}, '', nextPath);
            }
        }

        this.state.routePath = nextPath;
        this.state.showLoginPanel = nextPath === '/signin';
        if (nextPath === '/signin') {
            this.state.authMode = 'login';
        }
        this.setAuthFeedback();
    }

    syncRouteFromLocation() {
        if (typeof window === 'undefined') {
            return;
        }

        this.updateRouteState(window.location.pathname, { replace: true });
    }

    saveRegisteredUsers() {
        // Intentionally no-op: keep registered users in-memory only.
    }

    saveSession(account) {
        // Intentionally no-op: do not store sessions in the browser.
    }

    clearSession() {
        // Intentionally no-op: do not store sessions in the browser.
    }

    setAuthFeedback(message = '', type = 'info') {
        this.state.authMessage = message;
        this.state.authMessageType = type;
    }

    createUserProfile({ email, role, name }) {
        const safeEmail = email.trim().toLowerCase();
        const baseName = name?.trim() || safeEmail.split('@')[0] || 'Workspace User';

        return {
            id: Date.now() + Math.random(),
            name: baseName,
            email: safeEmail,
            role
        };
    }

    // Accessor for the reactive state
    get state() {
        return this.model.getState();
    }

    // --- Authentication & Navigation Logic ---

    goToLogin() {
        this.updateRouteState('/signin');
        if (typeof window !== 'undefined' && window.scrollTo) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    goHome() {
        this.updateRouteState('/');
        if (typeof window !== 'undefined' && window.scrollTo) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    async login(userData) {
        const email = (userData.email || '').trim().toLowerCase();
        const password = userData.password || '';

        this.state.actionLoading = true;
        try {
            const { user, token } = await userService.login(email, password);

            // Keep token in-memory only (no browser persistence)
            this.state.authToken = token;
            this.state.currentUser = user;
            this.state.currentRole = user.role;
            this.state.showLoginPanel = false;
            this.state.authMode = 'login';

            // Load dashboard data for this user
            await this.loadDashboardData(user.id, user.role);

            this.updateRouteState('/dashboard', { replace: true });
            this.setAuthFeedback(`Welcome back, ${user.name}. Your ${user.role} dashboard is ready.`, 'success');
            return true;
        } catch (error) {
            this.setAuthFeedback(error.message || 'Login failed. Please try again.', 'error');
            console.error('Login error:', error);
            return false;
        } finally {
            this.state.actionLoading = false;
        }
    }

    async loadDashboardData(userId, role) {
        this.state.dashboardLoading = true;
        this.state.loadError = null;

        try {
            if (role === 'EMPLOYEE') {
                // Reset task/timer UI state for a fresh dashboard session.
                this.stopTimer();
                this.state.activeTaskIndex = -1;
                this.state.activeTask = null;
                this.state.shiftTime = 0;
                this.state.activeWorkTime = 0;
                this.state.breakTime = 0;
                this.state.timerStatus = 'Not Started';

                // Load employee tasks via service.
                this.state.assignedTasks = await taskService.getMyTasks();

                // Restore active work session from backend
                try {
                    const session = await taskService.getActiveSession();
                    if (session) {
                        this.state.shiftTime = session.workedSeconds || 0;
                        this.state.activeWorkTime = session.workedSeconds || 0;
                        this.state.breakTime = session.breakSeconds || 0;
                        this.state.timerRunning = session.sessionState === 'RUNNING';
                        this.state.timerPaused = session.sessionState === 'ON_BREAK';
                        this.state.timerStatus = session.sessionState === 'RUNNING' ? 'Active' : (session.sessionState === 'ON_BREAK' ? 'Paused' : 'Not Started');
                        // Restart the local timer interval if running
                        if (this.state.timerRunning && !this.timerInterval) {
                            this.startTimerInterval();
                        }
                    }
                } catch (_) {
                    // No active session — fresh start
                }

                // Load employee submissions.
                this.state.mySubmissions = await submissionService.getMySubmissions();

                // Load projects the employee is assigned to.
                this.state.myProjects = await approvalService.getMyProjectsAsEmployee();
            } else if (role === 'TEAM_LEADER') {
                // Load projects owned by the TL.
                const projects = await approvalService.getMyProjects();
                this.state.projects = projects;

                // Load all pending submissions for all projects.
                const pending = [];
                for (const p of projects) {
                    const subs = await submissionService.getPendingByProject(p.id);
                    pending.push(...subs);
                }
                this.state.pendingSubmissions = pending.sort((a, b) =>
                    new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0)
                );

                // Derive contributor list from projects.
                this.state.teamMembers = approvalService.deriveTeamMembers(projects);

                // Fetch work session status for team members
                try {
                    const memberIds = this.state.teamMembers.map(m => m.id).filter(Boolean);
                    if (memberIds.length) {
                        const workStatuses = await taskService.getTeamWorkStatus(memberIds);
                        const statusMap = {};
                        workStatuses.forEach(ws => { statusMap[ws.employeeId] = ws; });
                        this.state.teamMembers.forEach(m => {
                            const ws = statusMap[m.id];
                            if (ws) {
                                m.timeWorkedToday = ws.workedSeconds || 0;
                                m.breakSeconds = ws.breakSeconds || 0;
                                m.workingStatus = ws.sessionState === 'RUNNING' ? 'Working'
                                    : ws.sessionState === 'ON_BREAK' ? 'On Break' : 'Online';
                            } else {
                                m.workingStatus = 'Online';
                            }
                        });
                    }
                } catch (_) { /* no work status available */ }

                // Load TL's own project requests and their statuses.
                this.state.myProjectRequests = await approvalService.getMyProjectRequests();

                // Load available employees for assignment.
                this.state.availableEmployees = await userService.getAvailableEmployees();
            } else if (role === 'MANAGER') {
                // Load manager-specific data via services.
                const pending = await approvalService.getPendingAdmins();
                pending.forEach(u => {
                    u.employeeIdInput = u.employeeIdInput || `EMP-${Math.floor(100 + Math.random() * 900)}`;
                });
                this.state.pendingApprovals = pending;
                this.state.tlRequests = await approvalService.getPendingTLRequests();

                const allUsers = await approvalService.getAllUsers();
                this.state.teamMembers = allUsers.filter(u => u.role === 'EMPLOYEE' || u.role === 'TEAM_LEADER' || u.role === 'ADMIN');

                this.state.projects = await approvalService.getAllProjects();

                // Load pending project requests for manager review.
                this.state.pendingProjectRequests = await approvalService.getPendingProjectRequests();

                // Load existing managers for admin panel.
                this.state.managers = await userService.getManagers();
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.state.loadError = error.message || 'Failed to load dashboard data';
        } finally {
            this.state.dashboardLoading = false;
        }
    }

    // ==========================================================
    // Profile & session (unchanged)
    // ==========================================================

    openProfile() {
        this.state.showProfileModal = true;
        this.state.profileBusy = false;
        this.state.profileForm = { currentPassword: '', newPassword: '' };
        this.setAuthFeedback();
    }

    closeProfile() {
        this.state.showProfileModal = false;
        this.state.profileBusy = false;
        this.state.profileForm = { currentPassword: '', newPassword: '' };
    }

    async changePassword() {
        if (!this.state.currentUser) {
            this.setAuthFeedback('Please sign in first.', 'error');
            return false;
        }

        const currentPassword = this.state.profileForm.currentPassword || '';
        const newPassword = this.state.profileForm.newPassword || '';

        if (!currentPassword || !newPassword) {
            this.setAuthFeedback('Please fill in both password fields.', 'error');
            return false;
        }

        this.state.profileBusy = true;
        try {
            await userService.changePassword(currentPassword, newPassword);
            this.setAuthFeedback('Password updated successfully.', 'success');
            this.closeProfile();
            return true;
        } catch (error) {
            this.setAuthFeedback(error.message || 'Could not change password. Please try again.', 'error');
            console.error('Change password error:', error);
            return false;
        } finally {
            this.state.profileBusy = false;
        }
    }

    async refreshMyData() {
        if (!this.state.currentUser) {
            return;
        }
        await this.loadDashboardData(this.state.currentUser.id, this.state.currentUser.role);
    }

    async signup(userData) {
        const email = (userData.email || '').trim().toLowerCase();
        const password = userData.password || '';
        const role = userData.role;
        const name = userData.name || '';
        const employeeId = `TEMP-PENDING-${Math.floor(10000 + Math.random() * 90000)}`;
        const department = userData.department || 'Engineering';
        const githubUsername = userData.githubUsername?.trim() || '';
        const phone = userData.phone?.trim() || '';

        if (!email || !password || !role) {
            this.setAuthFeedback('Please complete all required sign-up fields.', 'error');
            return false;
        }

        if (!['EMPLOYEE', 'TEAM_LEADER'].includes(role)) {
            this.setAuthFeedback('Please choose a valid workspace role.', 'error');
            return false;
        }

        this.state.actionLoading = true;
        try {
            // All roles are created via the same path — persisted in the mock DB
            // with status PENDING, visible in the Manager's approval queue.
            await userService.createUser({
                fullName: name,
                employeeId: employeeId,
                email: email,
                password: password,
                role: role,
                githubUsername: githubUsername,
                phone: phone,
                department: department
            });

            this.state.showLoginPanel = true;
            this.state.authMode = 'login';

            const roleLabel = role === 'TEAM_LEADER' ? 'Team Leader' : role === 'MANAGER' ? 'Manager' : 'Employee';
            this.setAuthFeedback(
                `${roleLabel} account created. Pending manager approval — sign in once approved.`,
                'success'
            );
            return true;
        } catch (error) {
            this.setAuthFeedback(error.message || 'Signup failed. Please try again.', 'error');
            console.error('Signup error:', error);
            return false;
        } finally {
            this.state.actionLoading = false;
        }
    }

    logout() {
        userService.logout(); // Clears in-memory JWT token from realApi
        this.state.currentUser = null;
        this.state.currentRole = 'EMPLOYEE';
        this.state.authToken = null;
        this.closeProfile();
        this.clearSession();
        this.goHome();
        this.stopTimer(); // Ensure intervals don't leak when logging out
    }

    setAuthMode(mode) {
        this.state.authMode = mode;
        this.state.showLoginPanel = true;
        this.setAuthFeedback();
    }


    selectRole(role) {
        if (!this.state.currentUser) {
            this.state.currentRole = role;
        }
    }

    // ==========================================================
    // Employee Time Tracking Logic (unchanged)
    // ==========================================================

    async startShift(taskId) {
        const activeTaskId = taskId || this.state.activeTask?.id;
        if (!activeTaskId) return;

        // If resuming from pause, skip backend calls (task+session already exist)
        if (this.state.timerPaused) {
            try { await taskService.resumeTimer(); } catch (_) {}
            this.state.timerRunning = true;
            this.state.timerStatus = 'Active';
            this.state.timerPaused = false;
            // Restore activeTask from assignedTasks if it went null
            if (!this.state.activeTask && this.state.assignedTasks?.length) {
                const session = await taskService.getActiveSession().catch(() => null);
                if (session?.taskId) {
                    const found = this.state.assignedTasks.find(t => t.id === session.taskId);
                    if (found) {
                        this.state.activeTask = found;
                        this.state.activeTaskIndex = this.state.assignedTasks.indexOf(found);
                    }
                }
            }
            if (!this.timerInterval) {
                this.startTimerInterval();
            }
            this.setAuthFeedback('Timer resumed.', 'success');
            return;
        }

        // Mark task as started via service.
        try {
            await taskService.startTask(activeTaskId);
            // End any stale active session before starting a new one
            try { await taskService.endTimer(); } catch (_) {}
            await taskService.startTimer(activeTaskId);
            this.state.assignedTasks = await taskService.getMyTasks();
        } catch (e) {
            // If startTask succeeded but startTimer failed due to existing session,
            // still allow the local timer (session from a previous incomplete start)
            const msg = e.message || '';
            if (msg.includes('active session already exists')) {
                // Continue with local timer - session already exists
            } else {
                const stuck = (this.state.assignedTasks || []).find(t => t.status === 'IN_PROGRESS');
                const errMsg = stuck
                    ? `Cannot start — task "${stuck.title}" (ID: ${stuck.id}) is already IN_PROGRESS. Submit or cancel it first.`
                    : (e.message || 'Could not start task.');
                this.setAuthFeedback(errMsg, 'error');
                console.error('Start task error:', e);
                return;
            }
        }

        this.state.activeTaskIndex = this.state.assignedTasks.findIndex(t => t.id === activeTaskId);
        this.state.activeTask = this.state.assignedTasks[this.state.activeTaskIndex] || null;

        this.state.timerRunning = true;
        this.state.timerStatus = 'Active';

        this.state.shiftTime = 0;
        this.state.activeWorkTime = 0;
        this.state.breakTime = 0;
        this.state.timerPaused = false;
        this.state.showTimerWarning = false;

        if (!this.timerInterval) {
            this.startTimerInterval();
        }
    }

    startTimerInterval() {
        let syncCounter = 0;
        this.timerInterval = setInterval(() => {
            // Increment work time while running, break time while paused.
            if (this.state.timerRunning) {
                this.state.shiftTime++;
                this.state.activeWorkTime++;
                // Auto-stop after 8 hours (28800 seconds)
                if (this.state.shiftTime >= 28800) {
                    this.stopSession();
                    this.setAuthFeedback('8-hour work limit reached. Session ended.', 'info');
                    return;
                }
            } else if (this.state.timerPaused) {
                this.state.shiftTime++;
                this.state.breakTime++;
            }
            // Sync with backend every 10 seconds for persistence
            syncCounter++;
            if (syncCounter >= 10) {
                syncCounter = 0;
                taskService.syncTimer().catch(() => {});
            }
        }, 1000);
    }

    async pauseShift() {
        // Sync timer with backend before pausing
        try { await taskService.syncTimer(); } catch (_) {}
        try { await taskService.pauseTimer(); } catch (_) {}
        this.state.timerRunning = false;
        this.state.timerPaused = true;
        this.state.timerStatus = 'Paused';
        // Defensive: restore activeTask from assignedTasks if it went null
        if (!this.state.activeTask && this.state.assignedTasks?.length) {
            const session = await taskService.getActiveSession().catch(() => null);
            if (session?.taskId) {
                const found = this.state.assignedTasks.find(t => t.id === session.taskId);
                if (found) {
                    this.state.activeTask = found;
                    this.state.activeTaskIndex = this.state.assignedTasks.indexOf(found);
                }
            }
        }
    }

    async stopSession() {
        try { await taskService.syncTimer(); } catch (_) {}
        await this.endBackendTimer();
        this.stopTimer();
        this.setAuthFeedback('Session ended.', 'success');
    }

    stopTimer() {
        this.state.timerRunning = false;
        this.state.timerPaused = false;
        this.state.timerStatus = 'Not Started';
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    async endBackendTimer() {
        try {
            await taskService.endTimer();
        } catch (e) {
            // Ignore if no active session
        }
    }

    // ==========================================================
    // Task Management Logic (unchanged)
    // ==========================================================

    openTask(taskId) {
        const idx = this.state.assignedTasks.findIndex(t => t.id === taskId);
        if (idx < 0) return;
        this.state.activeTaskIndex = idx;
        this.state.activeTask = this.state.assignedTasks[idx];
        this.setAuthFeedback();
    }

    isActiveTaskReadyForSubmission() {
        return taskService.isTaskReadyForSubmission(this.state.activeTask);
    }

    async toggleSubtask(subtaskId) {
        if (!this.state.activeTask) return;

        const taskId = this.state.activeTask.id;
        const subtask = this.state.activeTask.subtasks.find(s => s.id === subtaskId);
        if (!subtask) return;

        // Only support "mark complete" (backend endpoint exists for completion only).
        if (subtask.completedByEmployee) {
            // Un-checking is UI-only; we won't call the backend to avoid mismatch.
            subtask.completedByEmployee = true;
            return;
        }

        try {
            await taskService.completeSubtask(taskId, subtaskId, null);

            // Refresh tasks so the UI reflects the updated workflow state.
            this.state.assignedTasks = await taskService.getMyTasks();
            this.openTask(taskId);
        } catch (e) {
            console.error('Complete subtask error:', e);
            this.setAuthFeedback('Could not complete subtask. Please try again.', 'error');
        }
    }

    openSubmissionModal() {
        if (!this.state.activeTask) return;
        this.state.showSubmissionModal = true;
        this.state.submissionBusy = false;
        this.state.submissionForm = {
            accomplishmentComment: this.state.submissionForm?.accomplishmentComment || '',
            alternativeGithubLink: this.state.submissionForm?.alternativeGithubLink || '',
            fileName: this.state.submissionForm?.fileName || null
        };
        this.state.submissionFile = this.state.submissionFile || null;
        this.setAuthFeedback();
    }

    closeSubmissionModal() {
        this.state.showSubmissionModal = false;
        this.state.submissionBusy = false;
        this.state.submissionForm = {
            accomplishmentComment: '',
            alternativeGithubLink: '',
            fileName: null
        };
        this.state.submissionFile = null;
    }

    async submitActiveTask() {
        if (!this.state.activeTask) return false;
        if (!this.isActiveTaskReadyForSubmission()) {
            this.setAuthFeedback('All subtasks must be completed before submitting.', 'error');
            return false;
        }

        const taskId = this.state.activeTask.id;
        this.state.submissionBusy = true;

        try {
            await submissionService.submitTask(taskId, {
                accomplishmentComment: this.state.submissionForm.accomplishmentComment,
                alternativeGithubLink: this.state.submissionForm.alternativeGithubLink
            }, this.state.submissionFile);

            this.closeSubmissionModal();
            await this.endBackendTimer();
            await this.loadDashboardData(this.state.currentUser.id, this.state.currentRole);

            // Clear task focus after submission.
            this.state.activeTaskIndex = -1;
            this.state.activeTask = null;

            this.setAuthFeedback('Task submitted successfully. Waiting for review.', 'success');
            return true;
        } catch (e) {
            this.setAuthFeedback(e.message || 'Submission failed. Please try again.', 'error');
            console.error('Submit task error:', e);
            return false;
        } finally {
            this.state.submissionBusy = false;
        }
    }

    // ==========================================================
    // Team Leader/Admin: submission review workflow (unchanged)
    // ==========================================================

    async openReviewSubmission(submissionId) {
        try {
            const detail = await submissionService.getSubmissionDetail(submissionId);

            this.state.activeSubmissionId = submissionId;
            // Flatten nested submissionInfo for template access
            this.state.activeSubmissionDetail = detail.submissionInfo
                ? { ...detail.submissionInfo, ...detail }
                : detail;
            this.state.showReviewModal = true;
            this.state.reviewBusy = false;
            this.state.reviewForm = {
                action: 'APPROVED',
                adminNote: '',
                rejectionReason: '',
                commentContent: ''
            };
            this.setAuthFeedback();
        } catch (e) {
            this.setAuthFeedback(e.message || 'Could not load submission details.', 'error');
            console.error('Open review error:', e);
        }
    }

    closeReviewModal() {
        this.state.showReviewModal = false;
        this.state.activeSubmissionId = null;
        this.state.activeSubmissionDetail = null;
        this.state.reviewBusy = false;
        this.state.reviewForm = {
            action: 'APPROVED',
            adminNote: '',
            rejectionReason: '',
            commentContent: ''
        };
    }

    async downloadAttachment(submissionId) {
        try {
            const { blob, filename } = await submissionService.downloadFile(submissionId);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            this.setAuthFeedback('Could not download attachment.', 'error');
            console.error('Download error:', e);
        }
    }

    async reviewActiveSubmission() {
        if (!this.state.activeSubmissionId) return false;

        // Validate rejection reason
        const action = this.state.reviewForm.action === 'APPROVED' ? 'APPROVE' : 'REJECT';
        const rejectionReason = this.state.reviewForm.rejectionReason || '';
        if (action === 'REJECT' && !rejectionReason.trim()) {
            this.setAuthFeedback('Please provide a rejection reason.', 'error');
            return false;
        }

        this.state.reviewBusy = true;

        try {
            await submissionService.reviewSubmission(this.state.activeSubmissionId, {
                action,
                rejectionReason: rejectionReason.trim() || null,
                adminNote: this.state.reviewForm.adminNote?.trim() || null
            });

            this.closeReviewModal();
            await this.loadDashboardData(this.state.currentUser.id, this.state.currentRole);
            this.setAuthFeedback('Review saved. Status updated.', 'success');
            return true;
        } catch (e) {
            this.setAuthFeedback(e.message || 'Review failed. Please try again.', 'error');
            console.error('Review error:', e);
            return false;
        } finally {
            this.state.reviewBusy = false;
        }
    }

    async addReviewComment() {
        if (!this.state.activeSubmissionId) return false;
        const content = this.state.reviewForm.commentContent || '';
        if (!content.trim()) {
            this.setAuthFeedback('Comment cannot be empty.', 'error');
            return false;
        }

        try {
            await submissionService.addComment(this.state.activeSubmissionId, content);

            // Refresh the modal details so comments render immediately.
            const detail = await submissionService.getSubmissionDetail(this.state.activeSubmissionId);
            this.state.activeSubmissionDetail = detail.submissionInfo
                ? { ...detail.submissionInfo, ...detail }
                : detail;
            this.state.reviewForm.commentContent = '';
            return true;
        } catch (e) {
            this.setAuthFeedback(e.message || 'Could not add comment. Please try again.', 'error');
            console.error('Add comment error:', e);
            return false;
        }
    }

    // ==========================================================
    // Manager: User registration approval (unchanged)
    // ==========================================================

    async approveAllPending() {
        if (!this.state.pendingApprovals || this.state.pendingApprovals.length === 0) {
            this.setAuthFeedback('No pending approvals to process.', 'info');
            return false;
        }
        
        this.state.actionLoading = true;
        try {
            for (const user of this.state.pendingApprovals) {
                await approvalService.approveAdmin(user.id, user.employeeIdInput);
            }
            await this.loadDashboardData(this.state.currentUser.id, 'MANAGER');
            this.setAuthFeedback('All pending registrations approved.', 'success');
            return true;
        } catch (e) {
            this.setAuthFeedback(e.message || 'Could not approve all', 'error');
            return false;
        } finally {
            this.state.actionLoading = false;
        }
    }

    async approvePendingAdmin(userId, employeeId) {
        this.state.actionLoading = true;
        try {
            await approvalService.approveAdmin(userId, employeeId);
            await this.loadDashboardData(this.state.currentUser.id, 'MANAGER');
            this.setAuthFeedback('Registration approved.', 'success');
            return true;
        } catch (e) {
            this.setAuthFeedback(e.message || 'Could not approve', 'error');
            return false;
        } finally {
            this.state.actionLoading = false;
        }
    }

    async rejectPendingAdmin(userId) {
        this.state.actionLoading = true;
        try {
            await approvalService.rejectAdmin(userId);
            await this.loadDashboardData(this.state.currentUser.id, 'MANAGER');
            this.setAuthFeedback('Registration rejected.', 'success');
            return true;
        } catch (e) {
            this.setAuthFeedback(e.message || 'Could not reject', 'error');
            return false;
        } finally {
            this.state.actionLoading = false;
        }
    }

    async approveTLRequest(requestId) {
        this.state.actionLoading = true;
        try {
            await approvalService.approveTLRequest(requestId);
            await this.loadDashboardData(this.state.currentUser.id, 'MANAGER');
            this.setAuthFeedback('Team leader request approved.', 'success');
            return true;
        } catch (e) {
            this.setAuthFeedback(e.message || 'Could not approve request', 'error');
            return false;
        } finally {
            this.state.actionLoading = false;
        }
    }

    async rejectTLRequest(requestId) {
        this.state.actionLoading = true;
        try {
            await approvalService.rejectTLRequest(requestId);
            await this.loadDashboardData(this.state.currentUser.id, 'MANAGER');
            this.setAuthFeedback('Team leader request rejected.', 'success');
            return true;
        } catch (e) {
            this.setAuthFeedback(e.message || 'Could not reject request', 'error');
            return false;
        } finally {
            this.state.actionLoading = false;
        }
    }

    // ==========================================================
    // TL: Project Request Workflow (NEW)
    // ==========================================================

    openProjectRequestModal() {
        this.state.showProjectRequestModal = true;
        this.state.projectRequestBusy = false;
        this.state.projectRequestForm = {
            projectName: '',
            description: '',
            deadline: '',
            priority: 'MEDIUM',
            requiredTeamSize: 1,
            notes: ''
        };
        this.setAuthFeedback();
    }

    closeProjectRequestModal() {
        this.state.showProjectRequestModal = false;
        this.state.projectRequestBusy = false;
    }

    async submitProjectRequest() {
        const form = this.state.projectRequestForm;
        if (!form.projectName?.trim()) {
            this.setAuthFeedback('Project name is required.', 'error');
            return false;
        }

        this.state.projectRequestBusy = true;
        try {
            await approvalService.createProjectRequest({
                projectName: form.projectName.trim(),
                description: form.description.trim(),
                deadline: form.deadline || null,
                priority: form.priority,
                requiredTeamSize: parseInt(form.requiredTeamSize) || 1,
                notes: form.notes.trim(),
                department: this.state.currentUser?.department || 'Engineering'
            });

            this.closeProjectRequestModal();
            await this.loadDashboardData(this.state.currentUser.id, 'TEAM_LEADER');
            this.setAuthFeedback('Project request submitted. Awaiting manager approval.', 'success');
            return true;
        } catch (e) {
            this.setAuthFeedback(e.message || 'Could not submit project request.', 'error');
            console.error('Project request error:', e);
            return false;
        } finally {
            this.state.projectRequestBusy = false;
        }
    }

    // ==========================================================
    // TL: Task Creation Workflow (NEW)
    // ==========================================================

    openCreateTaskModal(projectId) {
        this.state.showCreateTaskModal = true;
        this.state.createTaskBusy = false;
        this.state.createTaskProjectId = projectId;
        this.state.createTaskForm = {
            name: '',
            description: '',
            deadline: '',
            priority: 'MEDIUM',
            githubRepoLink: '',
            assignedEmployeeId: null,
            subtasks: []
        };
        this.setAuthFeedback();
    }

    closeCreateTaskModal() {
        this.state.showCreateTaskModal = false;
        this.state.createTaskBusy = false;
        this.state.createTaskProjectId = null;
    }

    addSubtaskToForm() {
        this.state.createTaskForm.subtasks.push({
            name: '',
            description: ''
        });
    }

    removeSubtaskFromForm(index) {
        this.state.createTaskForm.subtasks.splice(index, 1);
    }

    async submitNewTask() {
        const form = this.state.createTaskForm;
        if (!form.name?.trim()) {
            this.setAuthFeedback('Task name is required.', 'error');
            return false;
        }

        const projectId = this.state.createTaskProjectId;
        if (!projectId) {
            this.setAuthFeedback('No project selected.', 'error');
            return false;
        }

        // Find project name for the task record.
        const project = (this.state.projects || []).find(p => p.id === projectId);

        this.state.createTaskBusy = true;
        try {
            // Build subtask array with proper structure.
            const subtasks = form.subtasks
                .filter(s => s.name?.trim())
                .map((s, idx) => ({
                    id: idx + 1,
                    name: s.name.trim(),
                    description: s.description?.trim() || '',
                    completedByEmployee: false,
                    approvedByAdmin: false,
                    completedAt: null,
                    employeeComment: null
                }));

            const taskData = {
                name: form.name.trim(),
                description: form.description.trim(),
                deadline: form.deadline || null,
                priority: form.priority || 'MEDIUM',
                githubRepoLink: form.githubRepoLink?.trim() || null,
                projectName: project?.name || 'Project',
                subtasks
            };

            const created = await taskService.createTask(projectId, taskData);

            // If an employee was selected, assign the task.
            if (form.assignedEmployeeId) {
                await taskService.assignTask(created.id, parseInt(form.assignedEmployeeId));
            }

            this.closeCreateTaskModal();
            await this.loadDashboardData(this.state.currentUser.id, 'TEAM_LEADER');
            this.setAuthFeedback('Task created successfully.', 'success');
            return true;
        } catch (e) {
            this.setAuthFeedback(e.message || 'Could not create task.', 'error');
            console.error('Create task error:', e);
            return false;
        } finally {
            this.state.createTaskBusy = false;
        }
    }

    // ==========================================================
    // TL: Employee Assignment Workflow (NEW)
    // ==========================================================

    async openAssignEmployeeModal(projectId) {
        this.state.assignEmployeeProjectId = projectId;
        this.state.showAssignEmployeeModal = true;

        // Refresh the available employees and project contributor lists.
        try {
            this.state.availableEmployees = await userService.getAvailableEmployees();
            const project = (this.state.projects || []).find(p => p.id === projectId);
            this.state.projectContributors = project?.contributors || [];
        } catch (e) {
            console.error('Load employees error:', e);
        }
    }

    closeAssignEmployeeModal() {
        this.state.showAssignEmployeeModal = false;
        this.state.assignEmployeeProjectId = null;
    }

    async assignEmployeeToProject(employeeId) {
        const projectId = this.state.assignEmployeeProjectId;
        if (!projectId) return;

        this.state.actionLoading = true;
        try {
            const updatedProject = await approvalService.addContributors(projectId, [parseInt(employeeId)]);
            this.state.projectContributors = updatedProject?.contributors || [];

            // Refresh dashboard so project contributor counts update.
            await this.loadDashboardData(this.state.currentUser.id, 'TEAM_LEADER');

            // Re-open modal state with updated data.
            const project = (this.state.projects || []).find(p => p.id === projectId);
            this.state.projectContributors = project?.contributors || [];
            this.state.assignEmployeeProjectId = projectId;
            this.state.showAssignEmployeeModal = true;

            this.setAuthFeedback('Employee assigned to project.', 'success');
        } catch (e) {
            this.setAuthFeedback(e.message || 'Could not assign employee.', 'error');
        } finally {
            this.state.actionLoading = false;
        }
    }

    async removeEmployeeFromProject(employeeId) {
        const projectId = this.state.assignEmployeeProjectId;
        if (!projectId) return;

        this.state.actionLoading = true;
        try {
            const updatedProject = await approvalService.removeContributor(projectId, parseInt(employeeId));
            this.state.projectContributors = updatedProject?.contributors || [];

            await this.loadDashboardData(this.state.currentUser.id, 'TEAM_LEADER');

            const project = (this.state.projects || []).find(p => p.id === projectId);
            this.state.projectContributors = project?.contributors || [];
            this.state.assignEmployeeProjectId = projectId;
            this.state.showAssignEmployeeModal = true;

            this.setAuthFeedback('Employee removed from project.', 'success');
        } catch (e) {
            this.setAuthFeedback(e.message || 'Could not remove employee.', 'error');
        } finally {
            this.state.actionLoading = false;
        }
    }

    // ==========================================================
    // Manager: Project Request Approval/Rejection (NEW)
    // ==========================================================

    async approveProjectRequest(requestId) {
        this.state.actionLoading = true;
        try {
            await approvalService.approveProjectRequest(requestId);
            await this.loadDashboardData(this.state.currentUser.id, 'MANAGER');
            this.setAuthFeedback('Project request approved. New project created.', 'success');
            return true;
        } catch (e) {
            this.setAuthFeedback(e.message || 'Could not approve project request.', 'error');
            return false;
        } finally {
            this.state.actionLoading = false;
        }
    }

    openRejectProjectRequestInput(requestId) {
        this.state.rejectProjectRequestId = requestId;
        this.state.rejectProjectRequestReason = '';
    }

    cancelRejectProjectRequest() {
        this.state.rejectProjectRequestId = null;
        this.state.rejectProjectRequestReason = '';
    }

    async rejectProjectRequest(requestId) {
        this.state.actionLoading = true;
        try {
            const reason = this.state.rejectProjectRequestReason?.trim() || 'No reason provided';
            await approvalService.rejectProjectRequest(requestId, reason);
            this.state.rejectProjectRequestId = null;
            this.state.rejectProjectRequestReason = '';
            await this.loadDashboardData(this.state.currentUser.id, 'MANAGER');
            this.setAuthFeedback('Project request rejected.', 'success');
            return true;
        } catch (e) {
            this.setAuthFeedback(e.message || 'Could not reject project request.', 'error');
            return false;
        } finally {
            this.state.actionLoading = false;
        }
    }

    // ==========================================================
    // Manager: Administration (Managers)
    // ==========================================================

    openCreateManagerModal() {
        this.state.showCreateManagerModal = true;
        this.state.createManagerForm = {
            fullName: '',
            email: '',
            password: ''
        };
    }

    closeCreateManagerModal() {
        this.state.showCreateManagerModal = false;
        this.state.createManagerBusy = false;
    }

    async submitCreateManager() {
        if (this.state.createManagerBusy) return;
        this.state.createManagerBusy = true;
        try {
            await userService.createManager(this.state.createManagerForm);
            this.state.managers = await userService.getManagers();
            this.closeCreateManagerModal();
        } catch (error) {
            console.error('Failed to create manager:', error);
            alert(error.message);
        } finally {
            this.state.createManagerBusy = false;
        }
    }
}

// Instantiate a singleton controller linked to our model
export const appController = new RwmsController(appModel);

export default appController;
