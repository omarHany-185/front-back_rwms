/**
 * RoleDashboard.js - Single page dashboard that changes content by role
 */

import appController from '../controllers/Controller.js';

const ROLE_LABELS = {
    MANAGER: 'Manager',
    TEAM_LEADER: 'Team Leader',
    EMPLOYEE: 'Employee'
};

function normalizeRole(role = 'EMPLOYEE') {
    return String(role || 'EMPLOYEE').trim().toUpperCase().replace(/\s+/g, '_');
}

function roleLabel(role = 'EMPLOYEE') {
    return ROLE_LABELS[normalizeRole(role)] || 'Employee';
}

function formatDuration(totalSeconds = 0) {
    const safeSeconds = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    }

    if (minutes > 0) {
        return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
    }

    return `${seconds}s`;
}

function toBadgeClass(status = '') {
    const normalized = String(status || '').trim().toUpperCase().replace(/\s+/g, '_');

    if (normalized.includes('APPROVED') || normalized === 'ACTIVE' || normalized === 'COMPLETED') {
        return 'badge-active';
    }

    if (normalized.includes('IN_PROGRESS') || normalized.includes('PENDING') || normalized.includes('BREAK')) {
        return 'badge-pending';
    }

    if (normalized.includes('REJECTED') || normalized.includes('OFFLINE')) {
        return 'badge-rejected';
    }

    if (normalized.includes('SUBMITTED')) {
        return 'badge-pending';
    }

    if (normalized.includes('HIGH')) {
        return 'badge-rejected';
    }

    if (normalized.includes('LOW')) {
        return 'badge-active';
    }

    return 'badge-active';
}

function safeList(value) {
    return Array.isArray(value) ? value : [];
}

function truncateText(text, length) {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
}

const SUBMIT_TRIGGER_SECONDS = 30;

