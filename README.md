# Game Ladder MVP

Game Ladder is a mobile-first web app for ranking video games head-to-head inside specific genres (Beli-style, but genre-scoped).

## Stack

- Next.js App Router + Tailwind CSS
- Supabase Postgres + Auth
- RAWG API (free tier) for game metadata
- Elo rating updates per user + genre

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Fill in values in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RAWG_API_KEY`
- optional `RAWG_BASE_URL` (defaults to `https://api.rawg.io/api`)

4. In Supabase SQL Editor, run:
- `supabase/schema.sql`
- `supabase/rls.sql`

5. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API Endpoints

- `POST /api/rawg/sync` body: `{ "genreSlug": "action", "limit": 40 }`
- `GET /api/matchup?genre=action`
- `POST /api/vote` body: `{ "genreSlug", "gameAId", "gameBId", "winnerGameId" }`

## MVP Flow

1. Sign up or sign in at `/auth`
2. Pick a genre on `/`
3. Compare games on `/compare?genre=...`
4. View rankings at `/rankings`
