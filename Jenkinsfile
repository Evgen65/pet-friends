// Pet Friends — Milestone 29: basic Jenkins CI pipeline
//
// Runs the existing Playwright cloud smoke suite (tests/cloud/*) against the
// already-deployed Render frontend/backend. CI only — this pipeline does not
// deploy anything, and does not touch the backend, database, or Render/
// Aiven/Cloudinary settings. It only runs `npm run test:cloud` and archives
// the result.
//
// ── Jenkins credentials setup (required before this pipeline can run) ──────
// Manage Jenkins → Credentials → (System or a folder-scoped store) →
// Add Credentials, and create TWO "Secret text" credentials with exactly
// these IDs (the pipeline binds them to the same-named env vars below,
// which tests/cloud/cloud-env.ts already reads — no test code changes):
//   CLOUD_TEST_EMAIL     → the dedicated cloud test user's email
//   CLOUD_TEST_PASSWORD  → that user's password
// Never type real values into this file or into free-text job fields — only
// the credential IDs appear here.
//
// This assumes a Linux Jenkins agent (the typical default) with Node.js on
// PATH. On a Windows agent, replace the `sh` steps with `bat` / `powershell`.
pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
    }

    environment {
        // Binding the credentials here (not just in the later validation
        // stage) is what makes this genuinely "fail fast": if either
        // credential ID does not exist in Jenkins at all, this line makes
        // the whole build fail immediately, before Checkout even runs.
        // The "Validate cloud test credentials" stage further down exists
        // for the *other* failure case — a credential ID that exists but
        // holds an empty value — with a message explaining exactly what to
        // configure and where.
        CLOUD_TEST_EMAIL    = credentials('CLOUD_TEST_EMAIL')
        CLOUD_TEST_PASSWORD = credentials('CLOUD_TEST_PASSWORD')
        // Enables Playwright's CI-only safety checks (e.g. forbidOnly, which
        // fails the build if a test.only was accidentally committed).
        CI = 'true'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Environment info') {
            steps {
                sh '''
                    echo "Node:      $(node -v)"
                    echo "npm:       $(npm -v)"
                    echo "Workspace: $WORKSPACE"
                    echo "Branch:    ${GIT_BRANCH:-unknown}"
                    echo "Build:     ${BUILD_NUMBER:-unknown}"
                '''
            }
        }

        stage('Determine branch policy') {
            steps {
                script {
                    // Prefer the Multibranch Pipeline variable, fall back to
                    // the older job-scm provided GIT_BRANCH.
                    def rawBranchName = env.BRANCH_NAME ?: ''
                    def rawGITBranch = env.GIT_BRANCH ?: ''

                    // Start from whichever has a value, BRANCH_NAME preferred.
                    def candidate = rawBranchName ?: rawGITBranch ?: 'unknown'

                    // Normalize common prefixes like refs/heads/, refs/remotes/origin/, origin/
                    def normalized = candidate
                    normalized = normalized.replaceFirst('^refs/heads/', '')
                    normalized = normalized.replaceFirst('^refs/remotes/origin/', '')
                    normalized = normalized.replaceFirst('^origin/', '')
                    normalized = normalized.trim()
                    if (!normalized) {
                        normalized = 'unknown'
                    }

                    // Determine branch category and a human-readable CI policy label.
                    // Mapping follows docs/jenkins-pipeline-model.md — Milestone 33.
                    def category = 'unknown branch'
                    def policy = 'full cloud smoke (warning: unrecognized branch)'
                    if (normalized == 'main') {
                        category = 'production branch'
                        policy = 'full cloud smoke, no deploy yet'
                    } else if (normalized == 'develop') {
                        category = 'integration/staging branch'
                        policy = 'full cloud smoke, no deploy yet'
                    } else if (normalized == 'backend-preparation') {
                        category = 'transitional production/deploy branch'
                        policy = 'full cloud smoke, no deploy'
                    } else if (normalized ==~ /^feature\/.+/) {
                        category = 'feature branch'
                        policy = 'validation only'
                    } else if (normalized ==~ /^bugfix\/.+/) {
                        category = 'bugfix branch'
                        policy = 'full cloud smoke'
                    } else if (normalized ==~ /^hotfix\/.+/) {
                        category = 'hotfix branch'
                        policy = 'full cloud smoke, manual QA approval required before merge to main'
                    }

                    // Export for later stages and also show clearly in the Jenkins log
                    env.BRANCH_NORMALIZED = normalized
                    env.BRANCH_CATEGORY = category
                    env.CI_POLICY = policy

                    echo "Raw BRANCH_NAME: ${rawBranchName}"
                    echo "Raw GIT_BRANCH: ${rawGITBranch}"
                    echo "Normalized branch: ${env.BRANCH_NORMALIZED}"
                    echo "Branch category: ${env.BRANCH_CATEGORY}"
                    echo "Selected CI policy: ${env.CI_POLICY}"
                }
            }
        }

        stage('Install dependencies') {
            steps {
                // Prefer a clean, reproducible install from the committed
                // lockfile. If it's missing, or npm ci rejects it as
                // out-of-sync/invalid (npm ci refuses to modify the lockfile
                // and errors instead), fall back to a regular npm install.
                sh '''
                    if [ -f package-lock.json ]; then
                        echo "package-lock.json found — running npm ci"
                        if ! npm ci; then
                            echo "npm ci failed (lockfile missing/out of sync) — falling back to npm install"
                            npm install
                        fi
                    else
                        echo "No package-lock.json — running npm install"
                        npm install
                    fi
                '''
            }
        }

        stage('Install Playwright browsers') {
            steps {
                // playwright.cloud.config.ts runs on the "chrome" channel
                // (real Google Chrome), not Playwright's bundled Chromium —
                // that's what actually needs installing for `npm run
                // test:cloud` to launch a browser at all. --with-deps also
                // installs the OS packages Chrome needs (Debian/Ubuntu
                // agents). If the agent has no sudo/apt access, use a
                // Playwright-provided Docker image (mcr.microsoft.com/
                // playwright:<version>) as the agent instead, which already
                // ships Chrome preinstalled, and this stage becomes a no-op.
                sh 'npx playwright install chromium'
            }
        }

        stage('Validate cloud test credentials') {
            steps {
                script {
                    if (!env.CLOUD_TEST_EMAIL?.trim() || !env.CLOUD_TEST_PASSWORD?.trim()) {
                        error(
                            'CLOUD_TEST_EMAIL / CLOUD_TEST_PASSWORD are not configured.\n' +
                            'In Jenkins: Manage Jenkins > Credentials, add two "Secret text"\n' +
                            'credentials with IDs "CLOUD_TEST_EMAIL" and "CLOUD_TEST_PASSWORD"\n' +
                            'holding the dedicated cloud test user\'s email/password, then rerun.'
                        )
                    }
                    echo 'Cloud test credentials are present.'
                }
            }
        }

        stage('Run cloud smoke tests') {
            steps {
                // Same command used locally — see tests/cloud/cloud-smoke.spec.ts
                // and playwright.cloud.config.ts for what this actually runs.
                // A non-zero exit (any failed test) fails this stage, and
                // therefore the whole pipeline.
                sh 'npm run test:cloud'
            }
        }
    }

    post {
        // Always archive whatever Playwright produced, pass or fail, so a
        // failed run's HTML report/traces/screenshots are downloadable from
        // the Jenkins build page. allowEmptyArchive covers the case where
        // the pipeline failed before any report was generated (e.g. missing
        // credentials) — nothing here is ever committed to git, only
        // attached to the Jenkins build.
        always {
            archiveArtifacts artifacts: 'playwright-report/**, test-results/**',
                              allowEmptyArchive: true,
                              fingerprint: false
        }
    }
}