const InteractiveRoleDashboard = {
    name: 'RoleDashboard',
    props: {
        user: {
            type: Object,
            required: true
        },
        state: {
            type: Object,
            required: true
        }
    },
    data() {
        return {
            tlSearch: '',
            showTaskDetailsModal: false,
            selectedTaskDetails: null
        };
    },
    computed: {
        roleNorm() {
            return normalizeRole(this.user?.role || this.state.currentRole || 'EMPLOYEE');
        },
        userDisplayName() {
            return this.user?.name || this.user?.fullName || 'RWMS user';
        },
        userInitials() {
            const name = this.userDisplayName.trim();
            if (!name) return 'RW';
            return name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map(part => part[0]?.toUpperCase() || '')
                .join('') || 'RW';
        },
        assignedTasks() {
            return safeList(this.state.assignedTasks);
        },
        activeTask() {
            return this.state.activeTask;
        },
        canSubmitActiveTask() {
            if (!this.activeTask?.subtasks?.length) return false;
            return this.activeTask.subtasks.every(s => s.completedByEmployee === true);
        },
        pendingSubmissions() {
            return safeList(this.state.pendingSubmissions);
        },
        filteredPendingSubmissions() {
            const q = this.tlSearch.trim().toLowerCase();
            const base = this.pendingSubmissions.slice().sort((a, b) =>
                new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0)
            );

            if (!q) return base;

            return base.filter(s => {
                const emp = String(s.employeeName || '').toLowerCase();
                const task = String(s.taskName || '').toLowerCase();
                return emp.includes(q) || task.includes(q);
            });
        },
        // Employees not yet in the current project
        unassignedEmployees() {
            const contributors = safeList(this.state.projectContributors);
            const contribIds = new Set(contributors.map(c => c.id));
            return safeList(this.state.availableEmployees).filter(e => !contribIds.has(e.id));
        },
        // For the create-task modal: contributors of the selected project
        projectContributorsForTask() {
            const projectId = this.state.createTaskProjectId;
            if (!projectId) return [];
            const project = safeList(this.state.projects).find(p => p.id === projectId);
            return safeList(project?.contributors);
        }
    },
    methods: {
        // Expose module helpers to the template.
        safeList: (v) => safeList(v),
        formatDuration: (v) => formatDuration(v),
        truncateText: (v, l) => truncateText(v, l),
        badgeClassFor(status) {
            return toBadgeClass(status);
        },
        priorityLabel(p) {
            return (p || 'MEDIUM').toUpperCase();
        },
        openTask(taskId) {
            appController.openTask(taskId);
        },
        openTaskDetails(task) {
            this.selectedTaskDetails = task;
            this.showTaskDetailsModal = true;
        },
        closeTaskDetails() {
            this.showTaskDetailsModal = false;
            this.selectedTaskDetails = null;
        },
        startShift() {
            const id = this.activeTask?.id;
            if (!id) return;
            appController.startShift(id);
        },
        pauseShift() {
            appController.pauseShift();
        },
        endShiftAndMaybeSubmit() {
            appController.stopTimer();
            if (this.canSubmitActiveTask) {
                appController.openSubmissionModal();
            }
        },
        async toggleSubtask(subtaskId) {
            await appController.toggleSubtask(subtaskId);
        },
        openSubmissionModal() {
            appController.openSubmissionModal();
        },
        closeSubmissionModal() {
            appController.closeSubmissionModal();
        },
        async submitActiveTask() {
            await appController.submitActiveTask();
        },
        async openReview(submissionId) {
            await appController.openReviewSubmission(submissionId);
        },
        setReviewAction(action) {
            this.state.reviewForm.action = action;
        },
        async quickReview(submissionId, action) {
            await appController.openReviewSubmission(submissionId);
            this.state.reviewForm.action = action;
            await appController.reviewActiveSubmission();
        },
        async addReviewComment() {
            await appController.addReviewComment();
        },
        closeReview() {
            appController.closeReviewModal();
        },
        reviewActiveSubmission() {
            return appController.reviewActiveSubmission();
        },
        approveAllPending() {
            appController.approveAllPending();
        },
        approvePendingAdmin(userId, employeeId) {
            appController.approvePendingAdmin(userId, employeeId);
        },
        rejectPendingAdmin(userId) {
            appController.rejectPendingAdmin(userId);
        },
        approveTLRequest(requestId) {
            appController.approveTLRequest(requestId);
        },
        rejectTLRequest(requestId) {
            appController.rejectTLRequest(requestId);
        },
        syncTimerManual() {
            if (!this.state.timerRunning) return;
            this.state.shiftTime += 5;
            this.state.activeWorkTime += 5;
            if (this.state.shiftTime >= SUBMIT_TRIGGER_SECONDS) {
                appController.stopTimer();
                if (this.canSubmitActiveTask) {
                    appController.openSubmissionModal();
                }
            }
        },
        // NEW: TL project request
        openProjectRequestModal() {
            appController.openProjectRequestModal();
        },
        closeProjectRequestModal() {
            appController.closeProjectRequestModal();
        },
        submitProjectRequest() {
            return appController.submitProjectRequest();
        },
        // NEW: TL task creation
        openCreateTaskModal(projectId) {
            appController.openCreateTaskModal(projectId);
        },
        closeCreateTaskModal() {
            appController.closeCreateTaskModal();
        },
        addSubtaskToForm() {
            appController.addSubtaskToForm();
        },
        removeSubtaskFromForm(index) {
            appController.removeSubtaskFromForm(index);
        },
        submitNewTask() {
            return appController.submitNewTask();
        },
        // NEW: TL employee assignment
        openAssignEmployeeModal(projectId) {
            appController.openAssignEmployeeModal(projectId);
        },
        closeAssignEmployeeModal() {
            appController.closeAssignEmployeeModal();
        },
        assignEmployeeToProject(employeeId) {
            appController.assignEmployeeToProject(employeeId);
        },
        removeEmployeeFromProject(employeeId) {
            appController.removeEmployeeFromProject(employeeId);
        },
        // NEW: Manager project request
        approveProjectRequest(requestId) {
            appController.approveProjectRequest(requestId);
        },
        openRejectProjectRequestInput(requestId) {
            appController.openRejectProjectRequestInput(requestId);
        },
        cancelRejectProjectRequest() {
            appController.cancelRejectProjectRequest();
        },
        rejectProjectRequest(requestId) {
            appController.rejectProjectRequest(requestId);
        },
        openCreateManagerModal() {
            appController.openCreateManagerModal();
        },
        closeCreateManagerModal() {
            appController.closeCreateManagerModal();
        },
        submitCreateManager() {
            appController.submitCreateManager();
        }
    },
    template: `
      <section class="dashboard-shell">
        <div v-if="state.dashboardLoading" class="container dashboard-container">
          <div class="rwms-loading-skeleton">
            <div class="rwms-loading-pulse"></div>
            <div class="rwms-loading-text">Loading dashboard data...</div>
          </div>
        </div>
        <div v-else class="container dashboard-container">
          <div v-if="state.authMessage" :class="['alert', 'alert-' + state.authMessageType]" style="margin-bottom: 1rem;">
            {{ state.authMessage }}
          </div>
          <header class="dashboard-hero card">
            <div class="dashboard-hero-copy">
              <span class="section-eyebrow">
                {{ roleNorm === 'MANAGER' ? 'Manager workspace' : (roleNorm === 'TEAM_LEADER' ? 'Team leader workspace' : 'Employee workspace') }}
              </span>
              <h1>
                {{ roleNorm === 'MANAGER'
                  ? 'Manager dashboard for ' + userDisplayName
                  : (roleNorm === 'TEAM_LEADER'
                      ? 'Team Leader dashboard for ' + userDisplayName
                      : 'Employee dashboard for ' + userDisplayName) }}
              </h1>
              <p v-if="roleNorm === 'EMPLOYEE'">Track your assigned tasks, keep the timer, and submit completed work for review.</p>
              <p v-else-if="roleNorm === 'TEAM_LEADER'">Manage projects, assign tasks to employees, and review submissions.</p>
              <p v-else>Approve registrations, review project requests, and oversee your organization.</p>

              <div class="dashboard-tag-row">
                <span v-if="roleNorm === 'EMPLOYEE'" class="dashboard-chip">Tasks</span>
                <span v-if="roleNorm === 'EMPLOYEE'" class="dashboard-chip">Timer</span>
                <span v-if="roleNorm === 'EMPLOYEE'" class="dashboard-chip">Submissions</span>

                <span v-if="roleNorm === 'TEAM_LEADER'" class="dashboard-chip">Review queue</span>
                <span v-if="roleNorm === 'TEAM_LEADER'" class="dashboard-chip">Projects</span>
                <span v-if="roleNorm === 'TEAM_LEADER'" class="dashboard-chip">Team</span>

                <span v-if="roleNorm === 'MANAGER'" class="dashboard-chip">Approvals</span>
                <span v-if="roleNorm === 'MANAGER'" class="dashboard-chip">Project requests</span>
              </div>
            </div>

            <div class="dashboard-user-card">
              <div class="dashboard-avatar">{{ userInitials }}</div>
              <div>
                <span class="dashboard-user-label">Signed in as</span>
                <h2>{{ userDisplayName }}</h2>
                <p>{{ roleNorm === 'TEAM_LEADER' ? 'Team Leader' : (roleNorm === 'MANAGER' ? 'Manager' : 'Employee') }} dashboard</p>
              </div>
            </div>
          </header>

          <section class="dashboard-metrics">
            <article v-if="roleNorm === 'EMPLOYEE'" class="card dashboard-metric-card">
              <span class="dashboard-metric-label">Assigned tasks</span>
              <strong class="dashboard-metric-value">{{ assignedTasks.length }}</strong>
              <p class="dashboard-metric-hint">Work items currently in your queue</p>
            </article>
            <article v-if="roleNorm === 'EMPLOYEE'" class="card dashboard-metric-card">
              <span class="dashboard-metric-label">Submitted</span>
              <strong class="dashboard-metric-value">{{ assignedTasks.filter(t => String(t.status) === 'SUBMITTED').length }}</strong>
              <p class="dashboard-metric-hint">Waiting for review</p>
            </article>
            <article v-if="roleNorm === 'EMPLOYEE'" class="card dashboard-metric-card">
              <span class="dashboard-metric-label">My projects</span>
              <strong class="dashboard-metric-value">{{ safeList(state.myProjects).length }}</strong>
              <p class="dashboard-metric-hint">Projects you contribute to</p>
            </article>

            <article v-if="roleNorm === 'TEAM_LEADER'" class="card dashboard-metric-card">
              <span class="dashboard-metric-label">Pending submissions</span>
              <strong class="dashboard-metric-value">{{ pendingSubmissions.filter(s => String(s.reviewStatus) === 'PENDING').length }}</strong>
              <p class="dashboard-metric-hint">Items waiting for review</p>
            </article>
            <article v-if="roleNorm === 'TEAM_LEADER'" class="card dashboard-metric-card">
              <span class="dashboard-metric-label">Projects</span>
              <strong class="dashboard-metric-value">{{ safeList(state.projects).length }}</strong>
              <p class="dashboard-metric-hint">Projects in your ownership</p>
            </article>
            <article v-if="roleNorm === 'TEAM_LEADER'" class="card dashboard-metric-card">
              <span class="dashboard-metric-label">Team members</span>
              <strong class="dashboard-metric-value">{{ safeList(state.teamMembers).length }}</strong>
              <p class="dashboard-metric-hint">Contributors in your workspace</p>
            </article>

            <article v-if="roleNorm === 'MANAGER'" class="card dashboard-metric-card">
              <span class="dashboard-metric-label">Pending approvals</span>
              <strong class="dashboard-metric-value">{{ safeList(state.pendingApprovals).length }}</strong>
              <p class="dashboard-metric-hint">Registrations waiting for action</p>
            </article>
            <article v-if="roleNorm === 'MANAGER'" class="card dashboard-metric-card">
              <span class="dashboard-metric-label">Project requests</span>
              <strong class="dashboard-metric-value">{{ safeList(state.pendingProjectRequests).length }}</strong>
              <p class="dashboard-metric-hint">TL project proposals to review</p>
            </article>
            <article v-if="roleNorm === 'MANAGER'" class="card dashboard-metric-card">
              <span class="dashboard-metric-label">Active projects</span>
              <strong class="dashboard-metric-value">{{ safeList(state.projects).length }}</strong>
              <p class="dashboard-metric-hint">Projects in the organization</p>
            </article>
          </section>

          <!-- EMPLOYEE -->
          <section v-if="roleNorm === 'EMPLOYEE'" class="dashboard-panels">
            <article class="card dashboard-panel">
              <div class="dashboard-panel-header">
                <div>
                  <span class="section-eyebrow">Task queue</span>
                  <h3>Your assigned work</h3>
                </div>
                <p>Open a task to view subtasks and submit when complete.</p>
              </div>

              <div class="dashboard-list">
                <article v-if="activeTask" class="dashboard-list-item">
                  <div class="dashboard-list-item-copy">
                    <h4>Current focus: {{ activeTask.name }}</h4>
                    <p>{{ activeTask.description }}</p>
                    <small>
                      {{ safeList(activeTask.subtasks).length }} subtasks • Timer {{ state.timerStatus || 'Not Started' }}
                    </small>
                  </div>
                  <span class="badge badge-active">{{ activeTask.status || 'ACTIVE' }}</span>
                </article>

                <article v-if="activeTask" class="card subtask-card">
                  <h4 class="modal-title">Subtasks</h4>
                  <div class="subtasks-list">
                    <div v-for="s in safeList(activeTask.subtasks)" :key="s.id" class="subtask-item">
                      <input
                        type="checkbox"
                        :checked="s.completedByEmployee === true"
                        :disabled="s.completedByEmployee === true"
                        @change="toggleSubtask(s.id)"
                      />
                      <span :class="{ completed: s.completedByEmployee === true }">{{ s.name }}</span>
                    </div>
                  </div>

                  <div class="timer-actions">
                    <button class="btn btn-primary" type="button" @click="startShift" :disabled="state.timerRunning || !activeTask">
                      Start timer
                    </button>
                    <button class="btn btn-secondary" type="button" @click="openSubmissionModal" :disabled="!canSubmitActiveTask || state.timerRunning">
                      Submit task
                    </button>
                  </div>
                </article>

                <article v-if="!activeTask" class="no-active-task">
                  Select a task to begin.
                </article>

                <article
                  v-for="t in assignedTasks"
                  :key="t.id"
                  class="dashboard-list-item"
                >
                  <div class="dashboard-list-item-copy" style="max-width: 100%; overflow: hidden;">
                    <h4>{{ t.name }}</h4>
                    <p style="word-wrap: break-word; overflow-wrap: break-word; word-break: break-word;">{{ truncateText(t.description, 40) }}</p>
                    <small v-if="t.projectName || t.deadline">
                      {{ t.projectName || 'Project' }} • {{ t.deadline || '' }}
                    </small>
                  </div>
                  <div class="actions-row">
                    <span class="badge" :class="badgeClassFor(t.status)">{{ t.status }}</span>
                    <button class="btn btn-sm btn-secondary" type="button" @click="openTaskDetails(t)">Details</button>
                    <button class="btn btn-sm btn-primary" type="button" @click="openTask(t.id)">Open</button>
                  </div>
                </article>
              </div>
            </article>

            <article class="card dashboard-panel">
              <div class="dashboard-panel-header">
                <div>
                  <span class="section-eyebrow">Timer snapshot</span>
                  <h3>Work session status</h3>
                </div>
                <p>Simulated timer workflow and session lifecycle.</p>
              </div>

              <div class="dashboard-list">
                <article class="dashboard-list-item">
                  <div class="dashboard-list-item-copy">
                    <h4>Shift duration</h4>
                    <p>{{ formatDuration(state.shiftTime) }}</p>
                    <small>Total elapsed session time</small>
                  </div>
                  <span :class="['badge', state.timerRunning ? 'badge-active' : 'badge-pending']">{{ state.timerRunning ? 'RUNNING' : 'READY' }}</span>
                </article>

                <article class="dashboard-list-item">
                  <div class="dashboard-list-item-copy">
                    <h4>Focused work</h4>
                    <p>{{ formatDuration(state.activeWorkTime) }}</p>
                    <small>Time logged on active tasks</small>
                  </div>
                  <span class="badge badge-completed">SYNCED</span>
                </article>

                <article class="dashboard-list-item">
                  <div class="dashboard-list-item-copy">
                    <h4>Break balance</h4>
                    <p>{{ formatDuration(state.breakTime) }}</p>
                    <small>Keep break usage visible during the day</small>
                  </div>
                  <span class="badge badge-warning">BREAK</span>
                </article>
              </div>

              <div class="timer-actions">
                <button class="btn btn-primary" type="button" @click="startShift" :disabled="state.timerRunning || !activeTask">Start</button>
                <button class="btn btn-secondary" type="button" @click="pauseShift" :disabled="!state.timerRunning">Pause</button>
                <button class="btn btn-secondary" type="button" @click="endShiftAndMaybeSubmit" :disabled="!state.timerRunning">End & Submit</button>
              </div>
            </article>

            <!-- Employee: My Projects -->
            <article class="card dashboard-panel">
              <div class="dashboard-panel-header">
                <div>
                  <span class="section-eyebrow">Project membership</span>
                  <h3>Projects you contribute to</h3>
                </div>
                <p>Your team leader assigned you to these projects.</p>
              </div>

              <div class="dashboard-list">
                <article
                  v-for="p in safeList(state.myProjects)"
                  :key="p.id"
                  class="dashboard-list-item"
                >
                  <div class="dashboard-list-item-copy">
                    <h4>{{ p.name }}</h4>
                    <p>{{ p.description }}</p>
                    <small>Team leader: {{ p.teamLeader?.fullName || 'Unassigned' }} • {{ safeList(p.contributors).length }} contributors</small>
                  </div>
                  <span class="badge badge-active">ACTIVE</span>
                </article>
                <article v-if="!safeList(state.myProjects).length" class="no-active-task">
                  Not assigned to any projects yet.
                </article>
              </div>
            </article>
          </section>

          <!-- TEAM LEADER -->
          <section v-else-if="roleNorm === 'TEAM_LEADER'" class="dashboard-panels">
            <!-- TL: Submission Review -->
            <article class="card dashboard-panel">
              <div class="dashboard-panel-header">
                <div>
                  <span class="section-eyebrow">Review queue</span>
                  <h3>Submissions awaiting action</h3>
                </div>
                <p>Approve, reject, or add a review comment.</p>
              </div>

              <div>
                <div class="form-group">
                  <label>Filter submissions</label>
                  <input v-model="tlSearch" type="text" placeholder="Search by employee or task..." />
                </div>
              </div>

              <div class="dashboard-list">
                <article
                  v-for="s in filteredPendingSubmissions"
                  :key="s.id"
                  class="dashboard-list-item"
                >
                  <div class="dashboard-list-item-copy">
                    <h4>{{ s.taskName }}</h4>
                    <p>Submitted by {{ s.employeeName }}</p>
                    <small>{{ s.submittedAt }}</small>
                  </div>
                  <div class="actions-row">
                    <span class="badge" :class="badgeClassFor(s.reviewStatus)">{{ s.reviewStatus }}</span>
                    <button class="btn btn-sm btn-primary" type="button" @click="quickReview(s.id, 'APPROVED')">Approve</button>
                    <button class="btn btn-sm btn-secondary" type="button" @click="quickReview(s.id, 'REJECTED')">Reject</button>
                    <button class="btn btn-sm btn-secondary" type="button" @click="openReview(s.id)">Details</button>
                  </div>
                </article>
                <article v-if="!filteredPendingSubmissions.length" class="no-active-task">
                  No pending submissions right now.
                </article>
              </div>
            </article>

            <!-- TL: Projects with Actions -->
            <article class="card dashboard-panel">
              <div class="dashboard-panel-header">
                <div>
                  <span class="section-eyebrow">Project tracker</span>
                  <h3>Projects in progress</h3>
                </div>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                  <p>Projects under your ownership.</p>
                  <button class="btn btn-sm btn-primary" type="button" @click="openProjectRequestModal">+ Request new project</button>
                </div>
              </div>

              <div class="dashboard-list">
                <article
                  v-for="p in safeList(state.projects)"
                  :key="p.id"
                  class="dashboard-list-item"
                >
                  <div class="dashboard-list-item-copy">
                    <h4>{{ p.name }}</h4>
                    <p>{{ p.description }}</p>
                    <small>{{ safeList(p.contributors).length }} contributors</small>
                  </div>
                  <div class="actions-row">
                    <span class="badge badge-active">ACTIVE</span>
                    <button class="btn btn-sm btn-secondary" type="button" @click="openAssignEmployeeModal(p.id)">Manage team</button>
                    <button class="btn btn-sm btn-secondary" type="button" @click="openCreateTaskModal(p.id)">Create task</button>
                  </div>
                </article>
                <article v-if="!safeList(state.projects).length" class="no-active-task">
                  No projects yet. Request one to get started.
                </article>
              </div>
            </article>

            <!-- TL: My Project Requests (status tracker) -->
            <article class="card dashboard-panel">
              <div class="dashboard-panel-header">
                <div>
                  <span class="section-eyebrow">Request tracker</span>
                  <h3>My project requests</h3>
                </div>
                <p>Track the status of your project proposals.</p>
              </div>

              <div class="dashboard-list">
                <article
                  v-for="r in safeList(state.myProjectRequests)"
                  :key="r.id"
                  class="dashboard-list-item"
                >
                  <div class="dashboard-list-item-copy">
                    <h4>{{ r.projectName }}</h4>
                    <p>{{ r.description }}</p>
                    <small>
                      {{ r.priority }} priority • Team size: {{ r.requiredTeamSize }} • Deadline: {{ r.deadline || 'None' }}
                    </small>
                    <small v-if="r.status === 'REJECTED' && r.rejectionReason" style="color: #dc2626;">
                      Rejection reason: {{ r.rejectionReason }}
                    </small>
                  </div>
                  <span class="badge" :class="badgeClassFor(r.status)">{{ r.status }}</span>
                </article>
                <article v-if="!safeList(state.myProjectRequests).length" class="no-active-task">
                  No project requests submitted yet.
                </article>
              </div>
            </article>

            <!-- TL: Team Status -->
            <article class="card dashboard-panel">
              <div class="dashboard-panel-header">
                <div>
                  <span class="section-eyebrow">Contributor health</span>
                  <h3>Team status at a glance</h3>
                </div>
                <p>Contributor overview in your workspace.</p>
              </div>

              <div class="dashboard-list">
                <article
                  v-for="m in safeList(state.teamMembers)"
                  :key="m.id || m.email"
                  class="dashboard-list-item"
                >
                  <div class="dashboard-list-item-copy">
                    <h4>{{ m.name }}</h4>
                    <p>Completion: {{ m.completionRate ?? 0 }}%</p>
                    <small>{{ m.status || 'Active' }}</small>
                  </div>
                  <span class="badge" :class="badgeClassFor(m.status)">{{ m.status || 'ACTIVE' }}</span>
                </article>
                <article v-if="!safeList(state.teamMembers).length" class="no-active-task">
                  No team members yet. Assign employees to your projects.
                </article>
              </div>
            </article>
          </section>

          <!-- MANAGER -->
          <section v-else class="dashboard-panels">
            <!-- Manager: Pending Registrations -->
            <article class="card dashboard-panel">
              <div class="dashboard-panel-header">
                <div>
                  <span class="section-eyebrow">Approval queue</span>
                  <h3>Pending registrations</h3>
                </div>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                  <p>Approve or reject new accounts before they can sign in.</p>
                  <button v-if="safeList(state.pendingApprovals).length > 0" class="btn btn-sm btn-primary" type="button" @click="approveAllPending">Approve All</button>
                </div>
              </div>

              <div class="dashboard-list">
                <article
                  v-for="u in safeList(state.pendingApprovals)"
                  :key="u.id"
                  class="dashboard-list-item"
                >
                  <div class="dashboard-list-item-copy">
                    <h4>{{ u.fullName || u.name }}</h4>
                    <p>{{ u.email }}</p>
                    <small style="display: flex; gap: 0.5rem; margin-top: 0.25rem;">
                      <span class="badge" :class="u.role === 'TEAM_LEADER' ? 'badge-pending' : 'badge-completed'">
                        {{ u.role === 'TEAM_LEADER' ? 'Team Leader' : (u.role === 'EMPLOYEE' ? 'Employee' : u.role) }}
                      </span>
                      <span v-if="u.department" class="badge badge-active" style="background-color: var(--rwms-border);">
                        {{ u.department }}
                      </span>
                    </small>
                  </div>
                  <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap: wrap;">
                    <div style="display:flex; flex-direction:column; gap:0.25rem; align-items: flex-start;">
                      <label style="font-size:0.7rem; color:var(--rwms-text-muted); font-weight:600; text-transform: uppercase; letter-spacing: 0.05em;">Assign ID</label>
                      <input
                        type="text"
                        v-model="u.employeeIdInput"
                        placeholder="EMP-XXX"
                        style="width: 90px; padding: 0.25rem 0.5rem; font-size: 0.8rem; border-radius: 4px; border: 1px solid var(--rwms-border); font-family: monospace;"
                      />
                    </div>
                    <div style="display:flex; gap:0.5rem;">
                      <button class="btn btn-sm btn-primary" type="button" @click="approvePendingAdmin(u.id, u.employeeIdInput)">Approve</button>
                      <button class="btn btn-sm btn-secondary" type="button" @click="rejectPendingAdmin(u.id)">Reject</button>
                    </div>
                  </div>
                </article>
                <article v-if="!safeList(state.pendingApprovals).length" class="no-active-task">
                  No pending registrations.
                </article>
              </div>
            </article>

            <!-- Manager: Project Requests (RENAMED from "Leadership Requests") -->
            <article class="card dashboard-panel">
              <div class="dashboard-panel-header">
                <div>
                  <span class="section-eyebrow">Project requests</span>
                  <h3>Team leader project proposals</h3>
                </div>
                <p>Review, approve, or reject project requests from team leaders.</p>
              </div>

              <div class="dashboard-list">
                <article
                  v-for="r in safeList(state.pendingProjectRequests)"
                  :key="r.id"
                  class="dashboard-list-item"
                >
                  <div class="dashboard-list-item-copy">
                    <h4>{{ r.projectName }}</h4>
                    <p>{{ r.description }}</p>
                    <small>
                      Requested by {{ r.requesterName }} • {{ r.priority }} priority • Team size: {{ r.requiredTeamSize }} • Deadline: {{ r.deadline || 'None' }}
                    </small>
                    <small v-if="r.notes">Notes: {{ r.notes }}</small>
                  </div>
                  <div style="display:flex; flex-direction:column; gap:0.5rem; align-items:flex-end;">
                    <div style="display:flex; gap:0.5rem;">
                      <button class="btn btn-sm btn-primary" type="button" @click="approveProjectRequest(r.id)">Approve</button>
                      <button class="btn btn-sm btn-secondary" type="button" @click="openRejectProjectRequestInput(r.id)">Reject</button>
                    </div>
                    <!-- Inline rejection reason input -->
                    <div v-if="state.rejectProjectRequestId === r.id" style="display:flex; gap:0.5rem; width:100%;">
                      <input
                        type="text"
                        v-model="state.rejectProjectRequestReason"
                        placeholder="Reason for rejection..."
                        style="flex:1;"
                      />
                      <button class="btn btn-sm btn-secondary" type="button" @click="rejectProjectRequest(r.id)">Confirm</button>
                      <button class="btn btn-sm btn-secondary" type="button" @click="cancelRejectProjectRequest()">Cancel</button>
                    </div>
                  </div>
                </article>
                <article v-if="!safeList(state.pendingProjectRequests).length" class="no-active-task">
                  No pending project requests.
                </article>
              </div>
            </article>

            <!-- Manager: Project & Team Overview -->
            <article class="card dashboard-panel">
              <div class="dashboard-panel-header">
                <div>
                  <span class="section-eyebrow">Organization overview</span>
                  <h3>Projects and teams</h3>
                </div>
                <p>Active projects across the organization.</p>
              </div>

              <div class="dashboard-list">
                <article
                  v-for="p in safeList(state.projects)"
                  :key="p.id"
                  class="dashboard-list-item"
                >
                  <div class="dashboard-list-item-copy">
                    <h4>{{ p.name }}</h4>
                    <p>{{ p.description }}</p>
                    <small>{{ p.department }} • TL: {{ p.teamLeader?.fullName || 'Unassigned' }} • Contributors: {{ safeList(p.contributors).length }}</small>
                  </div>
                  <span class="badge badge-active">ACTIVE</span>
                </article>
                <article v-if="!safeList(state.projects).length" class="no-active-task">
                  No projects yet.
                </article>
              </div>
            </article>

            <!-- Manager: Organization Directory -->
            <article class="card dashboard-panel">
              <div class="dashboard-panel-header">
                <div>
                  <span class="section-eyebrow">Organization</span>
                  <h3>Member Directory</h3>
                </div>
                <p>Overview of active contributors and leaders in the system.</p>
              </div>

              <div class="dashboard-list">
                <article
                  v-for="m in safeList(state.teamMembers)"
                  :key="m.id || m.email"
                  class="dashboard-list-item"
                >
                  <div class="dashboard-list-item-copy">
                    <h4>{{ m.fullName || m.name }}</h4>
                    <p>{{ m.email }}</p>
                    <small style="display: flex; gap: 0.5rem; margin-top: 0.25rem;">
                      <span class="badge badge-active" style="background-color: var(--rwms-border);">
                        {{ m.role === 'ADMIN' || m.role === 'TEAM_LEADER' ? 'Team Leader' : m.role }}
                      </span>
                      <span v-if="m.employeeId && !m.employeeId.startsWith('TEMP-')" class="badge badge-completed">
                        {{ m.employeeId }}
                      </span>
                      <span v-if="m.department" class="badge badge-active" style="background-color: var(--rwms-border);">
                        {{ m.department }}
                      </span>
                    </small>
                  </div>
                  <span class="badge" :class="m.status === 'ACTIVE' ? 'badge-active' : 'badge-rejected'">
                    {{ m.status || 'ACTIVE' }}
                  </span>
                </article>
              </div>
            </article>
          </section>

          <section class="dashboard-summary card">
            <div>
              <span class="section-eyebrow">Next up</span>
              <h3>
                {{ roleNorm === 'EMPLOYEE' ? 'Submit completed work for review'
                  : (roleNorm === 'TEAM_LEADER' ? 'Create tasks and manage your team'
                  : 'Review project requests and approvals') }}
              </h3>
              <p>
                {{ roleNorm === 'EMPLOYEE' ? 'Complete all subtasks, run a short session, and submit.' :
                   (roleNorm === 'TEAM_LEADER' ? 'Request projects, assign employees, create tasks, and review submissions.' :
                    'Approve registrations and project requests to keep the organization moving.') }}
              </p>
            </div>
            <div class="dashboard-summary-actions">
              <span class="dashboard-chip dashboard-chip-soft">Interactive workflow</span>
            </div>
          </section>
        </div>

        <!-- EMPLOYEE SUBMISSION MODAL -->
        <div v-if="state.showSubmissionModal" class="rwms-modal-overlay" @click.self="closeSubmissionModal">
          <div class="rwms-modal card">
            <div class="rwms-modal-header">
              <div>
                <span class="section-eyebrow">Submission</span>
                <h3 class="modal-title">Submit: {{ activeTask?.name }}</h3>
                <p class="modal-subtitle">Waiting for review by your team leader.</p>
              </div>
              <button class="rwms-modal-close" type="button" @click="closeSubmissionModal" aria-label="Close">×</button>
            </div>

            <div class="rwms-modal-body">
              <div class="form-group">
                <label for="accomplishmentComment">Accomplishment comment</label>
                <textarea
                  id="accomplishmentComment"
                  v-model="state.submissionForm.accomplishmentComment"
                  placeholder="Describe what you completed..."
                ></textarea>
              </div>

              <div class="form-group">
                <label for="alternativeGithubLink">Alternative GitHub link (optional)</label>
                <input
                  id="alternativeGithubLink"
                  type="text"
                  v-model="state.submissionForm.alternativeGithubLink"
                  placeholder="https://github.com/... (optional)"
                />
              </div>

              <div class="form-group">
                <label for="submissionFile">Attachment (optional)</label>
                <input
                  id="submissionFile"
                  type="file"
                  @change="state.submissionForm.file = $event.target.files[0]"
                />
              </div>

              <div class="timer-actions">
                <button class="btn btn-primary" type="button" :disabled="state.submissionBusy" @click="submitActiveTask">
                  {{ state.submissionBusy ? 'Submitting...' : 'Submit' }}
                </button>
                <button class="btn btn-secondary" type="button" :disabled="state.submissionBusy" @click="closeSubmissionModal">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- TEAM LEADER REVIEW MODAL -->
        <div v-if="state.showReviewModal" class="rwms-modal-overlay" @click.self="closeReview">
          <div class="rwms-modal card">
            <div class="rwms-modal-header">
              <div>
                <span class="section-eyebrow">Review</span>
                <h3 class="modal-title">{{ state.activeSubmissionDetail?.taskName || 'Submission' }}</h3>
                <p class="modal-subtitle">Submitted by {{ state.activeSubmissionDetail?.employeeName }}</p>
              </div>
              <button class="rwms-modal-close" type="button" @click="closeReview" aria-label="Close">×</button>
            </div>

            <div class="rwms-modal-body">
              <div class="card review-detail-card">
                <h4 class="modal-title">Accomplishment</h4>
                <p>{{ state.activeSubmissionDetail?.accomplishmentComment }}</p>
                <p class="modal-subtitle">
                  Submitted at: {{ state.activeSubmissionDetail?.submittedAt }}
                </p>
                <p>
                  Status:
                  <span class="badge" :class="badgeClassFor(state.activeSubmissionDetail?.reviewStatus)">
                    {{ state.activeSubmissionDetail?.reviewStatus }}
                  </span>
                </p>
              </div>

              <div class="review-section">
                <div class="review-decision-grid">
                  <h4>Decision</h4>
                  <div class="timer-actions">
                    <button class="btn btn-primary" type="button" @click="setReviewAction('APPROVED')" :disabled="state.reviewBusy">
                      Approve
                    </button>
                    <button class="btn btn-secondary" type="button" @click="setReviewAction('REJECTED')" :disabled="state.reviewBusy">
                      Reject
                    </button>
                  </div>
                </div>

                <div v-if="state.reviewForm.action === 'APPROVED'">
                  <div class="form-group">
                    <label for="adminNote">Admin note (optional)</label>
                    <textarea id="adminNote" v-model="state.reviewForm.adminNote" placeholder="Feedback for the employee..."></textarea>
                  </div>
                </div>

                <div v-else>
                  <div class="form-group">
                    <label for="rejectionReason">Rejection reason</label>
                    <textarea id="rejectionReason" v-model="state.reviewForm.rejectionReason" placeholder="Explain what to revise..."></textarea>
                  </div>
                </div>

                <div class="review-comments-section">
                  <h4 class="modal-title">Comments</h4>
                  <div v-if="safeList(state.activeSubmissionDetail?.comments).length" class="dashboard-list">
                    <article v-for="c in safeList(state.activeSubmissionDetail?.comments)" :key="c.id" class="dashboard-list-item">
                      <div class="dashboard-list-item-copy">
                        <h4>{{ c.authorName }}</h4>
                        <p>{{ c.content }}</p>
                        <small>{{ c.createdAt }}</small>
                      </div>
                    </article>
                  </div>
                  <div v-else class="no-active-task">
                    No comments yet.
                  </div>

                  <div class="form-group">
                    <label for="reviewComment">Add a comment</label>
                    <textarea
                      id="reviewComment"
                      v-model="state.reviewForm.commentContent"
                      placeholder="Write a comment..."
                    ></textarea>
                  </div>

                  <button class="btn btn-secondary" type="button" :disabled="state.reviewBusy" @click="addReviewComment">
                    Add comment
                  </button>
                </div>
              </div>

              <div class="timer-actions">
                <button class="btn btn-primary" type="button" :disabled="state.reviewBusy" @click="reviewActiveSubmission">
                  {{ state.reviewBusy ? 'Saving...' : (state.reviewForm.action === 'APPROVED' ? 'Save approval' : 'Save rejection') }}
                </button>
                <button class="btn btn-secondary" type="button" :disabled="state.reviewBusy" @click="closeReview">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- TL: PROJECT REQUEST MODAL (NEW) -->
        <div v-if="state.showProjectRequestModal" class="rwms-modal-overlay" @click.self="closeProjectRequestModal">
          <div class="rwms-modal card">
            <div class="rwms-modal-header">
              <div>
                <span class="section-eyebrow">New project</span>
                <h3 class="modal-title">Request a new project</h3>
                <p class="modal-subtitle">Submit for manager approval before the project becomes active.</p>
              </div>
              <button class="rwms-modal-close" type="button" @click="closeProjectRequestModal" aria-label="Close">×</button>
            </div>

            <div class="rwms-modal-body">
              <div class="form-group">
                <label for="prName">Project name *</label>
                <input id="prName" type="text" v-model="state.projectRequestForm.projectName" placeholder="e.g. Mobile App MVP" />
              </div>
              <div class="form-group">
                <label for="prDesc">Description</label>
                <textarea id="prDesc" v-model="state.projectRequestForm.description" placeholder="What will this project deliver?"></textarea>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="prDeadline">Deadline</label>
                  <input id="prDeadline" type="date" v-model="state.projectRequestForm.deadline" />
                </div>
                <div class="form-group">
                  <label for="prPriority">Priority</label>
                  <select id="prPriority" v-model="state.projectRequestForm.priority">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="prSize">Team size</label>
                  <input id="prSize" type="number" min="1" max="50" v-model.number="state.projectRequestForm.requiredTeamSize" />
                </div>
              </div>
              <div class="form-group">
                <label for="prNotes">Notes (optional)</label>
                <textarea id="prNotes" v-model="state.projectRequestForm.notes" placeholder="Any additional context..."></textarea>
              </div>

              <div class="timer-actions">
                <button class="btn btn-primary" type="button" :disabled="state.projectRequestBusy" @click="submitProjectRequest">
                  {{ state.projectRequestBusy ? 'Submitting...' : 'Submit request' }}
                </button>
                <button class="btn btn-secondary" type="button" :disabled="state.projectRequestBusy" @click="closeProjectRequestModal">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- TL: TASK CREATION MODAL (NEW) -->
        <div v-if="state.showCreateTaskModal" class="rwms-modal-overlay" @click.self="closeCreateTaskModal">
          <div class="rwms-modal card">
            <div class="rwms-modal-header">
              <div>
                <span class="section-eyebrow">New task</span>
                <h3 class="modal-title">Create a task</h3>
                <p class="modal-subtitle">Add a task to the selected project and optionally assign it.</p>
              </div>
              <button class="rwms-modal-close" type="button" @click="closeCreateTaskModal" aria-label="Close">×</button>
            </div>

            <div class="rwms-modal-body">
              <div class="form-group">
                <label for="ctName">Task name *</label>
                <input id="ctName" type="text" v-model="state.createTaskForm.name" placeholder="e.g. Implement login API" />
              </div>
              <div class="form-group">
                <label for="ctDesc">Description</label>
                <textarea id="ctDesc" v-model="state.createTaskForm.description" placeholder="What should be done?"></textarea>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="ctDeadline">Deadline</label>
                  <input id="ctDeadline" type="date" v-model="state.createTaskForm.deadline" />
                </div>
                <div class="form-group">
                  <label for="ctPriority">Priority</label>
                  <select id="ctPriority" v-model="state.createTaskForm.priority">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label for="ctGithub">GitHub repo link (optional)</label>
                <input id="ctGithub" type="text" v-model="state.createTaskForm.githubRepoLink" placeholder="https://github.com/..." />
              </div>
              <div class="form-group">
                <label for="ctAssign">Assign to employee</label>
                <select id="ctAssign" v-model="state.createTaskForm.assignedEmployeeId">
                  <option :value="null">— Unassigned —</option>
                  <option v-for="emp in projectContributorsForTask" :key="emp.id" :value="emp.id">
                    {{ emp.fullName || emp.name }} ({{ emp.email }})
                  </option>
                </select>
              </div>

              <!-- Subtasks builder -->
              <div class="form-group">
                <label>Subtasks</label>
                <div v-for="(sub, idx) in state.createTaskForm.subtasks" :key="idx" class="subtask-builder-row">
                  <input type="text" v-model="sub.name" placeholder="Subtask name" />
                  <button class="btn btn-sm btn-secondary" type="button" @click="removeSubtaskFromForm(idx)">×</button>
                </div>
                <button class="btn btn-sm btn-secondary" type="button" @click="addSubtaskToForm" style="margin-top:0.5rem;">
                  + Add subtask
                </button>
              </div>

              <div class="timer-actions">
                <button class="btn btn-primary" type="button" :disabled="state.createTaskBusy" @click="submitNewTask">
                  {{ state.createTaskBusy ? 'Creating...' : 'Create task' }}
                </button>
                <button class="btn btn-secondary" type="button" :disabled="state.createTaskBusy" @click="closeCreateTaskModal">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- TL: EMPLOYEE ASSIGNMENT MODAL (NEW) -->
        <div v-if="state.showAssignEmployeeModal" class="rwms-modal-overlay" @click.self="closeAssignEmployeeModal">
          <div class="rwms-modal card">
            <div class="rwms-modal-header">
              <div>
                <span class="section-eyebrow">Team management</span>
                <h3 class="modal-title">Manage project team</h3>
                <p class="modal-subtitle">Add or remove employees from this project.</p>
              </div>
              <button class="rwms-modal-close" type="button" @click="closeAssignEmployeeModal" aria-label="Close">×</button>
            </div>

            <div class="rwms-modal-body">
              <!-- Current contributors -->
              <div class="form-group">
                <label>Current team members</label>
                <div class="dashboard-list">
                  <article
                    v-for="c in safeList(state.projectContributors)"
                    :key="c.id"
                    class="dashboard-list-item"
                  >
                    <div class="dashboard-list-item-copy">
                      <h4>{{ c.fullName || c.name }}</h4>
                      <small>{{ c.email }}</small>
                    </div>
                    <button class="btn btn-sm btn-secondary" type="button" @click="removeEmployeeFromProject(c.id)">Remove</button>
                  </article>
                  <article v-if="!safeList(state.projectContributors).length" class="no-active-task">
                    No team members assigned yet.
                  </article>
                </div>
              </div>

              <!-- Available employees to add -->
              <div class="form-group">
                <label>Available employees</label>
                <div class="dashboard-list">
                  <article
                    v-for="e in unassignedEmployees"
                    :key="e.id"
                    class="dashboard-list-item"
                  >
                    <div class="dashboard-list-item-copy">
                      <h4>{{ e.fullName }}</h4>
                      <small>{{ e.email }}</small>
                    </div>
                    <button class="btn btn-sm btn-primary" type="button" @click="assignEmployeeToProject(e.id)">Add</button>
                  </article>
                  <article v-if="!unassignedEmployees.length" class="no-active-task">
                    All employees are already assigned.
                  </article>
                </div>
              </div>

              <div class="timer-actions">
                <button class="btn btn-secondary" type="button" @click="closeAssignEmployeeModal">
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- TASK DETAILS MODAL (NEW) -->
        <div v-if="showTaskDetailsModal" class="rwms-modal-overlay" @click.self="closeTaskDetails">
          <div class="rwms-modal card">
            <div class="rwms-modal-header">
              <div>
                <span class="section-eyebrow">Task Details</span>
                <h3 class="modal-title">{{ selectedTaskDetails?.name }}</h3>
              </div>
              <button class="rwms-modal-close" type="button" @click="closeTaskDetails" aria-label="Close">×</button>
            </div>
            <div class="rwms-modal-body">
              <p><strong>Project:</strong> {{ selectedTaskDetails?.projectName || 'None' }}</p>
              <p><strong>Deadline:</strong> {{ selectedTaskDetails?.deadline || 'None' }}</p>
              <p><strong>Priority:</strong> {{ selectedTaskDetails?.priority || 'MEDIUM' }}</p>
              <p><strong>Status:</strong> <span class="badge" :class="badgeClassFor(selectedTaskDetails?.status)">{{ selectedTaskDetails?.status }}</span></p>
              <p><strong>Description:</strong></p>
              <p style="word-wrap: break-word; white-space: pre-wrap; margin-bottom: 1rem;">{{ selectedTaskDetails?.description }}</p>
              
              <div v-if="selectedTaskDetails?.githubRepoLink" style="margin-bottom: 1rem;">
                <p><strong>GitHub Repo:</strong> <a :href="selectedTaskDetails.githubRepoLink" target="_blank">{{ selectedTaskDetails.githubRepoLink }}</a></p>
              </div>

              <div class="timer-actions" style="margin-top: 1.5rem;">
                <button class="btn btn-secondary" type="button" @click="closeTaskDetails">Close</button>
              </div>
            </div>
          </div>
        </div>

        <!-- MANAGER: CREATE MANAGER MODAL (NEW) -->
        <div v-if="state.showCreateManagerModal" class="rwms-modal-overlay" @click.self="closeCreateManagerModal">
          <div class="rwms-modal card">
            <div class="rwms-modal-header">
              <div>
                <span class="section-eyebrow">Administration</span>
                <h3 class="modal-title">Create Manager</h3>
                <p class="modal-subtitle">Add a new manager to the system.</p>
              </div>
              <button class="rwms-modal-close" type="button" @click="closeCreateManagerModal" aria-label="Close">×</button>
            </div>

            <div class="rwms-modal-body">
              <div class="form-group">
                <label for="cmName">Full Name *</label>
                <input id="cmName" type="text" v-model="state.createManagerForm.fullName" placeholder="Jane Doe" />
              </div>
              <div class="form-group">
                <label for="cmEmail">Email Address *</label>
                <input id="cmEmail" type="email" v-model="state.createManagerForm.email" placeholder="jane@rwms.local" />
              </div>
              <div class="form-group">
                <label for="cmPass">Password *</label>
                <input id="cmPass" type="password" v-model="state.createManagerForm.password" placeholder="Create password" />
              </div>
              <div class="timer-actions">
                <button class="btn btn-primary" type="button" :disabled="state.createManagerBusy" @click="submitCreateManager">
                  {{ state.createManagerBusy ? 'Creating...' : 'Create Manager' }}
                </button>
                <button class="btn btn-secondary" type="button" :disabled="state.createManagerBusy" @click="closeCreateManagerModal">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
      </section>
    `
};

export default InteractiveRoleDashboard;
