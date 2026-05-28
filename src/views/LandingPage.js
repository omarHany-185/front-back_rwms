/**
 * LandingPage.js - Landing page view module
 */

const LandingPage = {
    template: `
        <div class="landing-page">
            <section class="hero-section">
                <div class="container hero-grid">
                    <div class="hero-copy">
                        <span class="hero-badge">Built For Distributed Teams</span>
                        <h2>Run remote work like a well-organized workspace, not a spreadsheet.</h2>
                        <p class="hero-text">
                            RWMS helps managers, team leaders, and engineers keep projects moving with structured task assignment,
                            automatic time tracking, submission reviews, and transparent reporting.
                        </p>

                        <div class="hero-actions">
                            <button @click="$emit('get-started')" class="btn btn-primary">Get Started</button>
                            <button @click="$emit('scroll-to', 'features')" class="btn btn-secondary hero-link">Explore Features</button>
                        </div>

                        <div class="hero-stats">
                            <div class="metric-card">
                                <strong>8 Hrs</strong>
                                <span>Tracked work shift</span>
                            </div>
                            <div class="metric-card">
                                <strong>4 Levels</strong>
                                <span>Task workflow</span>
                            </div>
                            <div class="metric-card">
                                <strong>3 Roles</strong>
                                <span>Manager, team leader, and employee</span>
                            </div>
                        </div>
                    </div>

                    <div class="hero-preview card">
                        <div class="preview-header">
                            <span class="preview-dot"></span>
                            <span class="preview-dot"></span>
                            <span class="preview-dot"></span>
                        </div>
                        <h3>What RWMS manages</h3>
                        <ul class="preview-list">
                            <li>Project → Task → Subtask</li>
                            <li>Auto time tracking and break control</li>
                            <li>Employee submissions and reviews</li>
                            <li>Progress reporting for managers</li>
                        </ul>

                        <div class="preview-workflow">
                            <span>Project</span>
                            <span>Task</span>
                            <span>Subtask</span>
                            <span>Time</span>
                            <span>Submission</span>
                            <span>Review</span>
                            <span>Progress</span>
                        </div>
                    </div>
                </div>
            </section>

            <section id="features" class="section-block">
                <div class="container">
                    <div class="section-heading">
                        <span class="section-eyebrow">Platform Overview</span>
                        <h3>Everything Remote Teams Need In One Place</h3>
                        <p>Designed for accountability, clarity, and smooth collaboration across departments and time zones.</p>
                    </div>

                    <div class="feature-grid">
                        <article class="card feature-card">
                            <h4>Task Orchestration</h4>
                            <p>Create projects, break work into tasks and subtasks, and assign contributors with clear ownership.</p>
                        </article>
                        <article class="card feature-card">
                            <h4>Work Time Tracking</h4>
                            <p>Track the active shift, mandatory breaks, and end-of-day submission timing with automatic state updates.</p>
                        </article>
                        <article class="card feature-card">
                            <h4>Review & Approval</h4>
                            <p>Managers and team leaders can approve, reject, and audit work with timestamped review history.</p>
                        </article>
                        <article class="card feature-card">
                            <h4>Secure Access</h4>
                            <p>JWT-ready architecture with role-based access for managers, team leaders, and employees.</p>
                        </article>
                    </div>
                </div>
            </section>

            <section id="workflow" class="section-block section-muted">
                <div class="container">
                    <div class="section-heading">
                        <span class="section-eyebrow">Workflow</span>
                        <h3>Structured Around The Full Remote Work Lifecycle</h3>
                    </div>
                    <div class="workflow-grid-landing">
                        <div class="workflow-step workflow-step-landing">
                            <span>1</span>
                            <h4>Project</h4>
                            <p>Managers define the scope and assign team leaders.</p>
                        </div>

                        <div class="workflow-step workflow-step-landing">
                            <span>2</span>
                            <h4>Task</h4>
                            <p>Team Leaders divide work into deliverable units with due dates.</p>
                        </div>

                        <div class="workflow-step workflow-step-landing">
                            <span>3</span>
                            <h4>Subtask</h4>
                            <p>Employees complete smaller checkpoints for transparency.</p>
                        </div>

                        <div class="workflow-step workflow-step-landing">
                            <span>4</span>
                            <h4>Time Tracking</h4>
                            <p>Shift timers ensure accountability and break enforcement.</p>
                        </div>

                        <div class="workflow-step workflow-step-landing">
                            <span>5</span>
                            <h4>Submission</h4>
                            <p>End-of-day reports capture what was accomplished.</p>
                        </div>

                        <div class="workflow-step workflow-step-landing">
                            <span>6</span>
                            <h4>Review & Audit</h4>
                            <p>Actions are approved and preserved for reporting.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section class="section-block section-auth" style="text-align: center; padding: 4rem 0;">
                <div class="container">
                    <h3 style="margin-bottom: 1.5rem; font-size: 2rem;">Ready to run your remote work smoothly?</h3>
                    <button @click="$emit('get-started')" class="btn btn-primary" style="padding: 1rem 3rem; font-size: 1.1rem;">Get Started</button>
                </div>
            </section>
        </div>
    `
};

export default LandingPage;

