alter table public.games enable row level security;
alter table public.user_profiles enable row level security;
alter table public.comparisons enable row level security;
alter table public.genre_ratings enable row level security;
alter table public.user_game_rankings enable row level security;
alter table public.ranking_insert_sessions enable row level security;
alter table public.ranking_comparisons enable row level security;
alter table public.user_game_bookmarks enable row level security;

drop policy if exists "games_select_all_authenticated" on public.games;
create policy "games_select_all_authenticated"
  on public.games
  for select
  to authenticated
  using (true);

drop policy if exists "games_insert_all_authenticated" on public.games;
create policy "games_insert_all_authenticated"
  on public.games
  for insert
  to authenticated
  with check (true);

drop policy if exists "games_update_all_authenticated" on public.games;
create policy "games_update_all_authenticated"
  on public.games
  for update
  to authenticated
  using (true)
  with check (true);

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

drop policy if exists "user_game_rankings_all_own" on public.user_game_rankings;
create policy "user_game_rankings_all_own"
  on public.user_game_rankings
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "ranking_insert_sessions_all_own" on public.ranking_insert_sessions;
create policy "ranking_insert_sessions_all_own"
  on public.ranking_insert_sessions
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "ranking_comparisons_all_own" on public.ranking_comparisons;
create policy "ranking_comparisons_all_own"
  on public.ranking_comparisons
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_game_bookmarks_all_own" on public.user_game_bookmarks;
create policy "user_game_bookmarks_all_own"
  on public.user_game_bookmarks
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
