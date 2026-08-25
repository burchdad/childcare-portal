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

Set `BLOB_READ_WRITE_TOKEN` from your Vercel Blob store. Training document
uploads use private Blob objects and save document metadata plus an audit row in
PostgreSQL through `/api/documents/upload`.

## Railway

`railway.json` configures Nixpacks and uses `/api/health` for deployment health
checks. Add a Railway PostgreSQL service and set `DATABASE_URL` before applying
the schema and the seed script.

## Vercel

Add both `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` as project environment
variables. `DATABASE_URL` can point to the Railway PostgreSQL connection string,
and `BLOB_READ_WRITE_TOKEN` should come from the Vercel Blob store connected to
the project.

## Current Product Slice

- Director dashboard with compliance metrics and risk list
- Employee self-service preview
- Auditable activity feed
- Private document uploads backed by Vercel Blob and PostgreSQL metadata
- Compliance engine with explicit `UNKNOWN` handling
- Prisma data model for organizations, locations, RBAC, employees, rule sets,
  training records, certifications, documents, alerts, and audit logs

## Verification

```bash
npm run lint
npm run test
npm run build
```
