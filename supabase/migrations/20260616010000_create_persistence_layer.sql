create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text,
  full_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  carbon_breakdown jsonb not null,
  context_profile jsonb not null,
  hotspot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assessment_id uuid references public.assessments(id) on delete cascade,
  recommendations jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recommendation_set_id uuid references public.recommendations(id) on delete set null,
  plan jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete cascade,
  action_id text not null,
  status text not null default 'not_started',
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, action_id)
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_assessments_updated_at on public.assessments;
create trigger set_assessments_updated_at
before update on public.assessments
for each row execute function public.set_updated_at();

drop trigger if exists set_recommendations_updated_at on public.recommendations;
create trigger set_recommendations_updated_at
before update on public.recommendations
for each row execute function public.set_updated_at();

drop trigger if exists set_plans_updated_at on public.plans;
create trigger set_plans_updated_at
before update on public.plans
for each row execute function public.set_updated_at();

drop trigger if exists set_progress_updated_at on public.progress;
create trigger set_progress_updated_at
before update on public.progress
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.assessments enable row level security;
alter table public.recommendations enable row level security;
alter table public.plans enable row level security;
alter table public.progress enable row level security;

create policy "Users can select own profiles"
on public.profiles for select
using (auth.uid() = user_id);

create policy "Users can insert own profiles"
on public.profiles for insert
with check (auth.uid() = user_id);

create policy "Users can update own profiles"
on public.profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own profiles"
on public.profiles for delete
using (auth.uid() = user_id);

create policy "Users can select own assessments"
on public.assessments for select
using (auth.uid() = user_id);

create policy "Users can insert own assessments"
on public.assessments for insert
with check (auth.uid() = user_id);

create policy "Users can update own assessments"
on public.assessments for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own assessments"
on public.assessments for delete
using (auth.uid() = user_id);

create policy "Users can select own recommendations"
on public.recommendations for select
using (auth.uid() = user_id);

create policy "Users can insert own recommendations"
on public.recommendations for insert
with check (auth.uid() = user_id);

create policy "Users can update own recommendations"
on public.recommendations for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own recommendations"
on public.recommendations for delete
using (auth.uid() = user_id);

create policy "Users can select own plans"
on public.plans for select
using (auth.uid() = user_id);

create policy "Users can insert own plans"
on public.plans for insert
with check (auth.uid() = user_id);

create policy "Users can update own plans"
on public.plans for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own plans"
on public.plans for delete
using (auth.uid() = user_id);

create policy "Users can select own progress"
on public.progress for select
using (auth.uid() = user_id);

create policy "Users can insert own progress"
on public.progress for insert
with check (auth.uid() = user_id);

create policy "Users can update own progress"
on public.progress for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own progress"
on public.progress for delete
using (auth.uid() = user_id);
