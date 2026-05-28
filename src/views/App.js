/**
 * App.js - Root view shell
 */

import appController from '../controllers/Controller.js';
import LandingPage from './LandingPage.js';
import LoginComponent from './LoginComponent.js';
import RoleDashboard from './RoleDashboard.js';

const App = {
    name: 'App',
    components: {
        LandingPage,
        LoginComponent,
        RoleDashboard
    },
    template: `
      <div id="app-container" class="rwms-app">
        <nav class="rwms-navbar">
          <div class="container">
            <div class="navbar-content">
              <div class="navbar-brand" @click="goBrand" style="cursor: pointer;" title="Back to Home">
                <h1 class="rwms-logo">RWMS</h1>
                <span class="rwms-tagline">Remote Work Management System</span>
              </div>

              <div v-if="!currentUser" class="navbar-menu navbar-menu-guest">
                <template v-if="isLandingRoute">
                  <button @click="scrollToSection('features')" class="nav-link">Features</button>
                  <button @click="scrollToSection('workflow')" class="nav-link">Workflow</button>
                  <button @click="goToLogin" class="role-btn active">Sign In</button>
                </template>
                <template v-else-if="isAuthRoute">
                  <button @click="goHome" class="nav-link">Back to Home</button>
                </template>
              </div>

              <div v-if="currentUser" class="navbar-user">
                <span class="user-info">{{ currentUser.name }} ({{ currentRoleLabel }})</span>
                <button @click="openProfile" class="btn btn-secondary">Profile</button>
                <button @click="refreshMyData" class="btn btn-secondary">Refresh</button>
                <button @click="logout" class="btn btn-secondary">Logout</button>
              </div>
            </div>
          </div>
        </nav>

        <div v-if="loadError" class="rwms-error-banner">
          <span>{{ loadError }}</span>
          <button type="button" class="rwms-error-dismiss" @click="dismissError">×</button>
        </div>

        <main :class="['rwms-main', { 'rwms-main-landing': !currentUser && isLandingRoute }]">
          <LandingPage
              v-if="!currentUser && isLandingRoute"
              @get-started="goToLogin"
              @scroll-to="scrollToSection"
          ></LandingPage>

          <LoginComponent
              v-else-if="!currentUser && isAuthRoute"
              :auth-mode="authMode"
              :auth-message="authMessage"
              :auth-message-type="authMessageType"
              @login="handleLogin"
              @signup="handleSignup"
              @mode-change="setAuthMode"
          ></LoginComponent>

          <RoleDashboard v-else-if="currentUser" :user="currentUser" :state="state" class="role-dashboard"></RoleDashboard>
        </main>

        <div v-if="showProfileModal" class="rwms-modal-overlay" @click.self="closeProfile">
          <div class="rwms-modal card">
            <div class="rwms-modal-header">
              <div>
                <span class="section-eyebrow">Account</span>
                <h3 class="modal-title">Profile & Security</h3>
                <p class="modal-subtitle">Update your password using the backend endpoint.</p>
              </div>
              <button class="rwms-modal-close" type="button" @click="closeProfile" aria-label="Close">×</button>
            </div>

            <div class="rwms-modal-body">
              <div class="card review-detail-card">
                <h4 class="modal-title">Signed in as</h4>
                <p><strong>{{ currentUser.email }}</strong></p>
                <p class="modal-subtitle">Role: {{ currentRoleLabel }}</p>
              </div>

              <div class="review-comments-section">
                <h4 class="modal-title">Change password</h4>
                <div class="form-group">
                  <label for="profile-current-password">Current password</label>
                  <input
                      id="profile-current-password"
                      v-model="profileForm.currentPassword"
                      type="password"
                      autocomplete="current-password"
                      placeholder="Enter current password"
                  />
                </div>

                <div class="form-group">
                  <label for="profile-new-password">New password</label>
                  <input
                      id="profile-new-password"
                      v-model="profileForm.newPassword"
                      type="password"
                      autocomplete="new-password"
                      placeholder="Enter new password"
                  />
                </div>

                <div class="timer-actions">
                  <button class="btn btn-primary" type="button" :disabled="profileBusy" @click="changePassword">
                    {{ profileBusy ? 'Updating...' : 'Update password' }}
                  </button>
                  <button class="btn btn-secondary" type="button" :disabled="profileBusy" @click="closeProfile">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="showTimerWarning" :class="['timer-warning-overlay', timerWarningType]">
          <div class="timer-warning-content">
            <h2>{{ timerWarningMessage }}</h2>
            <p>{{ timerWarningDescription }}</p>
          </div>
        </div>
      </div>
    `,
    computed: {
        state() { return appController.state; },
        currentUser() { return this.state.currentUser; },
        currentRole() { return this.currentUser?.role || this.state.currentRole; },
        currentRoleLabel() {
            const role = this.currentRole || 'EMPLOYEE';
            if (role === 'TEAM_LEADER') {
                return 'Team Leader';
            }

            if (role === 'MANAGER') {
                return 'Manager';
            }

            return 'Employee';
        },
        currentRoute() { return this.state.routePath; },
        isLandingRoute() { return this.currentRoute === '/'; },
        isSignInRoute() { return this.currentRoute === '/signin'; },
        isAuthRoute() { return this.isSignInRoute; },
        showLoginPanel() { return this.state.showLoginPanel; },
        authMode() { return this.state.authMode; },
        authMessage() { return this.state.authMessage; },
        authMessageType() { return this.state.authMessageType; },
        showTimerWarning() { return this.state.showTimerWarning; },
        timerWarningType() { return this.state.timerWarningType; },
        timerWarningMessage() { return this.state.timerWarningMessage; },
        timerWarningDescription() { return this.state.timerWarningDescription; },
        showProfileModal() { return this.state.showProfileModal; },
        profileForm() { return this.state.profileForm; },
        profileBusy() { return this.state.profileBusy; },
        dashboardLoading() { return this.state.dashboardLoading; },
        actionLoading() { return this.state.actionLoading; },
        loadError() { return this.state.loadError; },

        // dashboards removed — placeholder shown while new dashboards are developed
    },
    methods: {
        handlePopState() { appController.syncRouteFromLocation(); },
        goToLogin() { appController.goToLogin(); },
        goHome() { appController.goHome(); },
        goBrand() {
            if (this.currentUser) {
                appController.updateRouteState('/dashboard', { replace: true });
                return;
            }

            appController.goHome();
        },
        handleLogin(userData) { appController.login(userData); },
        handleSignup(userData) { appController.signup(userData); },
        setAuthMode(mode) {
            appController.setAuthMode(mode);
        },
        logout() { appController.logout(); },
        openProfile() { appController.openProfile(); },
        closeProfile() { appController.closeProfile(); },
        changePassword() { appController.changePassword(); },
        refreshMyData() { appController.refreshMyData(); },
        dismissError() { this.state.loadError = null; },

        scrollToSection(sectionId) {
            const target = document.getElementById(sectionId);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    },
    mounted() {
        appController.syncRouteFromLocation();
        if (this.currentUser && this.currentRoute !== '/dashboard') {
            appController.updateRouteState('/dashboard', { replace: true });
        }

        if (!this.currentUser && this.currentRoute === '/dashboard') {
            appController.goHome();
        }

        window.addEventListener('popstate', this.handlePopState);
    },
    beforeUnmount() {
        window.removeEventListener('popstate', this.handlePopState);
    }
};

export default App;
