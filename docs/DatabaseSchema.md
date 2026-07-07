# Database Schema

TeamFlow uses MongoDB via Mongoose. Mongoose does not use SQL-style migration files —
schemas are defined declaratively in code (`server/src/models/`) and enforced at the
application layer plus a small number of unique indexes. This document is the
schema-of-record referenced by the ERD in the design document.

## Collections

### User
| Field | Type | Notes |
|---|---|---|
| name | String | required |
| email | String | required, **unique index**, lowercase, trimmed |
| passwordHash | String | required, bcrypt |
| role | String | enum: `admin`, `member`, `viewer` — **global** role, default `member`; cannot be self-assigned via `POST /auth/register` |
| emailOptOut | Boolean | default `false` |
| timestamps | | createdAt / updatedAt |

### Project
| Field | Type | Notes |
|---|---|---|
| name | String | required |
| description | String | |
| owner | ObjectId → User | required |
| members | [{ user: ObjectId → User, role: String }] | embedded subdocuments; role enum: `admin`, `member`, `viewer`; owner is auto-inserted here on creation |
| viewPreference | String | enum: `kanban`, `list`, `calendar` — project-level default, distinct from the per-user preference below |

### ProjectPreference
| Field | Type | Notes |
|---|---|---|
| user | ObjectId → User | required |
| project | ObjectId → Project | required |
| viewPreference | String | enum: `kanban`, `list`, `calendar` |
| theme | String | enum: `light`, `dark` |
| — | | **unique compound index** on `(user, project)` — one row per user per project |

### Task
| Field | Type | Notes |
|---|---|---|
| title | String | required |
| description | String | |
| status | String | enum: `todo`, `in_progress`, `done` |
| priority | String | enum: `low`, `medium`, `high` |
| assignee | ObjectId → User | |
| dueDate | Date | |
| project | ObjectId → Project | required — the task's "home" project |
| parent | ObjectId → Task | **self-reference**, optional — used for subtasks |
| blockedBy | [ObjectId → Task] | tasks that must be Done before this one can be |
| blocks | [ObjectId → Task] | inverse of blockedBy, maintained on the same call |
| attachments | [{ url: String, name: String }] | embedded |
| comments | [{ author: ObjectId → User, body: String, parentComment: ObjectId (**self-reference**, nullable), createdAt: Date }] | embedded, threaded |
| mentions | [ObjectId → User] | users @mentioned across the task's comments |

**Business-rule constraint (enforced in `routes/tasks.js`, not the schema layer):**
a task cannot transition to `done` while any `blockedBy` task is not `done`, or while any
other task has this one as its `parent` and is not `done`. Both return a specific `reason`
code (`OPEN_BLOCKERS` / `OPEN_SUBTASKS`) rather than a generic 400.

### TaskRelation
| Field | Type | Notes |
|---|---|---|
| fromTask | ObjectId → Task | required |
| toTask | ObjectId → Task | required |
| type | String | enum: `blocks`, `blocked_by` |
| — | | **unique compound index** on `(fromTask, toTask, type)` |

Kept as an explicit, queryable relation record alongside the `blockedBy`/`blocks` arrays on
`Task` (see Design Decisions for why both exist).

### ProjectTaskLink
| Field | Type | Notes |
|---|---|---|
| project | ObjectId → Project | required |
| task | ObjectId → Task | required |

Represents "this task also appears on this project's board," without duplicating the task
document — the task's canonical home is still `Task.project`.

### Rca
| Field | Type | Notes |
|---|---|---|
| task | ObjectId → Task | required — the RCA is always tied to a task |
| title | String | required |
| timeline | String | one of four fixed structured sections |
| contributingFactors | String | |
| correctiveActions | String | |
| preventiveMeasures | String | |
| owner | ObjectId → User | |
| reviewers | [ObjectId → User] | assigned at submit time |
| reviews | [{ reviewer: ObjectId → User, decision: String (`approved`/`rejected`), comment: String (**required**), createdAt: Date }] | embedded |
| status | String | enum: `draft`, `submitted`, `reviewed` |
| attachments | [{ url, name }] | editable only while `status === 'draft'` and caller is the owner |
| comments | [{ author, body, parentComment, createdAt }] | same shape as Task comments |

**Business-rule constraints (enforced in `routes/rca.js`):**
- Cannot submit without at least one reviewer.
- Every review decision requires a non-empty `comment`.
- Status only advances to `reviewed` once **every** assigned reviewer has approved; a single
  `rejected` decision keeps status at `submitted` rather than closing it.
- Admin override (`POST /rca/:id/override`) can reassign reviewers or force-close, and is
  logged as a distinct `ActivityLog` action (`RCA_ADMIN_OVERRIDE`) so it's never confused
  with a normal reviewer sign-off in the audit trail.

### Notification
| Field | Type | Notes |
|---|---|---|
| user | ObjectId → User | recipient |
| type | String | e.g. `task_assignment`, `task_status_change`, `mention`, `rca_review_decision` |
| message | String | |
| entityId | String | the task/RCA this notification is about — used for deduplication |
| isRead | Boolean | default `false` |

**Deduplication rule:** a notification is suppressed if one with the same
`(user, type, entityId)` was created within the last 10 minutes.

### ActivityLog
| Field | Type | Notes |
|---|---|---|
| entityType | String | `task` or `rca` |
| entityId | ObjectId | |
| actor | ObjectId → User | |
| action | String | e.g. `TASK_CREATED`, `TASK_DEPENDENCIES_UPDATED`, `RCA_REVIEW_DECISION`, `RCA_ADMIN_OVERRIDE` |
| payload | Mixed | free-form details of what changed |
| createdAt | Date | append-only — rows are never updated or deleted |

## Indexes

| Collection | Index | Purpose |
|---|---|---|
| User | `email` (unique) | prevent duplicate accounts, fast login lookup |
| ProjectPreference | `(user, project)` (unique) | one preference row per user per project |
| TaskRelation | `(fromTask, toTask, type)` (unique) | prevent duplicate relation rows |

## Why no separate `ProjectMember`, `Comment`, `Attachment`, or `Review` collections

These are modeled as **embedded subdocuments** rather than top-level collections. See the
Design Decisions Log in `TeamFlow-Design-Document.pdf` for the full reasoning — in short,
each one is always read and written in the context of its single parent (a project's
members, a task's comments, an RCA's reviews), never queried independently across parents,
so embedding avoids a join for the common case at the cost of not being able to cheaply
query "all comments by user X across every task" — a query TeamFlow doesn't need.
