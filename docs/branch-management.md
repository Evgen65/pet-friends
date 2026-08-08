# Branch Management Model — Pet Friends

This document defines the **target** branch model for Pet Friends. It is
written for QA engineers moving into automation/CI work, so it stays
practical and avoids full GitFlow theory.

> **Current reality vs. target model**
> As of Milestone 31, the project does **not** yet use this model in
> practice. Render deploys from `backend-preparation`, and `main`/`develop`
> are not yet the live integration/production branches. This document
> describes where we are heading. See [release-flow.md](release-flow.md)
> for how the migration will happen.

## Branch overview

| Branch      | Purpose                                   | Created from | Merges into      |
|-------------|--------------------------------------------|--------------|-------------------|
| `main`      | Production — stable, reviewed, tested code | —            | —                 |
| `develop`   | Integration branch for tested upcoming work | `main`       | `main` (via release) |
| `feature/*` | New features / planned improvements        | `develop`    | `develop`         |
| `bugfix/*`  | Non-urgent bugs found during test/staging  | `develop`    | `develop`         |
| `hotfix/*`  | Urgent production bugs                     | `main`       | `main`, then `develop` |

## main

- The production branch.
- Only stable, reviewed, and tested code should ever reach `main`.
- Eventually, Render production will deploy directly from `main` — but
  **not yet** in this milestone. Today, production still deploys from
  `backend-preparation`.

## develop

- The integration branch where tested, upcoming changes accumulate.
- Candidate branch for a staging/test environment.
- `feature/*` and `bugfix/*` branches merge here first, before anything
  reaches `main`.

## feature/*

- Used for new features and planned improvements.
- Created from `develop`.
- Merged back into `develop` once the work is complete and checked.

Examples:
```
feature/pet-story-comments
feature/admin-dashboard-improvements
```

## bugfix/*

- Used for non-urgent bugs found during test/staging (not production
  emergencies).
- Created from `develop`.
- Merged back to `develop` after checks.
- Included in the next regular release to `main`.

## hotfix/*

- Used for urgent production bugs that cannot wait for the normal release
  cycle.
- Created from `main` (not `develop`), since it must fix what is
  currently live.
- After validation, merged directly to `main` for an immediate
  production deploy.
- Then **back-merged into `develop`** so the fix is not lost in the next
  regular release.

See [hotfix-flow.md](hotfix-flow.md) for the full step-by-step flow.

## Simple flow diagram

```
main ────────●──────────────────────●──── (production)
              \                    /
hotfix/*       ●──────────────────●         (urgent fix, back-merged)
                                    \
develop ───●────●────●────●────●────●────── (integration)
            \    \    \    \
feature/*    ●    ●    ●    ●
                        \
bugfix/*                 ●
```

## Related documents

- [release-flow.md](release-flow.md) — normal feature → production flow
- [hotfix-flow.md](hotfix-flow.md) — urgent production fix flow
- [jenkins-pipeline-model.md](jenkins-pipeline-model.md) — CI behavior per branch type
