# HazeWatch — Setup and Technical Reference

Malaysia-first air-quality and haze intelligence. It reads official observations, stores an hourly archive, and explains what changed with rules you can audit. Official forecasts are linked as official products — never rewritten as invented numbers.

**Live preview mode:** with no credentials, the app reads APIMS directly and archives nothing. OpenFreeMap maps need no key; storage and Gemini are optional layers.

## What it does

- **National snapshot** at one complete hour: median API, category counts, highest station, coverage.
- **Station map and searchable index** for every published APIMS station, with readings, timestamps and recent sparklines.
- **Station detail** with 24-hour series, 6-hour trend rule, 24-hour peak, category boundary, source class and nearby stations.
- **Pinned station** stored in the browser only; no account or server-side preference.
- **Air quality near you**: an opt-in "Use my location" button on the station index finds the closest stations with a current reading. The position is used in the browser only and is never sent or stored.
- **Health guidance** on each station page: general precautions for the official API band, with an audience toggle (everyone, outdoor work, school and sport, higher risk). Not medical advice.
- **Observed momentum** list: stations whose API rose at least 10 points over about six hours.
- **Plain-language briefings** generated from verified facts; deterministic fallback always available.
- **Official forecast panel** for MyCMAQ map cycles, with numeric forecast analysis deliberately disabled.
- **OpenDOSM national history** charted separately from station observations.

## Integrity rules

| Layer | Source | What we do |
| --- | --- | --- |
| Observation | DOE APIMS | Store hourly API values, coordinates and source class. Never fill missing readings. |
| Official forecast | MetMalaysia MyCMAQ | Record cycle metadata and link to the official viewer. No numeric extraction from images. |
| HazeWatch insight | Our rules | Compare observed hours with fixed thresholds. Label as ours. Not a forecast or warning. |

- API bands are Malaysia's official scale: 0–50 Good, 51–100 Moderate, 101–200 Unhealthy, 201–300 Very Unhealthy, >300 Hazardous.
- A published APIMS class label wins over the numeric band; a mismatch is shown on the station page.
- APIMS timestamps are Malaysia wall-clock text. They are interpreted as UTC+8. The source's epoch field is not treated as the observation instant.
- Trend rule: latest reading vs the reading closest to six hours earlier (±90 minutes). A change of at least ±10 API points is a trend; otherwise stable.
- Missing or zero readings are not treated as clean air.
- No custom ML model. Gemini only rewrites supplied facts and is validated against them.

## Stack

- Next.js 16 App Router, React 19, TypeScript (strict), Tailwind CSS 4
- Supabase PostgreSQL for observations, locations, forecast runs, monthly history and ingestion logs
- Recharts for charts; MapLibre GL JS with OpenFreeMap for the basemap
- Gemini Interactions API for optional explanations
- Supabase Cron for hourly collection and the daily digest

## Project layout

```
app/
  page.tsx                    National overview
  stations/page.tsx           Map + searchable station index
  stations/[stationId]/page.tsx
  history/page.tsx            OpenDOSM monthly context
  methodology/page.tsx        Method, limits, setup
  api/ingest/route.ts         Authenticated collection endpoint
  api/explain/route.ts        Validated Gemini explanation endpoint
components/                   UI, map, charts, explorer, explainer
lib/
  apims.ts                    APIMS adapters + validation
  mycmaq.ts                   Forecast cycle discovery
  opendosm.ts                 Monthly catalogue adapter
  analysis.ts                 Trend and freshness rules
  data.ts                     Storage/live repository
  ingest.ts                   Idempotent collection
  explain.ts                  Facts, rules, Gemini + guards
supabase/migrations/0001_init.sql
 tests/                       Vitest unit tests
```

## Quick start

```bash
npm install
cp .env.example .env.local     # Windows: copy .env.example .env.local
npm run dev
```

Open http://localhost:3000. No keys are required for live preview mode.

Quality gates:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor** and run `supabase/migrations/0001_init.sql`.
3. Add to `.env.local` (and Vercel project settings):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
CRON_SECRET=<long-random-string>
```

4. Run the collector once:

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Authorization: Bearer $CRON_SECRET"
```

The response lists each source with `accepted` and `rejected` counts. The dashboard switches from “Live preview” to “Stored archive” after the first successful run.

### What the collector writes

- `locations` — station identity, state, coordinates; upserted by `source_id + external_id`.
- `observations` — hourly API values; unique on `location_id + metric + observed_at`, so re-runs update rather than duplicate.
- `forecast_runs` — latest MyCMAQ cycle and manifest summary; unique on `source_id + external_cycle_id`.
- `monthly_air_pollution` — OpenDOSM monthly rows; unique on source, country, month, pollutant.
- `ingestion_runs` — one row per source per collection, including failures.
- `daily_digests` — one summary per Malaysia calendar day, including the facts it was written from.

Public tables have RLS enabled with read-only policies. `ingestion_runs` has no public policy. The service-role key stays server-side.

## Scheduling

### Supabase Cron

Enable `pg_cron` and `pg_net` in the Supabase dashboard, then (replace the URL and secret):

