const DEFAULT_BASE_URL = "https://api.rawg.io/api";
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

export type RawgGenre = {
  id: number;
  name: string;
  slug: string;
};

type RawgGame = {
  id: number;
  name: string;
  slug: string;
  background_image: string | null;
  released: string | null;
  genres: RawgGenre[];
};

type RawgListResponse<T> = {
  results: T[];
};

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function rawgFetch(path: string, init?: RequestInit) {
  const apiKey = process.env.RAWG_API_KEY;
  const baseUrl = process.env.RAWG_BASE_URL ?? DEFAULT_BASE_URL;

  if (!apiKey) {
    throw new Error("RAWG_API_KEY is missing.");
  }

  const url = new URL(`${baseUrl}${path}`);
  url.searchParams.set("key", apiKey);

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= MAX_RETRIES) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          accept: "application/json",
          ...(init?.headers ?? {}),
        },
        cache: "no-store",
      });

      if (response.ok) {
        return response.json();
      }

      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`RAWG error ${response.status}: retrying`);
      } else {
        const body = await response.text();
        throw new Error(`RAWG error ${response.status}: ${body}`);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    attempt += 1;
    if (attempt <= MAX_RETRIES) {
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  throw lastError ?? new Error("RAWG request failed.");
}

export async function getRawgGenres() {
  const payload = (await rawgFetch("/genres")) as RawgListResponse<RawgGenre>;
  return payload.results;
}

export async function discoverRawgGamesByGenre(genreSlug: string, pageSize = 40) {
  const params = new URLSearchParams({
    genres: genreSlug,
    page_size: String(pageSize),
    ordering: "-added",
  });

  const payload = (await rawgFetch(`/games?${params.toString()}`)) as RawgListResponse<RawgGame>;
  return payload.results;
}

export function toGameRecord(rawgGame: RawgGame) {
  return {
    rawg_id: rawgGame.id,
    name: rawgGame.name,
    slug: rawgGame.slug,
    cover_url: rawgGame.background_image,
    released: rawgGame.released,
    genres_json: rawgGame.genres.map((genre) => ({
      id: genre.id,
      name: genre.name,
      slug: genre.slug,
    })),
    cached_at: new Date().toISOString(),
  };
}
