import { redirect } from '@sveltejs/kit';

export function load({ params }) {
  redirect(307, '/lounge/anime?open=' + params.id);
}
