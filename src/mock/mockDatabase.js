/**
 * mockDatabase.js - Centralized Mock Database
 *
 * Single source of truth for all application state during frontend-only development.
 * Seeds from dummyData.js on initialization and exposes CRUD-style primitives.
 *
 * When connecting a real backend, this file is no longer needed — services
 * will import from realApi.js instead of mockApi.js.
 */

import {
    DUMMY_USERS,
    DUMMY_PROJECTS,
    DUMMY_TASKS,
    DUMMY_SUBMISSIONS,
    DUMMY_WORK_SESSION,
    DUMMY_NOTIFICATIONS,
    DUMMY_TEAM_LEADER_REQUESTS,
    DUMMY_PROJECT_REQUESTS,
    DUMMY_AUDIT_LOGS
} from '../js/dummyData.js';

// ============ DEEP CLONE HELPER ============

function cloneDeep(value) {
    return JSON.parse(JSON.stringify(value));
}

// ============ MOCK DATABASE SINGLETON ============

class MockDatabase {
    constructor() {
        this._seed();
    }

    /**
     * Initialize (or re-initialize) all collections from seed data.
     */
    _seed() {
        // Users are stored as an object keyed by role label in dummyData,
        // but we normalize to an array internally for consistent CRUD.
        this.collections = {
            users: Object.values(cloneDeep(DUMMY_USERS)),
            projects: cloneDeep(DUMMY_PROJECTS),
            tasks: cloneDeep(DUMMY_TASKS),
            submissions: cloneDeep(DUMMY_SUBMISSIONS),
            teamLeaderRequests: cloneDeep(DUMMY_TEAM_LEADER_REQUESTS),
            projectRequests: cloneDeep(DUMMY_PROJECT_REQUESTS),
            notifications: cloneDeep(DUMMY_NOTIFICATIONS),
            auditLogs: cloneDeep(DUMMY_AUDIT_LOGS),
            workSessions: [cloneDeep(DUMMY_WORK_SESSION)]
        };

        // Auth context — simulates what the backend would derive from the JWT.
        this.auth = {
            currentUserId: null,
            currentUserEmail: null,
            authToken: null
        };
    }

    // ============ AUTH CONTEXT ============

    setAuth(userId, email, token) {
        this.auth.currentUserId = userId;
        this.auth.currentUserEmail = email;
        this.auth.authToken = token;
    }

    clearAuth() {
        this.auth.currentUserId = null;
        this.auth.currentUserEmail = null;
        this.auth.authToken = null;
    }

    getCurrentUserId() {
        return this.auth.currentUserId;
    }

    getCurrentUserEmail() {
        return this.auth.currentUserEmail;
    }

    // ============ GENERIC CRUD ============

    /**
     * Get all records from a collection.
     * @param {string} collection
     * @returns {Array} Deep-cloned copy of all records.
     */
    getAll(collection) {
        const coll = this.collections[collection];
        if (!coll) return [];
        return cloneDeep(coll);
    }

    /**
     * Get a single record by id.
     * @param {string} collection
     * @param {number|string} id
     * @returns {Object|null} Deep-cloned record or null.
     */
    getById(collection, id) {
        const coll = this.collections[collection];
        if (!coll) return null;
        const record = coll.find(r => r.id === parseInt(id));
        return record ? cloneDeep(record) : null;
    }

    /**
     * Query records with a predicate function.
     * @param {string} collection
     * @param {Function} predicate - (record) => boolean
     * @returns {Array} Deep-cloned matching records.
     */
    query(collection, predicate) {
        const coll = this.collections[collection];
        if (!coll) return [];
        return cloneDeep(coll.filter(predicate));
    }

    /**
     * Find a single record matching a predicate.
     * @param {string} collection
     * @param {Function} predicate
     * @returns {Object|null}
     */
    findOne(collection, predicate) {
        const coll = this.collections[collection];
        if (!coll) return null;
        const record = coll.find(predicate);
        return record ? cloneDeep(record) : null;
    }

    /**
     * Insert a new record into a collection.
     * @param {string} collection
     * @param {Object} record
     * @returns {Object} The inserted record (cloned).
     */
    insert(collection, record) {
        const coll = this.collections[collection];
        if (!coll) {
            this.collections[collection] = [];
        }
        // Auto-generate id if not provided.
        if (record.id == null) {
            const maxId = this.collections[collection].reduce(
                (max, r) => Math.max(max, r.id || 0), 0
            );
            record.id = maxId + 1;
        }
        this.collections[collection].push(cloneDeep(record));
        return cloneDeep(record);
    }

    /**
     * Insert a record at the beginning of a collection (newest first).
     * @param {string} collection
     * @param {Object} record
     * @returns {Object} The inserted record (cloned).
     */
    insertFirst(collection, record) {
        const coll = this.collections[collection];
        if (!coll) {
            this.collections[collection] = [];
        }
        if (record.id == null) {
            const maxId = this.collections[collection].reduce(
                (max, r) => Math.max(max, r.id || 0), 0
            );
            record.id = maxId + 1;
        }
        this.collections[collection].unshift(cloneDeep(record));
        return cloneDeep(record);
    }

    /**
     * Update a record in place by id.
     * @param {string} collection
     * @param {number|string} id
     * @param {Object|Function} patchOrFn - plain object to merge, or (record) => void mutator.
     * @returns {Object|null} Updated record (cloned) or null if not found.
     */
    update(collection, id, patchOrFn) {
        const coll = this.collections[collection];
        if (!coll) return null;
        const record = coll.find(r => r.id === parseInt(id));
        if (!record) return null;

        if (typeof patchOrFn === 'function') {
            patchOrFn(record);
        } else {
            Object.assign(record, patchOrFn);
        }
        return cloneDeep(record);
    }

    /**
     * Update records matching a predicate.
     * @param {string} collection
     * @param {Function} predicate
     * @param {Object|Function} patchOrFn
     * @returns {number} Number of records updated.
     */
    updateWhere(collection, predicate, patchOrFn) {
        const coll = this.collections[collection];
        if (!coll) return 0;
        let count = 0;
        coll.forEach(record => {
            if (predicate(record)) {
                if (typeof patchOrFn === 'function') {
                    patchOrFn(record);
                } else {
                    Object.assign(record, patchOrFn);
                }
                count++;
            }
        });
        return count;
    }

    /**
     * Remove a record by id.
     * @param {string} collection
     * @param {number|string} id
     * @returns {boolean} True if a record was removed.
     */
    remove(collection, id) {
        const coll = this.collections[collection];
        if (!coll) return false;
        const idx = coll.findIndex(r => r.id === parseInt(id));
        if (idx < 0) return false;
        coll.splice(idx, 1);
        return true;
    }

    /**
     * Get the next available id for a collection.
     * @param {string} collection
     * @returns {number}
     */
    nextId(collection) {
        const coll = this.collections[collection];
        if (!coll || coll.length === 0) return 1;
        return Math.max(...coll.map(r => r.id || 0)) + 1;
    }

    /**
     * Reset database to initial seed state.
     */
    reset() {
        this._seed();
    }
}

// Export a singleton instance.
const db = new MockDatabase();
export default db;
