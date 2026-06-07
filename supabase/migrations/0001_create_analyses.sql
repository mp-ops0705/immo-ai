create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  created_at timestamptz default now(),
  title text nullable,
  city text nullable,
  postal_code text nullable,
  property_type text nullable,
  surface numeric nullable,
  rooms numeric nullable,
  purchase_price numeric nullable,
  effective_rent numeric nullable,
  market_rent_avg numeric nullable,
  market_rent_low numeric nullable,
  market_rent_high numeric nullable,
  gross_yield numeric nullable,
  monthly_cashflow numeric nullable,
  real_cashflow numeric nullable,
  monthly_payment numeric nullable,
  monthly_charges numeric nullable,
  score numeric nullable,
  analysis_text text nullable,
  raw_result jsonb not null
);

alter table public.analyses enable row level security;

drop policy if exists "Users can select own analyses" on public.analyses;
create policy "Users can select own analyses"
  on public.analyses
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own analyses" on public.analyses;
create policy "Users can insert own analyses"
  on public.analyses
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own analyses" on public.analyses;
create policy "Users can update own analyses"
  on public.analyses
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own analyses" on public.analyses;
create policy "Users can delete own analyses"
  on public.analyses
  for delete
  using (auth.uid() = user_id);
