import { getAll as getBooks } from '$lib/server/books.js';
import { getAll as getGenres } from '$lib/server/genres.js';
import { getAll as getSeries } from '$lib/server/series.js';
import { getAll as getAuthors } from '$lib/server/authors.js';

export function load(event) {
  event.depends('lounge:data');
  return {
    books: getBooks(),
    genres: getGenres(),
    series: getSeries(),
    authors: getAuthors()
  };
}
