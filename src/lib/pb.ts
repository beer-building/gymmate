import PocketBase from 'pocketbase';

// SvelteKit 3.0.0-next не поддерживает $env/static/*, поэтому обычный Vite env.
const url = import.meta.env.VITE_POCKETBASE_URL ?? 'http://127.0.0.1:8090';

export const pb = new PocketBase(url);
