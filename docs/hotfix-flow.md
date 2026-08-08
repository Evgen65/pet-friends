# Hotfix Flow — Pet Friends

This document describes the **target** flow for fixing an urgent
production issue, as opposed to the normal [release-flow.md](release-flow.md)
used for planned work. It builds on the branch model defined in
[branch-management.md](branch-management.md).

> **Current reality:** Production still deploys from `backend-preparation`,
> not `main`. Until the migration described in
> [release-flow.md](release-flow.md) happens, "merge to main" below should
> be read as "merge to the current production branch." The flow and
> reasoning stay the same either way.

## When to use this flow

Use a hotfix when a bug is **already live in production** and cannot wait
for the next regular release — for example, a crash, a broken core flow,
or a failing health check that real users are hitting right now.

For bugs found during testing/staging that are *not* yet in production,
use `bugfix/*` against `develop` instead (see
[branch-management.md](branch-management.md)).

## Flow diagram

```
production issue detected
        │
        ▼
create hotfix branch from main
        │
        ▼
minimal fix only
        │
        ▼
run local checks
        │
        ▼
push hotfix branch
        │
        ▼
Jenkins smoke
        │
        ▼
QA focused verification
        │
        ▼
merge to main
        │
        ▼
production deploy
        │
        ▼
production smoke
        │
        ▼
back-merge main/hotfix into develop
```

## Step-by-step

| Step | What happens |
|------|---------------|
| production issue detected | Bug confirmed as live and urgent |
| create hotfix branch from main | `hotfix/*` branched from `main`, not `develop`, so it fixes exactly what is live |
| minimal fix only | Fix only the specific issue — no unrelated changes, no refactors |
| run local checks | Developer verifies the fix locally before pushing |
| push hotfix branch | Branch pushed to GitHub |
| Jenkins smoke | CI runs cloud smoke against the hotfix branch |
| QA focused verification | QA verifies specifically the reported issue and its immediate surroundings — not a full regression pass |
| merge to main | Hotfix merged into `main` |
| production deploy | `main` deploys to production |
| production smoke | Cloud smoke tests confirm production is healthy |
| back-merge main/hotfix into develop | The fix is merged back into `develop` |

## Why the back-merge matters

If the hotfix is merged into `main` but never brought back into
`develop`, `develop` still contains the old, broken code. The **next
regular release** (`develop` → `main`) can then overwrite `main` with that
old code — silently undoing the production fix.

Back-merging `main` (or the `hotfix/*` branch) into `develop` right after
the production deploy keeps both branches in sync and prevents this.

## Example hotfix branches

```
hotfix/login-prod-crash
hotfix/photo-upload-500
hotfix/cloud-db-health-check
```

## Hotfix vs. normal release

| Aspect | Hotfix flow | Normal release flow |
|--------|-------------|----------------------|
| Trigger | Live production issue | Planned feature/bugfix |
| Branched from | `main` | `develop` |
| Scope | Minimal, targeted fix | Full feature/bugfix |
| QA depth | Focused verification of the fix | Full acceptance + regression check |
| After merge | Back-merge into `develop` required | Already part of `develop` |
