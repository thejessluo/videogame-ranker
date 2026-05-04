alter table public.user_profiles enable row level security;
alter table public.comparisons enable row level security;
alter table public.genre_ratings enable row level security;

drop policy if exists "user_profiles_select_own" on public.user_profiles;
create policy "user_profiles_select_own"
  on public.user_profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "user_profiles_update_own" on public.user_profiles;
create policy "user_profiles_update_own"
  on public.user_profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "comparisons_select_own" on public.comparisons;
create policy "comparisons_select_own"
  on public.comparisons
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "comparisons_insert_own" on public.comparisons;
create policy "comparisons_insert_own"
  on public.comparisons
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "genre_ratings_select_own" on public.genre_ratings;
create policy "genre_ratings_select_own"
  on public.genre_ratings
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "genre_ratings_insert_own" on public.genre_ratings;
create policy "genre_ratings_insert_own"
  on public.genre_ratings
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "genre_ratings_update_own" on public.genre_ratings;
create policy "genre_ratings_update_own"
  on public.genre_ratings
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