```sql
select vault.create_secret('https://your-app.vercel.app/api/ingest', 'hazewatch_url');
select vault.create_secret('<CRON_SECRET>', 'hazewatch_cron_secret');

select cron.schedule(
  'hazewatch-ingest',
  '15 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'hazewatch_url'),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'hazewatch_cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
```

`pg_net` stores request headers in a queue; restrict database roles that can read that queue. Collection is bounded and sequential per state to stay gentle on APIMS.

### Daily digest

`/api/digest` writes one summary for the previous Malaysia day. It is protected by the same `CRON_SECRET`. Add a second Supabase Cron entry after the hourly ingestion job:

```sql
select cron.schedule(
  'hazewatch-daily-digest',
  '15 16 * * *', -- 00:15 Malaysia time, just after the day closes
  $$
  select net.http_post(
    url := replace(
      (select decrypted_secret from vault.decrypted_secrets where name = 'hazewatch_url'),
      '/api/ingest',
      '/api/digest'
    ),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'hazewatch_cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
```

Rebuild a specific day manually:

```bash
curl -X POST https://your-app.vercel.app/api/digest \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"day":"2026-10-25"}'
```

All numbers are computed from stored observations first. Gemini only rewrites that facts JSON; if the key is missing, the request fails, the output breaks the number guard, or the model is slow, the route stores a rule-based summary instead. The page reads the stored row, so visitors never trigger a Gemini call.

## Map configuration

MapLibre GL JS loads OpenFreeMap's light Positron style without an API key. Both the overview and station index use the same map and verified APIMS station data. Search and state filters update the markers and list together. Selecting either a marker or a list button shows the station reading, category, timestamp, freshness and history link.

`lib/map.ts` contains the provider style URL. Replacement styles must retain attribution in their source metadata; MapLibre displays it automatically. OpenFreeMap, OpenMapTiles and OpenStreetMap are credited by the map control. MapLibre CSS is imported in `app/globals.css`; its version-matched worker is emitted as a local asset by Next.js.

The map needs WebGL and access to the provider's style, glyphs, sprites and tile endpoints. Loading failures offer a retry; the station list and details panel remain usable. Missing readings display a dash with “No reading”; numeric zero is not converted to missing data. No synthetic stations or readings are added.

Gemini remains an optional server-side explanation layer, separate from the map.

## Gemini setup

1. Create an API key in Google AI Studio.
2. Set server-side environment variables:

```env
GEMINI_API_KEY=<server-key>
GEMINI_MODEL=gemini-3.8-flash
```

3. The app calls the documented Interactions API over HTTPS with `store: false`, structured JSON output and a 15-second timeout.

Safety and determinism:

- Facts are built from stored observations and our computed trend; the model receives nothing else.
- Output is validated with Zod against a fixed schema.
- Every number in the output must already exist in the supplied facts, or the response is rejected.
- On any failure the server returns a rule-based briefing and labels it as such.
- Explanations are cached per station/hour and rate-limited per IP.

Without a key, the rule-based briefing is shown and the UI says Gemini is not configured.

## Deployment

1. Push the repository to GitHub and import it into Vercel.
2. Add the environment variables from `.env.example`.
3. Deploy, then trigger `/api/ingest` once and confirm the dashboard reads from Supabase.
4. Keep `CRON_SECRET` long and random; rotate it if leaked.

## Tests

99 unit tests cover:

- Malaysia wall-clock parsing, round-trips and impossible dates
- API category boundaries and source-class normalisation
- Trend rule: worsening, improving, stable, tolerance, insufficient history, peak window, insight ordering
- APIMS payload validation, out-of-Malaysia rejection, missing readings, class precedence
- MyCMAQ cycle extraction and public-frame summarising
- OpenDOSM pollutant normalisation, units, invalid dates, null preservation
- Monthly chart shaping, latest values, nearest-station ordering
- Map coordinate guards and missing-versus-zero reading labels
- Health guidance coverage for every band and audience, with no advice for missing readings
- Nearest-station ranking, skipped empty stations and out-of-network visitors
- Gemini fact-number guard and deterministic fallbacks

`npm run lint`, `npm run typecheck`, `npm test` and `npm run build` are expected to pass.

## Known limits

- APIMS endpoints are publicly reachable but undocumented; schema, limits and retention may change.
- No numeric MyCMAQ feed is verified, so forecast peaks, numeric forecast timelines and forecast alerts are disabled.
- MyCMAQ LST labels are stored verbatim; their numerical offset is not confirmed.
- ASMC content is not ingested because its terms restrict automated collection without permission.
- Stored history starts when collection starts; early charts are short and labelled accordingly.
- Live preview paces state requests and retries throttled ones (HTTP 429/503); if a state still fails, its stations show a thinner series with a visible partial-refresh notice.
- HazeWatch is not an official government service, forecast provider or warning system.

## Attribution

- Air Pollutant Index data: Department of Environment (DOE), Malaysia — APIMS.
- Forecast maps: Malaysian Meteorological Department (MetMalaysia) — MyCMAQ.
- Monthly air pollution catalogue: Department of Statistics Malaysia — OpenDOSM, CC BY 4.0.
- Basemap: OpenFreeMap, © OpenMapTiles, © OpenStreetMap contributors; rendered with MapLibre GL JS.

See `/methodology` for the in-app version of these limits.
