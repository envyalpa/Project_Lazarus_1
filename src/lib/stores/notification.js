import { writable } from 'svelte/store';

export const notification = writable(null);

export function notify(message) {
  notification.set(message);
}
