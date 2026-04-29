# Codex Progress

Last updated: 2026-04-29

## Summary

The project is now in a materially stronger state on the backend. The core loan operations API is in place, the main brownfield backend modules are implemented, role-based access control is enforced at the route layer, operational reporting and observability modules exist, and the backend compiles and passes its current Jest suite.

The frontend directory also exists as a separate internal operations application, but the most recent work has been concentrated on backend completion and backend contract hardening.

## What Has Been Accomplished

### Backend foundation and core modules

- Express + TypeScript backend structure is active under `backend/`.
- JWT authentication and bcrypt password handling are implemented.
- Swagger/OpenAPI is exposed for the API.
- Shared error handling, logging, validation, config loading, rate limiting, and database initialization are in place.

### Business modules implemented

The backend currently contains these modules under `backend/src/modules`:

- `auth`
- `users`
- `borrowers`
- `borrower_kyc`
- `loans`
- `repayments`
- `activity_logs`
- `notifications`
- `dashboard`
- `reports`

### Auth and RBAC

- `POST /api/v1/auth/login` returns the required verified envelope:
  - `success`
  - `data.user`
  - `data.token`
- `requireRole(...roles)` and `requireAnyAuthenticatedRole` middleware are implemented.
- Protected routes are wired with role checks aligned to the current RBAC matrix.
- Forbidden access returns the standard 403 error envelope used by the frontend denied state.

### List endpoints and query model

Pagination, sorting, filtering, and search are implemented for:

- `/api/v1/users`
- `/api/v1/borrowers`
- `/api/v1/loans`
- `/api/v1/repayments`
- `/api/v1/activity-logs`
- `/api/v1/notifications/deliveries`

The shared list response shape now follows:

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalItems": 0,
      "totalPages": 1
    }
  }
}
```

### Composite read endpoints

The following composite endpoints are implemented:

- `GET /api/v1/borrowers/:borrower_id/profile`
- `GET /api/v1/borrowers/:borrower_id/loans`
- `GET /api/v1/loans/:loan_id/details`
- `GET /api/v1/loans/:loan_id/repayments`

### Reports and dashboard

Dashboard summary is implemented:

- `GET /api/v1/dashboard/portfolio-summary`

Reports are implemented with `json`, `csv`, and `xlsx` support:

- `GET /api/v1/reports/loan-portfolio`
- `GET /api/v1/reports/borrower-register`
- `GET /api/v1/reports/kyc-completeness`
- `GET /api/v1/reports/disbursement`
- `GET /api/v1/reports/approval-outcome`
- `GET /api/v1/reports/repayment`
- `GET /api/v1/reports/arrears`
- `GET /api/v1/reports/collections-performance`
- `GET /api/v1/reports/import-exceptions`

Attachment exports set `Content-Disposition` for browser download flows.

### Activity log and notifications

- `ActivityLogService.record()` exists and is wired into emitting flows.
- `NotificationService.publish()` exists and persists `notification_deliveries`.
- Admin-only read endpoints are implemented for:
  - activity logs
  - notification deliveries
- Login, user, borrower KYC, loan, repayment, and import flows now emit operational events.

### Borrower KYC and storage

- Borrower KYC upload is implemented against S3.
- KYC read endpoints return signed URLs and `expiresAt`.
- S3 KYC keys follow the borrower/document-type path convention:
  - `kyc/<borrower_id>/<document_type>/<uuid>.<ext>`

### Loan and repayment operational flows

The Excel-based loan workflows remain intact and are supported in the API:

- loan intake import
- loan approval import
- loan repayment import

Additional backend hardening completed:

- import summaries now expose explicit `successCount` and `failureCount`
- repayment create/update/delete mutate parent loan balances transactionally
- repayment status is derived server-side

### Database and migrations

An additive migration was added for:

- `activity_logs`
- `notification_deliveries`
- missing secondary indexes required by the current system behavior

### Tests added

Backend Jest coverage now includes focused tests for:

- auth middleware and role denial behavior
- login response shape
- report export behavior
- transactional repayment service behavior

## Current State

### Backend

Current backend status:

- TypeScript build passes
- Jest suite passes
- Swagger wiring is present
- RBAC, list-query retrofit, composite endpoints, reports, activity logs, and notifications are implemented in code

Known backend status qualifiers:

- The new observability migration has been created but has not been applied against a live MySQL database in this session.
- End-to-end runtime verification against live MySQL, S3, and Resend has not been performed in this session.
- Test coverage exists, but it is still narrow relative to total backend surface area.

### Frontend

Current frontend status:

- A separate frontend application exists under `frontend/`
- It uses a Next.js App Router structure for internal operations screens
- The recent effort has not included a full end-to-end revalidation of frontend-to-backend integration against the newly completed backend slices

### Documentation and agent guidance

- The agent implementation guide was updated with an accepted brownfield deviation note for:
  - Joi
  - `xlsx`
  - Sequelize

## Immediate Next Steps

### 1. Apply and verify database changes

- Run backend migrations against the target MySQL database
- Confirm:
  - `activity_logs` table exists
  - `notification_deliveries` table exists
  - required indexes are present

### 2. Run manual smoke flows against real services

- login
- borrower create/update
- borrower KYC upload and retrieval
- loan create/update
- all three Excel import flows
- repayment create/update/delete
- dashboard and report exports

This should be done against real MySQL and, where available, real S3 and Resend configuration.

### 3. Expand backend test coverage

Priority coverage gaps:

- loan import services
- borrower composite endpoints
- activity log listing filters
- notification delivery listing filters
- reports calculation paths
- auth service edge cases

### 4. Reconcile frontend integration with current backend contracts

- verify auth flow against the final login response shape
- verify denied-state handling on 403s
- wire list views to the standardized query model
- wire report exports to the `csv` / `xlsx` attachment endpoints
- add UI coverage for activity logs and notification deliveries if required in the current slice plan

### 5. Perform end-to-end operational validation

Before calling the system slice-complete, validate:

- role enforcement for every protected route
- import summary handling in the frontend
- signed KYC URL expiry behavior
- notification persistence on success and failure paths
- repayment balance mutation integrity under update and delete flows

## Recommended Working Position

The backend is ready for the next phase of integration and operational validation. The priority is no longer basic scaffolding. The priority is:

1. applying migrations
2. validating runtime behavior against real infrastructure
3. expanding coverage around the larger loan/report/import surface
4. aligning the frontend against the now-stabilized backend contracts
