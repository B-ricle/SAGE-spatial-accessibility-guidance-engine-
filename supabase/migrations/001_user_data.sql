begin;
create table if not exists public.observations (
  id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  observed_at timestamptz not null,
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and payload->>'type' = 'semantic_observation'
    and jsonb_typeof(payload->'object_label') = 'string'
    and length(payload->>'object_label') between 1 and 80
    and jsonb_typeof(payload->'simulated') = 'boolean'
    and octet_length(payload::text) <= 16384
  ),
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists observations_user_time on public.observations(user_id, observed_at desc);
create table if not exists public.preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null check (theme in ('light', 'dark'))
);
alter table public.observations enable row level security;
alter table public.preferences enable row level security;
revoke all on public.observations, public.preferences from anon;
grant select, insert, delete on public.observations to authenticated;
grant select, insert, update, delete on public.preferences to authenticated;
drop policy if exists observations_read on public.observations;
create policy observations_read on public.observations for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists observations_add on public.observations;
create policy observations_add on public.observations for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists observations_delete on public.observations;
create policy observations_delete on public.observations for delete to authenticated using ((select auth.uid()) = user_id);
drop policy if exists preferences_own on public.preferences;
create policy preferences_own on public.preferences for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
commit;
