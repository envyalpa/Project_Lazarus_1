import { getAll } from '$lib/server/anime.js';
import { getAll as getAllGenres } from '$lib/server/genres.js';
import { getAll as getAllSeasons } from '$lib/server/anime-seasons.js';

export function load() {
  const allSeasons = getAllSeasons();
  const seasonsMap = {};
  for (const s of allSeasons) {
    if (!seasonsMap[s.anime_id]) seasonsMap[s.anime_id] = [];
    seasonsMap[s.anime_id].push(s);
  }
  return {
    anime: getAll(),
    genres: getAllGenres(),
    seasonsMap
  };
}
