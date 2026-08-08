# Release Flow — Pet Friends

This document describes the **target** flow for shipping a normal
(non-urgent) change from a feature branch to production. It builds on the
branch model defined in [branch-management.md](branch-management.md).

> **Current reality:** Production still deploys from `backend-preparation`,
> not `main`. Migrating Render and the branch structure to this
> `develop` → `main` model is a **later milestone**. This document defines
> the process so it is ready when that migration happens.

## Flow diagram

```
feature branch
      │
      ▼
local check              (run tests/build locally before pushing)
      │
      ▼
push                      (push feature branch to GitHub)
      │
      ▼
Jenkins cloud smoke        (automated CI run)
      │
      ▼
pull request to develop    (code review)
      │
      ▼
QA on staging/test         (manual + automated verification)
      │
      ▼
release candidate          (develop is ready for release)
      │
      ▼
merge to main
      │
      ▼
production deploy
      │
      ▼
production smoke           (confirm live site is healthy)
```

## Step-by-step

| Step | What happens | Who is responsible |
|------|---------------|----------------------|
| feature branch | Work happens on `feature/*` or `bugfix/*`, created from `develop` | Developer |
| local check | Run relevant checks/tests locally before pushing | Developer |
| push | Branch pushed to GitHub | Developer |
| Jenkins cloud smoke | CI runs `npm run test:cloud` (and future checks) against the branch | Jenkins |
| pull request to develop | PR opened, code reviewed | Developer + reviewer |
| QA on staging/test | Manual and automated QA against the integration environment | QA |
| release candidate | `develop` is tagged/declared ready for release | QA + release owner |
| merge to main | Release candidate merged into `main` | Release owner |
| production deploy | `main` deploys to production | CI/CD (future) |
| production smoke | Cloud smoke tests re-run against production | Jenkins / QA |

## QA responsibilities

QA is the gate between "code works on a branch" and "code is safe for
production." For every release candidate, QA should:

- **Verify acceptance criteria** — confirm the feature/bugfix does what it
  was supposed to do.
- **Check regression risks** — think about what else could break, not just
  the changed area.
- **Run smoke tests** — execute `npm run test:cloud` (or the relevant
  suite) against the target environment.
- **Review the Jenkins result** — don't just trust a green build blindly;
  check *what* actually ran and *what* it covered.
- **Approve or reject the release candidate** — give a clear go/no-go
  before merge to `main`.

## Current reality vs. target

| Aspect | Current (Milestone 31) | Target |
|--------|--------------------------|--------|
| Production deploy source | `backend-preparation` | `main` |
| Integration branch | not yet in use | `develop` |
| CI | Jenkins runs cloud smoke on `backend-preparation` | Jenkins runs per-branch checks (see [jenkins-pipeline-model.md](jenkins-pipeline-model.md)) |
| Release candidates | not formalized | `develop` → `main` via reviewed PR |

Migrating Render's deploy source and introducing `main`/`develop` as the
live branches is planned for a later milestone, once this process is
documented and agreed.
