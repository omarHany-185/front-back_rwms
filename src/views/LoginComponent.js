/**
 * LoginComponent.js - Login view module
 */

const LoginComponent = {
    props: {
        authMode: {
            type: String,
            default: 'login'
        },
        authMessage: {
            type: String,
            default: ''
        },
        authMessageType: {
            type: String,
            default: 'info'
        }
    },
     template: `
       <div class="login-view">
         <section class="hero-section auth-hero">
           <div class="container auth-center-wrapper">
            <div class="auth-panel card login-card">
              <div class="auth-panel-header">
                <span class="section-eyebrow">Account Access</span>
                <h4>{{ panelTitle }}</h4>
                <p>{{ panelSubtitle }}</p>
              </div>

              <div class="auth-tabs" role="tablist" aria-label="Authentication mode">
                <button
                    type="button"
                    :class="['auth-tab', { active: localMode === 'login' }]"
                    @click="setMode('login')"
                >
                  Sign In
                </button>
                <button
                    type="button"
                    :class="['auth-tab', { active: localMode === 'signup' }]"
                    @click="setMode('signup')"
                >
                  Sign Up
                </button>
              </div>

              <p v-if="authMessage" :class="['auth-message', 'auth-message-' + authMessageType]">
                {{ authMessage }}
              </p>

              <transition name="auth-fade">
                <form v-if="localMode === 'login'" @submit.prevent="handleLogin" class="login-form auth-login-wrap" key="login">
                  <div class="form-group">
                    <label for="login-email">Email Address</label>
                    <input
                        id="login-email"
                        v-model="loginForm.email"
                        type="email"
                        placeholder="your.email@company.com"
                        required
                    />
                  </div>

                  <div class="form-group">
                    <label for="login-password">Password</label>
                    <input
                        id="login-password"
                        v-model="loginForm.password"
                        type="password"
                        placeholder="••••••••"
                        required
                    />
                  </div>

                  <button type="submit" class="btn btn-primary btn-full">Sign In</button>
                </form>

                <form v-else @submit.prevent="handleSignup" class="login-form auth-login-wrap" key="signup">
                  <div class="form-group">
                    <label for="signup-name">Full Name</label>
                    <input
                        id="signup-name"
                        v-model="signupForm.name"
                        type="text"
                        placeholder="Jane Doe"
                    />
                  </div>

                  <div class="form-group">
                    <label for="signup-email">Email Address</label>
                    <input
                        id="signup-email"
                        v-model="signupForm.email"
                        type="email"
                        placeholder="jane@company.com"
                        required
                    />
                  </div>

                  <div class="form-group">
                    <label for="signup-department">Department</label>
                    <select id="signup-department" v-model="signupForm.department">
                      <option value="">Select Dept</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Design">Design</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Product">Product</option>
                      <option value="HR">HR</option>
                      <option value="Finance">Finance</option>
                      <option value="Operations">Operations</option>
                      <option value="QA">QA</option>
                    </select>
                  </div>

                  <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                      <label for="signup-github">GitHub Username</label>
                      <input
                          id="signup-github"
                          v-model="signupForm.githubUsername"
                          type="text"
                          placeholder="johndoe"
                      />
                    </div>

                    <div class="form-group">
                      <label for="signup-phone">Phone</label>
                      <input
                          id="signup-phone"
                          v-model="signupForm.phone"
                          type="text"
                          placeholder="+1234567890"
                      />
                    </div>
                  </div>

                  <div class="form-group">
                    <label for="signup-password">Password</label>
                    <input
                        id="signup-password"
                        v-model="signupForm.password"
                        type="password"
                        placeholder="Create a password"
                        required
                    />
                  </div>

                  <div class="form-group">
                    <label for="signup-role">Workspace Role</label>
                    <select id="signup-role" v-model="signupForm.role" required>
                      <option value="">Choose a role</option>
                      <option value="EMPLOYEE">Employee</option>
                      <option value="TEAM_LEADER">Team Leader</option>
                    </select>
                  </div>

                  <button type="submit" class="btn btn-primary btn-full">Create Account</button>
                </form>
              </transition>


              <div class="auth-switch-row">
                <span v-if="localMode === 'login'">Need a workspace account?</span>
                <span v-else>Already have an account?</span>
                <button type="button" class="auth-switch-link" @click="toggleMode">
                  {{ localMode === 'login' ? 'Create one now' : 'Go to sign in' }}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    `,
    emits: ['login', 'signup', 'mode-change'],
    data() {
        return {
            localMode: this.authMode,
            loginForm: {
                email: '',
                password: ''
            },
            signupForm: {
                name: '',
                email: '',
                password: '',
                role: '',
                department: '',
                githubUsername: '',
                phone: ''
            }
        };
    },
    watch: {
        authMode(newMode) {
            this.localMode = newMode;
        }
    },
    computed: {
        panelTitle() {
            return this.localMode === 'login' ? 'Sign in to RWMS' : 'Create a workspace account';
        },
        panelSubtitle() {
            return this.localMode === 'login'
                ? 'Use your email and password to open the dashboard that matches your signed-in role.'
                : 'Create an account. Your manager must approve your registration before you can log in.';
        }
    },
    methods: {
        setMode(mode) {
            this.localMode = mode;
            this.$emit('mode-change', mode);
        },
        toggleMode() {
            this.setMode(this.localMode === 'login' ? 'signup' : 'login');
        },
        handleLogin() {
            this.$emit('login', {
                email: this.loginForm.email,
                password: this.loginForm.password
            });
        },
        handleSignup() {
            this.$emit('signup', {
                name: this.signupForm.name,
                email: this.signupForm.email,
                password: this.signupForm.password,
                role: this.signupForm.role,
                department: this.signupForm.department,
                githubUsername: this.signupForm.githubUsername,
                phone: this.signupForm.phone
            });
        }
    }
};

export default LoginComponent;

