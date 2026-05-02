# Threat Intelligence Dashboard

A full-stack cybersecurity SOC (Security Operations Center) dashboard for banking IT teams.

## Architecture

**Monorepo (pnpm workspaces):**
- `artifacts/threat-dashboard` — React + Vite frontend (preview at `/`)
- `artifacts/api-server` — Express 5 API server (at `/api`)
- `lib/db` — Drizzle ORM + PostgreSQL schema
- `lib/api-spec` — OpenAPI spec + orval codegen config
- `lib/api-client-react` — Generated React Query hooks + custom fetch
- `lib/api-zod` — Generated Zod validation schemas

## Features

- **JWT Auth** — Login with username/password, 24-hour tokens stored in localStorage
- **Role-Based Access** — Admin / Analyst / Viewer with enforced permissions
- **Threat Lookup** — Submit IP, URL, domain, or hash → checks VirusTotal, AlienVault OTX, AbuseIPDB → unified risk score 0-100
- **Dashboard** — Stats cards, 14-day scan trend chart, risk breakdown donut, recent activity feed
- **Scan History** — Searchable/filterable table of all scans with source breakdown
- **Alert Management** — Auto-generated for high-risk scans; resolve/reopen with audit trail
- **SOC Cheatsheet** — 106 resources across 4 categories (IP Check, URL Check, Malware Check, CTI)
- **Admin: User Management** — Create/edit/delete users, role assignment, active toggle
- **Admin: Activity Logs** — Full audit trail of all user actions

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS v4, Radix UI, Recharts, React Query, wouter
- **Backend:** Express 5, JWT (jsonwebtoken), bcryptjs, Pino logging
- **Database:** PostgreSQL, Drizzle ORM
- **Codegen:** OpenAPI → orval → React Query hooks + Zod schemas

## Database Schema

- `users` — id, username, email, full_name, password_hash, role, is_active, last_login
- `scans` — id, user_id, indicator_type, indicator_value, risk_score, risk_level, status, sources (JSONB), notes
- `alerts` — id, scan_id, indicator_type/value, severity, message, status, resolved_by, resolved_at
- `soc_resources` — id, category, name, url, description
- `activity_logs` — id, user_id, username, action, details, ip_address

## Seed Credentials

| Username  | Password      | Role     |
|-----------|---------------|----------|
| admin     | Admin@123!    | admin    |
| analyst1  | Analyst@123!  | analyst  |
| analyst2  | Analyst@123!  | analyst  |
| viewer1   | Viewer@123!   | viewer   |

## Environment Variables

- `SESSION_SECRET` — JWT signing secret (required in production)
- `DATABASE_URL` — PostgreSQL connection string (auto-provided by Replit)
- `VIRUSTOTAL_API_KEY` — Optional; enables real VT scans (simulated if absent)
- `ABUSEIPDB_API_KEY` — Optional; enables real AbuseIPDB checks
- `OTX_API_KEY` — Optional; enables real AlienVault OTX checks

## Codegen

When OpenAPI spec changes, regenerate hooks:
```bash
pnpm --filter @workspace/api-spec run codegen
```

## DB Schema Changes

```bash
pnpm --filter @workspace/db run push
```
