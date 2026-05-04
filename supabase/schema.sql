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
