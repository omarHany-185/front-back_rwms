/**
 * dummyData.js - Initial seed data for the MockDatabase
 */

// ============ MANAGER PASSWORD HASH ============
// SHA-256 hex digest of "manager123" — used for secure credential verification.
export const MANAGER_PASSWORD_HASH =
    '866485796cfa8d7c0cf7111640205b83076433547577511d81f8030ae99ecea5';

// ============ USERS ============
export const DUMMY_USERS = {
    manager: {
        id: 1,
        fullName: 'Super Manager',
        email: 'manager@rwms.local',
        employeeId: 'MGR-001',
        githubUsername: 'super-manager',
        phone: '+11234567890',
        department: 'Management',
        role: 'MANAGER',
        status: 'ACTIVE',
        firstLogin: false,
        createdAt: '2026-01-01T08:00:00',
        updatedAt: '2026-05-25T10:00:00'
    }
};

// ============ EMPTY SEED COLLECTIONS ============
export const DUMMY_PROJECTS = [];
export const DUMMY_TASKS = [];
export const DUMMY_SUBMISSIONS = [];
export const DUMMY_NOTIFICATIONS = [];
export const DUMMY_PROJECT_REQUESTS = [];
export const DUMMY_TEAM_LEADER_REQUESTS = [];
export const DUMMY_AUDIT_LOGS = [];
export const DUMMY_WORK_SESSION = null; // No initial active work session

// ============ PROGRESS HELPER ============
export const buildProjectProgress = (projectId) => {
    // Left empty for compatibility, though actual progress logic should move to service layer eventually
    return {
        projectId,
        projectName: 'Unknown Project',
        totalTasks: 0,
        completedTasks: 0,
        progressPercent: 0,
        taskItems: []
    };
};

// ============ HELPER FUNCTIONS ============
export function findUserByEmail(email) {
    const lowerEmail = String(email || '').toLowerCase();
    const users = Object.values(DUMMY_USERS);
    return users.find(u => String(u.email || '').toLowerCase() === lowerEmail);
}

export function getUserLists() {
    return {
        allUsers: Object.values(DUMMY_USERS),
        employees: Object.values(DUMMY_USERS).filter(u => u.role === 'EMPLOYEE'),
        teamLeaders: Object.values(DUMMY_USERS).filter(u => u.role === 'TEAM_LEADER'),
        managers: Object.values(DUMMY_USERS).filter(u => u.role === 'MANAGER'),
        pendingTeamLeaders: Object.values(DUMMY_USERS).filter(u => u.status === 'PENDING')
    };
}
