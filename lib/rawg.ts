const DEFAULT_BASE_URL = "https://api.rawg.io/api";
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

export type RawgGenre = {
  id: number;
  name: string;
  slug: string;
};

export type RawgGame = {
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

export async function searchRawgGames(query: string, pageSize = 10) {
  const params = new URLSearchParams({
    search: query,
    page_size: String(pageSize),
  });
  const payload = (await rawgFetch(`/games?${params.toString()}`)) as RawgListResponse<RawgGame>;
  return payload.results;
}

function decodeBasicEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'");
}

/** Strip RAWG HTML description to readable plain text (paragraphs preserved). */
function rawgDescriptionToPlainText(htmlOrEmpty: string | null | undefined): string | null {
  const raw = (htmlOrEmpty ?? "").trim();
  if (!raw) return null;
  const withBreaks = raw
    .replace(/\r\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  const cleaned = decodeBasicEntities(withBreaks)
    .split(/\n/)
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned || null;
}

export type RawgGameAbout = {
  id: number;
  name: string;
  slug: string;
  released: string | null;
  coverUrl: string | null;
  description: string | null;
  website: string | null;
  metacritic: number | null;
  genres: string[];
  developers: string[];
  publishers: string[];
  platforms: string[];
  screenshots: string[];
};

type RawgScreenshotRow = { image: string };

/** Single-game detail + screenshots for the “about” modal (bounded payload). */
export async function fetchRawgGameAbout(rawgId: number): Promise<RawgGameAbout> {
  const detail = (await rawgFetch(`/games/${rawgId}`)) as {
    id?: number;
    name?: string;
    slug?: string;
    released?: string | null;
    background_image?: string | null;
    description?: string | null;
    description_raw?: string | null;
    website?: string | null;
    metacritic?: number | null;
    genres?: Array<{ name?: string }>;
    developers?: Array<{ name?: string }>;
    publishers?: Array<{ name?: string }>;
    platforms?: Array<{ platform?: { name?: string } }>;
    screenshots?: RawgScreenshotRow[];
  };

  const descriptionPlain =
    rawgDescriptionToPlainText(detail.description ?? undefined) ??
    rawgDescriptionToPlainText(detail.description_raw ?? undefined);

  let screenshots = (detail.screenshots ?? [])
    .map((row) => row.image)
    .filter(Boolean);

  if (screenshots.length === 0) {
    try {
      const shotPayload = (await rawgFetch(
        `/games/${rawgId}/screenshots?page_size=12`,
      )) as { results?: RawgScreenshotRow[] };
      screenshots = (shotPayload.results ?? []).map((row) => row.image).filter(Boolean);
    } catch {
      /* optional enrichment */
    }
  }

  const maxShots = 10;
  screenshots = screenshots.slice(0, maxShots);

  return {
    id: detail.id ?? rawgId,
    name: detail.name ?? "Unknown game",
    slug: detail.slug ?? "",
    released: detail.released ?? null,
    coverUrl: detail.background_image ?? null,
    description: descriptionPlain,
    website: detail.website?.trim() || null,
    metacritic: typeof detail.metacritic === "number" ? detail.metacritic : null,
    genres: (detail.genres ?? []).map((g) => g.name).filter(Boolean) as string[],
    developers: (detail.developers ?? []).map((d) => d.name).filter(Boolean) as string[],
    publishers: (detail.publishers ?? []).map((p) => p.name).filter(Boolean) as string[],
    platforms: (detail.platforms ?? [])
      .map((row) => row.platform?.name)
      .filter(Boolean) as string[],
    screenshots,
  };
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
