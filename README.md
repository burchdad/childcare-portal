# Childcare Compliance Portal

A Railway-ready Next.js/TypeScript SaaS foundation for centralized employee
training, certification, documentation, compliance status, alerts, reporting,
and audit history.

## Stack

- Next.js App Router and TypeScript
- Tailwind CSS
- Prisma with PostgreSQL
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
npm run prisma:migrate
```

The Prisma schema is intentionally multi-tenant from day one. Core records carry
`organizationId`, and location-scoped records also carry `locationId` where the
business model needs it.

## Railway

`railway.json` configures Nixpacks and uses `/api/health` for deployment health
checks. Add a Railway PostgreSQL service and set `DATABASE_URL` before applying
migrations.

## Current Product Slice

- Director dashboard with compliance metrics and risk list
- Employee self-service preview
- Auditable activity feed
- Compliance engine with explicit `UNKNOWN` handling
- Prisma data model for organizations, locations, RBAC, employees, rule sets,
  training records, certifications, documents, alerts, and audit logs

## Verification

```bash
npm run lint
npm run test
npm run build
```
