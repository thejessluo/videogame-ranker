import { SupabaseClient } from "@supabase/supabase-js";
import { discoverRawgGamesByGenre, getRawgGenres, toGameRecord } from "@/lib/rawg";

type SyncOptions = {
  supabase: SupabaseClient;
  genreSlugs?: string[];
  genresLimit?: number;
  perGenreLimit?: number;
};

export async function syncRawgCatalog({
  supabase,
  genreSlugs,
  genresLimit = 8,
  perGenreLimit = 30,
}: SyncOptions) {
  const allGenres = await getRawgGenres();
  const selectedGenres = genreSlugs?.length
    ? allGenres.filter((genre) => genreSlugs.includes(genre.slug))
    : allGenres.slice(0, genresLimit);

  let syncedGames = 0;
  const syncedGenres: string[] = [];

  for (const genre of selectedGenres) {
    const rawgGames = await discoverRawgGamesByGenre(genre.slug, perGenreLimit);
    const rows = rawgGames.map(toGameRecord);
    if (!rows.length) continue;

    const { error } = await supabase
      .from("games")
      .upsert(rows, { onConflict: "rawg_id" });

    if (error) {
      throw new Error(`Failed syncing ${genre.slug}: ${error.message}`);
    }

    syncedGames += rows.length;
    syncedGenres.push(genre.slug);
  }

  return {
    syncedGames,
    syncedGenres,
  };
}
