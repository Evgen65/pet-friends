# Jenkins Pipeline Model — Pet Friends

This document describes the **current** Jenkins setup and the **target**
model for how CI behavior should differ per branch type. It complements
[branch-management.md](branch-management.md) and
[release-flow.md](release-flow.md).

> This is documentation only. No pipeline logic is implemented by this
> milestone — the target behavior below is a plan for future milestones.

## Current state (as of Milestone 31)

| Aspect | Value |
|--------|-------|
| Jenkins | Local Jenkins running in Docker |
| Pipeline job | `pet-friends-cloud-smoke` |
| Source | Reads `Jenkinsfile` from the GitHub branch `backend-preparation` |
| Credentials | `CLOUD_TEST_EMAIL`, `CLOUD_TEST_PASSWORD` (Jenkins "Secret text" credentials) |
| Steps | `npm ci` → `npx playwright install chromium` → `npm run test:cloud` |
| Purpose | CI validation only — **no deploy** |

The pipeline runs the same steps regardless of branch. It exists to prove
that the already-deployed Render frontend/backend pass the Playwright
cloud smoke suite (`tests/cloud/*`).

## Target model — behavior per branch type

The table below describes how the pipeline **should eventually** behave
once branch-aware logic is added, aligned with the branch model in
[branch-management.md](branch-management.md).

| Branch type | Steps | Notes |
|-------------|-------|-------|
| `feature/*`  | Install dependencies → run TypeScript check (if available) → run relevant smoke tests | Fast feedback for the developer while the feature is in progress |
| `bugfix/*`   | Run smoke + affected tests | Gives QA a signal to review before merge to `develop` |
| `develop`    | Run broader smoke/regression | Candidate for deploying/validating a staging environment in a future milestone |
| `hotfix/*`   | Run fast production smoke | Requires manual approval before merging to `main`, given the urgency and risk |
| `main`       | Run full cloud smoke | Production deployment itself stays manually controlled until a later milestone |

## Flow diagram (target)

```
feature/*  ──▶ deps + type check + relevant smoke
bugfix/*   ──▶ smoke + affected tests           ──▶ QA review before merge
develop    ──▶ broader smoke/regression         ──▶ (future) staging validate/deploy
hotfix/*   ──▶ fast production smoke            ──▶ manual approval ──▶ merge to main
main       ──▶ full cloud smoke                 ──▶ (future) controlled production deploy
```

## Current vs. target

| Aspect | Current | Target |
|--------|---------|--------|
| Branch awareness | None — same steps for any branch | Steps vary by branch type (table above) |
| Source branch | `backend-preparation` | `main` / `develop` / `feature`/`bugfix`/`hotfix` branches |
| Deploy | Not handled by Jenkins | Still manual/Render-controlled; deploy automation is a later milestone |
| Approval gates | None | Manual approval required before `hotfix/*` → `main` |

## Related documents

- [branch-management.md](branch-management.md) — branch model this pipeline targets
- [release-flow.md](release-flow.md) — where Jenkins fits in a normal release
- [hotfix-flow.md](hotfix-flow.md) — where Jenkins fits in an urgent fix

## Milestone 33 — Branch-aware pipeline

Milestone 33 adds branch detection and a simple policy decision stage,
**Determine branch policy**, to the `Jenkinsfile`. It reads `BRANCH_NAME`
(preferred, for a future Multibranch Pipeline) and falls back to
`GIT_BRANCH` (current single-branch Pipeline from SCM), normalizes the
value (strips `refs/heads/`, `refs/remotes/origin/`, `origin/`), and prints
the raw `BRANCH_NAME`, raw `GIT_BRANCH`, normalized branch name, branch
category, and selected CI policy into the Jenkins log.

Normalized branch → category → CI policy:

| Normalized branch     | Category                                | CI policy |
|------------------------|------------------------------------------|-----------|
| `main`                  | production branch                        | full cloud smoke, no deploy yet |
| `develop`               | integration/staging branch               | full cloud smoke, no deploy yet |
| `backend-preparation`   | transitional production/deploy branch    | full cloud smoke, no deploy |
| `feature/*`             | feature branch                           | validation only |
| `bugfix/*`              | bugfix branch                            | full cloud smoke |
| `hotfix/*`              | hotfix branch                            | full cloud smoke, manual QA approval required before merge to `main` |
| anything else           | unknown branch                           | full cloud smoke (warning: unrecognized branch) |

Behavior note: the current milestone only adds detection, classification,
and logging — it does not yet change which steps run per branch. The
pipeline still performs the same installation, Playwright browser install,
credential validation, `npm run test:cloud`, and artifact archival steps
for every branch, so existing successful behavior remains unchanged. Wiring
the CI policy to actually gate/vary steps (e.g. skipping the full suite on
`feature/*`, adding an approval gate for `hotfix/*`) is left for a future
milestone.
