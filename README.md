# Childcare Compliance Portal

A Railway-ready Next.js/TypeScript SaaS foundation for centralized employee
training, certification, documentation, compliance status, alerts, reporting,
and audit history.

## Stack

- Next.js App Router and TypeScript
- Tailwind CSS
- Prisma with PostgreSQL
- Vercel Blob for private document intake
- Vitest for compliance engine tests
- Railway health check at `/api/health`

## Local Development

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database

Set `DATABASE_URL` to a Railway PostgreSQL connection string, then run:

```bash
npm run prisma:push
npm run prisma:seed
```

The Prisma schema is intentionally multi-tenant from day one. Core records carry
`organizationId`, and location-scoped records also carry `locationId` where the
business model needs it.

The seed creates the single operating location for this build: Kilgore, Texas.
It also mirrors the starter dashboard employee IDs so document uploads can be
audited against the production roster immediately.

## Document Storage

On Vercel, connect a Blob store to the project and enable access to system
environment variables so the SDK can use OIDC and `BLOB_STORE_ID`. For local
development or non-Vercel runtimes, set `BLOB_READ_WRITE_TOKEN` from your Vercel
Blob store. Training document uploads use private Blob objects and save document
metadata plus an audit row in PostgreSQL through `/api/documents/upload`.

## Railway

`railway.json` configures Nixpacks and uses `/api/health` for deployment health
checks. Add a Railway PostgreSQL service and set `DATABASE_URL` before applying
the schema and the seed script.

## Vercel

Add `DATABASE_URL` as a project environment variable pointing to the Railway
PostgreSQL connection string. The connected Blob store should provide
`BLOB_STORE_ID` as a system environment variable; add `BLOB_READ_WRITE_TOKEN`
only if you need the static-token fallback.

Set `NEXTAUTH_SECRET` to a long random value. Set `PORTAL_ACCESS_CODE` to the
temporary sign-in code for seeded users; local development defaults to `demo`
when the variable is omitted.

## Auth and Roles

Seeded users:

- `director@ghostaisolutions.com` with `LOCATION_DIRECTOR`
- `auditor@ghostaisolutions.com` with `AUDITOR`
- `jane.smith@ghostaisolutions.com` with `EMPLOYEE`

The app uses a signed HTTP-only session cookie. Admin/director/compliance roles
can manage employees, training, certifications, rules, documents, and imports.
Auditors can read audit and rule data. Employees can view their own profile and
upload their own documents.

## Data APIs

- `/api/employees` for persisted employee list and create
- `/api/employees/[id]` for profile read, update, and soft remove
- `/api/training` for separate approved training records
- `/api/certifications` for CPR/First Aid certificate upserts
- `/api/documents/upload` for private Blob uploads with document metadata
- `/api/compliance-rules` for configurable annual and instructor-led hours
- `/api/imports/workbook` for CSV/TSV workbook staging
- `/api/imports/workbook/[id]/commit` for committing staged rows
- `/api/audit` for operational audit history

Employee profile pages live at `/employees/[id]` and include overview,
training, certifications, documents, compliance, and activity sections.

## Current Product Slice

- Director dashboard with compliance metrics and risk list
- Employee self-service preview
- Auditable activity feed
- Private document uploads backed by Vercel Blob and PostgreSQL metadata
- Signed login with role-aware API permission checks
- Employee profile pages with training, certification, document, compliance,
  and activity sections
- Workbook import staging before commit
- Compliance engine with explicit `UNKNOWN` handling
- Prisma data model for organizations, locations, RBAC, employees, rule sets,
  training records, certifications, documents, alerts, and audit logs

## Verification

```bash
npm run lint
npm run test
npm run build
```
