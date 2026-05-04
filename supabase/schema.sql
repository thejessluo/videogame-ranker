create extension if not exists "pgcrypto";

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  rawg_id bigint unique not null,
  name text not null,
  slug text not null,
  cover_url text,
  released date,
  genres_json jsonb not null default '[]'::jsonb,
  cached_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.games alter column rawg_id drop not null;

create index if not exists games_slug_idx on public.games (slug);
create index if not exists games_name_idx on public.games (name);

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  genre_slug text not null,
  game_a_id uuid not null references public.games(id) on delete cascade,
  game_b_id uuid not null references public.games(id) on delete cascade,
  winner_game_id uuid not null references public.games(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint comparisons_games_distinct_chk check (game_a_id <> game_b_id),
  constraint comparisons_winner_valid_chk check (
    winner_game_id = game_a_id or winner_game_id = game_b_id
  )
);

create index if not exists comparisons_user_genre_idx
  on public.comparisons (user_id, genre_slug, created_at desc);

create table if not exists public.genre_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  genre_slug text not null,
  game_id uuid not null references public.games(id) on delete cascade,
  rating_mu numeric(8,2) not null default 1200,
  rating_sigma numeric(8,2) not null default 350,
  comparisons_count integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, genre_slug, game_id)
);

create index if not exists genre_ratings_user_genre_idx
  on public.genre_ratings (user_id, genre_slug, rating_mu desc);

create table if not exists public.user_game_rankings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  list_scope text not null default 'global',
  list_key text not null default 'all',
  rank_position integer not null,
  score numeric(5,2) not null default 5.0,
  status text not null default 'played',
  broad_rating text not null default 'okay',
  notes text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, list_scope, list_key, game_id),
  unique (user_id, list_scope, list_key, rank_position)
);

create index if not exists user_game_rankings_scope_idx
  on public.user_game_rankings (user_id, list_scope, list_key, rank_position);

create table if not exists public.ranking_insert_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  list_scope text not null default 'global',
  list_key text not null default 'all',
  low integer not null default 0,
  high integer not null default 0,
  broad_rating text not null default 'okay',
  status text not null default 'played',
  notes text,
  tags text[] not null default '{}',
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ranking_insert_sessions_user_idx
  on public.ranking_insert_sessions (user_id, completed, created_at desc);

create table if not exists public.ranking_comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.ranking_insert_sessions(id) on delete cascade,
  new_game_id uuid not null references public.games(id) on delete cascade,
  compared_game_id uuid not null references public.games(id) on delete cascade,
  winner_game_id uuid not null references public.games(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.user_game_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  notes text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, game_id)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
