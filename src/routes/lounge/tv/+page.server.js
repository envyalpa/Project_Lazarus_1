import { getAll } from '$lib/server/tv-shows.js';
import { getAll as getAllGenres } from '$lib/server/genres.js';
import { getAll as getAllSeasons } from '$lib/server/tv-show-seasons.js';

export function load() {
  const allSeasons = getAllSeasons();
  const seasonsMap = {};
  for (const s of allSeasons) {
    if (!seasonsMap[s.show_id]) seasonsMap[s.show_id] = [];
    seasonsMap[s.show_id].push(s);
  }
  return {
    tvShows: getAll(),
    genres: getAllGenres(),
    seasonsMap
  };
}
