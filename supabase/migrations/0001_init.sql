-- HazeWatch initial schema
-- Run in the Supabase SQL editor or via `supabase db push`.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------

create table if not exists public.sources (
  id text primary key,
  name text not null,
  country_code text not null default 'MY',
  attribution text not null,
  source_url text not null,
  terms_url text,
  notes text,
  created_at timestamptz not null default now()
);

insert into public.sources (id, name, country_code, attribution, source_url, terms_url, notes)
values
  (
    'doe-apims',
    'Department of Environment — APIMS',
    'MY',
    'Air Pollutant Index of Malaysia, Department of Environment (DOE)',
    'https://eqms.doe.gov.my/apims/main',
    'https://www.doe.gov.my/en/open-government-data/',
    'Undocumented but publicly reachable JSON endpoints used by the MyEQMS portal. Collected server-side.'
  ),
  (
    'metmalaysia-mycmaq',
    'MetMalaysia — MyCMAQ',
    'MY',
    'Operational air quality forecast, Malaysian Meteorological Department',
    'https://mycmaq.met.gov.my/',
    null,
    'Only forecast map cycles are recorded. No numerical feed is used.'
  ),
  (
    'opendosm',
    'OpenDOSM — Monthly Air Pollution',
    'MY',
    'Monthly air pollution, Department of Statistics Malaysia (CC BY 4.0)',
    'https://open.dosm.gov.my/data-catalogue/air_pollution',
    'https://creativecommons.org/licenses/by/4.0/',
    'National monthly concentrations, no station dimension.'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Stations, observations, forecasts, history, ingestion health
-- ---------------------------------------------------------------------------

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.sources (id),
  external_id text not null,
  name text not null,
  state_name text,
  state_id integer,
  country_code text not null default 'MY',
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  status text not null default 'active',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (source_id, external_id)
);

create index if not exists locations_country_state_idx
  on public.locations (country_code, state_name);

create table if not exists public.observations (
  id bigint generated always as identity primary key,
  location_id uuid not null references public.locations (id) on delete cascade,
  metric text not null,
  value double precision not null,
  unit text not null,
  index_scheme text not null,
  observed_at timestamptz not null,
  retrieved_at timestamptz not null default now(),
  source_class text,
  source_symbol text,
  quality text not null default 'ok',
  unique (location_id, metric, observed_at)
);

create index if not exists observations_lookup_idx
  on public.observations (location_id, metric, observed_at desc);

create index if not exists observations_recent_idx
  on public.observations (observed_at desc);

create table if not exists public.forecast_runs (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.sources (id),
  external_cycle_id text not null,
  initialized_at timestamptz,
  issued_at timestamptz,
  retrieved_at timestamptz not null default now(),
  source_url text not null,
  meta jsonb not null default '{}'::jsonb,
  unique (source_id, external_cycle_id)
);

create index if not exists forecast_runs_recent_idx
  on public.forecast_runs (source_id, initialized_at desc);

create table if not exists public.monthly_air_pollution (
  id bigint generated always as identity primary key,
  source_id text not null references public.sources (id),
  country_code text not null default 'MY',
  month date not null,
  pollutant text not null,
  concentration double precision,
  unit text not null,
  retrieved_at timestamptz not null default now(),
  unique (source_id, country_code, month, pollutant)
);

create index if not exists monthly_air_pollution_lookup_idx
  on public.monthly_air_pollution (country_code, pollutant, month);

create table if not exists public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_id text references public.sources (id),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running'
    check (status in ('running', 'success', 'partial', 'failed', 'skipped')),
  http_status integer,
  accepted integer not null default 0,
  rejected integer not null default 0,
  error text,
  details jsonb not null default '{}'::jsonb
);

create index if not exists ingestion_runs_recent_idx
  on public.ingestion_runs (started_at desc);

-- ---------------------------------------------------------------------------
-- Row level security: public read, privileged writes only
-- ---------------------------------------------------------------------------

alter table public.sources enable row level security;
alter table public.locations enable row level security;
alter table public.observations enable row level security;
alter table public.forecast_runs enable row level security;
alter table public.monthly_air_pollution enable row level security;
alter table public.ingestion_runs enable row level security;

drop policy if exists "Public read sources" on public.sources;
create policy "Public read sources" on public.sources for select using (true);

drop policy if exists "Public read locations" on public.locations;
create policy "Public read locations" on public.locations for select using (true);

drop policy if exists "Public read observations" on public.observations;
create policy "Public read observations" on public.observations for select using (true);

drop policy if exists "Public read forecast runs" on public.forecast_runs;
create policy "Public read forecast runs" on public.forecast_runs for select using (true);

drop policy if exists "Public read monthly pollution" on public.monthly_air_pollution;
create policy "Public read monthly pollution" on public.monthly_air_pollution for select using (true);

-- ingestion_runs intentionally has no public policy: operational logs stay private.

grant select on public.sources to anon, authenticated;
grant select on public.locations to anon, authenticated;
grant select on public.observations to anon, authenticated;
grant select on public.forecast_runs to anon, authenticated;
grant select on public.monthly_air_pollution to anon, authenticated;
