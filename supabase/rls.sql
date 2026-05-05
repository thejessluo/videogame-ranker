alter table public.games enable row level security;
alter table public.user_profiles enable row level security;
alter table public.comparisons enable row level security;
alter table public.genre_ratings enable row level security;
alter table public.user_game_rankings enable row level security;
alter table public.ranking_insert_sessions enable row level security;
alter table public.ranking_comparisons enable row level security;
alter table public.user_game_bookmarks enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.guest_game_rankings enable row level security;
alter table public.guest_ranking_insert_sessions enable row level security;
alter table public.guest_ranking_comparisons enable row level security;

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

drop policy if exists "user_profiles_select_own_or_friend" on public.user_profiles;
create policy "user_profiles_select_own_or_friend"
  on public.user_profiles
  for select
  to authenticated
  using (
    (select auth.uid()) = id
    or public.are_friends((select auth.uid()), id)
  );

drop policy if exists "user_profiles_update_own" on public.user_profiles;
create policy "user_profiles_update_own"
  on public.user_profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Pending friend request: each party can read the other's profile (username for UI).
drop policy if exists "user_profiles_select_friend_request_pending_party" on public.user_profiles;
create policy "user_profiles_select_friend_request_pending_party"
  on public.user_profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.friend_requests fr
      where fr.status = 'pending'
        and (
          (fr.from_user_id = (select auth.uid()) and fr.to_user_id = user_profiles.id)
          or (fr.to_user_id = (select auth.uid()) and fr.from_user_id = user_profiles.id)
        )
    )
  );

drop policy if exists "comparisons_select_own_or_friend" on public.comparisons;
create policy "comparisons_select_own_or_friend"
  on public.comparisons
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or public.are_friends((select auth.uid()), user_id)
  );

drop policy if exists "comparisons_insert_own" on public.comparisons;
create policy "comparisons_insert_own"
  on public.comparisons
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "genre_ratings_select_own_or_friend" on public.genre_ratings;
create policy "genre_ratings_select_own_or_friend"
  on public.genre_ratings
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or public.are_friends((select auth.uid()), user_id)
  );

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

drop policy if exists "user_game_rankings_select_own_or_friend" on public.user_game_rankings;
create policy "user_game_rankings_select_own_or_friend"
  on public.user_game_rankings
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or public.are_friends((select auth.uid()), user_id)
  );

drop policy if exists "user_game_rankings_insert_own" on public.user_game_rankings;
create policy "user_game_rankings_insert_own"
  on public.user_game_rankings
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_game_rankings_update_own" on public.user_game_rankings;
create policy "user_game_rankings_update_own"
  on public.user_game_rankings
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_game_rankings_delete_own" on public.user_game_rankings;
create policy "user_game_rankings_delete_own"
  on public.user_game_rankings
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "ranking_insert_sessions_select_own_or_friend" on public.ranking_insert_sessions;
create policy "ranking_insert_sessions_select_own_or_friend"
  on public.ranking_insert_sessions
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or public.are_friends((select auth.uid()), user_id)
  );

drop policy if exists "ranking_insert_sessions_insert_own" on public.ranking_insert_sessions;
create policy "ranking_insert_sessions_insert_own"
  on public.ranking_insert_sessions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "ranking_insert_sessions_update_own" on public.ranking_insert_sessions;
create policy "ranking_insert_sessions_update_own"
  on public.ranking_insert_sessions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "ranking_insert_sessions_delete_own" on public.ranking_insert_sessions;
create policy "ranking_insert_sessions_delete_own"
  on public.ranking_insert_sessions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "ranking_comparisons_select_own_or_friend" on public.ranking_comparisons;
create policy "ranking_comparisons_select_own_or_friend"
  on public.ranking_comparisons
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or public.are_friends((select auth.uid()), user_id)
  );

drop policy if exists "ranking_comparisons_insert_own" on public.ranking_comparisons;
create policy "ranking_comparisons_insert_own"
  on public.ranking_comparisons
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "ranking_comparisons_delete_own" on public.ranking_comparisons;
create policy "ranking_comparisons_delete_own"
  on public.ranking_comparisons
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user_game_bookmarks_select_own_or_friend" on public.user_game_bookmarks;
create policy "user_game_bookmarks_select_own_or_friend"
  on public.user_game_bookmarks
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or public.are_friends((select auth.uid()), user_id)
  );

drop policy if exists "user_game_bookmarks_insert_own" on public.user_game_bookmarks;
create policy "user_game_bookmarks_insert_own"
  on public.user_game_bookmarks
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_game_bookmarks_update_own" on public.user_game_bookmarks;
create policy "user_game_bookmarks_update_own"
  on public.user_game_bookmarks
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_game_bookmarks_delete_own" on public.user_game_bookmarks;
create policy "user_game_bookmarks_delete_own"
  on public.user_game_bookmarks
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "friend_requests_select_parties" on public.friend_requests;
create policy "friend_requests_select_parties"
  on public.friend_requests
  for select
  to authenticated
  using ((select auth.uid()) in (from_user_id, to_user_id));

drop policy if exists "friend_requests_insert_sender" on public.friend_requests;
create policy "friend_requests_insert_sender"
  on public.friend_requests
  for insert
  to authenticated
  with check ((select auth.uid()) = from_user_id);

drop policy if exists "friend_requests_update_parties" on public.friend_requests;
create policy "friend_requests_update_parties"
  on public.friend_requests
  for update
  to authenticated
  using ((select auth.uid()) in (from_user_id, to_user_id))
  with check ((select auth.uid()) in (from_user_id, to_user_id));

drop policy if exists "friend_requests_delete_parties" on public.friend_requests;
create policy "friend_requests_delete_parties"
  on public.friend_requests
  for delete
  to authenticated
  using ((select auth.uid()) in (from_user_id, to_user_id));

drop policy if exists "friendships_select_members" on public.friendships;
create policy "friendships_select_members"
  on public.friendships
  for select
  to authenticated
  using ((select auth.uid()) in (user_a_id, user_b_id));

drop policy if exists "friendships_insert_members" on public.friendships;
create policy "friendships_insert_members"
  on public.friendships
  for insert
  to authenticated
  with check ((select auth.uid()) in (user_a_id, user_b_id));

drop policy if exists "friendships_delete_members" on public.friendships;
create policy "friendships_delete_members"
  on public.friendships
  for delete
  to authenticated
  using ((select auth.uid()) in (user_a_id, user_b_id));

-- Guest tables: no policies — only the service role (server) may access them.
