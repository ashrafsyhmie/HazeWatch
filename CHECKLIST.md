# HazeWatch — build checklist

_Last updated: 2026-10-25_

## Status

| Area | State | Notes |
| --- | --- | --- |
| Next.js 16 + Tailwind 4 scaffold | Done | Strict TypeScript, App Router |
| APIMS current + hourly adapters | Done | Validated, unit tested |
| Malaysia-time normalisation | Done | Wall clock treated as UTC+8; epoch ignored |
| Category classification | Done | Official API bands; source class precedence |
| Trend rules | Done | ±10 points over ~6h, 90-min tolerance |
| Supabase schema + RLS | Done | `supabase/migrations/0001_init.sql` |
| Idempotent collection | Done | Upsert keys + per-source ingestion logs |
| National dashboard | Done | Snapshot, counts, map, insights, AI, forecast |
| Station explorer + detail | Done | MapLibre/OpenFreeMap + searchable fallback |
| Recharts history | Done | Station trend and OpenDOSM monthly |
| Local preferred station | Done | Browser-only localStorage; no account |
| Gemini explanations | Done (code) | Schema + number guard + rule fallback |
| Station map | Done (code) | OpenFreeMap, no key; list fallback |
| MyCMAQ official context | Done | Cycle + manifest metadata + link only |
| OpenDOSM monthly context | Done | Separate from station data |
| Scheduled collection | Done (code) | `/api/ingest`, scheduled with Supabase Cron |
| Health guidance by audience | Done | `lib/guidance.ts`, station page panel; general precautions only |
| Nearest station from location | Done | Opt-in, browser-only geolocation on `/stations` |
| Unit tests | Done | 99 tests |
| Lint / typecheck / build | Done | All gates pass |

## External verification still required

- [ ] **Supabase project + keys** — apply migration, run `/api/ingest`, confirm stored archive.
- [ ] **Vercel project** — deploy and set application environment variables.
- [ ] **Map provider** — confirm tiles and attribution are reachable from the deployment.
- [ ] **Gemini key** — confirm live rewrite succeeds and still passes the number guard.
- [ ] **Cron schedule** — confirm the hourly ingestion and daily digest jobs run from Supabase Cron.
- [ ] **Health guidance review** — have the team check the wording against current MOH/DOE advisories before launch.

## Deliberately not built

- Numeric forecast timelines, forecast peaks and forecast-based alerts: no verified machine-readable MyCMAQ feed.
- Image-derived forecast numbers: would fabricate precision from rendered maps.
- ASMC ingestion: terms restrict automated collection/reuse without permission.
- Custom ML models: out of scope; trend rules are deterministic.
- User accounts: preferred location would be local-only; not required for current scope.
- `forecast_assets` table: manifest summaries live in `forecast_runs.meta` to avoid an unused table.

## Milestone report

**Works without credentials:** national dashboard, live APIMS snapshot, 25-hour series, station explorer, station detail, category rules, trend rule, deterministic briefings, pinned station, MyCMAQ cycle discovery, OpenDOSM history, methodology page.

**Remaining:** external credential verification (Supabase, Maps, Gemini, Vercel), visual map check, production cron confirmation.

**Tests passed:** APIMS parsing/rejection, API boundaries, wall-clock round trips, trend directions/tolerance/peak, insight ordering, MyCMAQ cycles/manifests, OpenDOSM normalisation, monthly shaping, nearest stations, Gemini number guard, fallback text.

**Blockers:** numeric forecast feed unverified; MyCMAQ reuse terms not established; APIMS contract undocumented; no Google/Supabase credentials configured in this workspace.
