-- Daily air-quality digests.
-- One row per Malaysia calendar day, written by /api/digest after the day closes.

create table if not exists public.daily_digests (
  day date primary key,
  generated_at timestamptz not null default now(),
  source text not null check (source in ('gemini', 'rules')),
  model text,
  facts jsonb not null,
  summary jsonb not null
);

alter table public.daily_digests enable row level security;

drop policy if exists "Public read daily digests" on public.daily_digests;
create policy "Public read daily digests" on public.daily_digests for select using (true);
