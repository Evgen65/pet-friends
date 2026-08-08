// Pet Friends — Milestone 28A: basic Jenkins CI pipeline
//
// Runs the existing Playwright cloud smoke suite (tests/cloud/*) against the
// already-deployed Render frontend/backend. CI only — this pipeline does not
// deploy anything, does not touch the backend, database, or Render/Aiven/
// Cloudinary settings. It only runs `npm run test:cloud` and archives the
// result.
//
// ── Jenkins credentials setup (required before this pipeline can run) ──────
// Manage Jenkins → Credentials → (System or a folder-scoped store) →
// Add Credentials, and create TWO "Secret text" credentials with exactly
// these IDs (the pipeline binds them to the same-named env vars below):
//   CLOUD_TEST_EMAIL     → the dedicated cloud test user's email
//   CLOUD_TEST_PASSWORD  → that user's password
// Never type real values into this file or into free-text job fields — only
// the credential IDs appear here. If either credential ID does not exist,
// Jenkins fails the build immediately when it tries to bind it below.
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
        // Binds the two Jenkins credentials above to env vars of the same
        // name — tests/cloud/cloud-env.ts already reads these directly, so
        // no test code needs to change. If a credential ID is missing,
        // Jenkins stops the build here with its own clear error.
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

        stage('Show environment info') {
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

        // Belt-and-braces check in addition to the binding above: catches an
        // empty/blank credential value (not just a missing credential ID)
        // with a message that says exactly what to configure and where.
        stage('Verify cloud test credentials') {
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
                }
            }
        }

        stage('Install dependencies') {
            steps {
                // package-lock.json is committed — npm ci gives a clean,
                // reproducible install instead of npm install.
                sh 'npm ci'
            }
        }

        stage('Install Playwright browser') {
            steps {
                // playwright.cloud.config.ts runs on the "chrome" channel
                // (real Google Chrome), not Playwright's bundled Chromium, so
                // that's what needs installing here. --with-deps also
                // installs the OS packages Chrome needs (Debian/Ubuntu
                // agents). If the agent has no sudo/apt access, use a
                // Playwright-provided Docker image (mcr.microsoft.com/
                // playwright:<version>) as the agent instead, which already
                // ships Chrome preinstalled, and this stage becomes a no-op.
                sh 'npx playwright install --with-deps chrome'
            }
        }

        stage('Run cloud smoke tests') {
            steps {
                // Same command used locally — see tests/cloud/cloud-smoke.spec.ts
                // and playwright.cloud.config.ts for what this actually runs.
                sh 'npm run test:cloud'
            }
        }
    }

    post {
        // Always archive whatever Playwright produced, pass or fail, so a
        // failed run's HTML report/traces/screenshots are downloadable from
        // the Jenkins build page. allowEmptyArchive covers the case where
        // the pipeline failed before any report was generated.
        always {
            archiveArtifacts artifacts: 'playwright-report/**, test-results/**',
                              allowEmptyArchive: true,
                              fingerprint: false
        }
    }
}
