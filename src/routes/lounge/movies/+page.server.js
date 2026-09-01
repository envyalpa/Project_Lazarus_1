import { getAll } from '$lib/server/movies.js';
import { getAll as getAllGenres } from '$lib/server/genres.js';

export function load() {
  return {
    movies: getAll(),
    genres: getAllGenres()
  };
}
