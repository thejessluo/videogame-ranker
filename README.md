# Game Ladder

**Live site:** [game-ladder.vercel.app](https://game-ladder.vercel.app/)

## What it does

Game Ladder helps you **rank video games by comparing them**, not by picking stars or numbers. You choose how you felt about a game (a simple sentiment band), then **compare it against games already on your ladder** so your real ordering emerges from pairwise choices—similar in spirit to a Beli-style system.

The app pulls cover art, descriptions, and metadata from the **[RAWG API](https://rawg.io/apidocs)**. You can browse details for games before you rank them, build a **global** ranked list, filter that list **by genre** on the full rankings page, and see a **top preview** on the home screen.

**With an account** you can keep rankings in sync across devices, **bookmark** games you want to play later, **rank bookmarks when you’re ready**, and use **friends** to compare tastes with people you know. You can also use the app in a **guest-style flow** (anonymous rankings in this browser) when the backend is configured for it.

In short: discover games, rank them through comparisons, share the vibe with friends, and always know what “favorite” actually means on your list.

## Features

- **Search & add games** via RAWG search; optional **quick “about”** modal (description, screenshots, platforms, etc.)
- **Sentiment tiers** when adding a game (e.g. liked it / fine / didn’t like)—placement uses tier-aware bounds on your ladder
- **Comparison sessions** when a new game lands between peers—you pick winners until its rank is resolved
- **Global rankings** with scores derived from your ladder position and sentiment bands (ordering on the list is what matters)
- **Bookmarks** (signed-in): want-to-play list with **Rank** to enter the same flow as from search
- **Friends** (signed-in): connect and compare lists
- **Genre filters** on the full rankings page

## URLs

| Path | What it’s for |
|------|----------------|
| [`/`](https://game-ladder.vercel.app/) | Home — search RAWG, add/rank games, top 10 preview |
| [`/rankings`](https://game-ladder.vercel.app/rankings) | Full global ranking list + genre filters |
| [`/compare?session=…`](https://game-ladder.vercel.app/compare) | Head-to-head comparison session when placing a new game (opened automatically when needed) |
| [`/bookmarks`](https://game-ladder.vercel.app/bookmarks) | Want-to-play bookmarks *(signed in)* |
| [`/friends`](https://game-ladder.vercel.app/friends) | Friends list *(signed in)* |
| `/friends/{userId}` | A friend’s public ranking *(signed in; uses their user id in the path)* |
| [`/auth`](https://game-ladder.vercel.app/auth) | Sign in / create account |
| [`/about`](https://game-ladder.vercel.app/about) | About Game Ladder |

Production base URL: **https://game-ladder.vercel.app/** — swap for `http://localhost:3000` when developing locally.

## Stack

- **Next.js** (App Router) + **Tailwind CSS**
- **Supabase** (Postgres, Auth, Row Level Security)
- **RAWG** for game search and rich metadata

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
- Optional: `RAWG_BASE_URL` (defaults to `https://api.rawg.io/api`)
- For guest rankings / server-side ranking APIs in development: `SUPABASE_SERVICE_ROLE_KEY` (see Supabase project settings; never expose this key to the client)

4. In the Supabase SQL editor, run:

- `supabase/schema.sql`
- `supabase/rls.sql`

5. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scheduled RAWG refresh

- Vercel cron can call the refresh endpoint (see `vercel.json`).
- Set `CRON_SECRET` in your deployment environment.
- Requests must send `Authorization: Bearer <CRON_SECRET>`.

## License

This project is licensed under the [MIT License](LICENSE).
