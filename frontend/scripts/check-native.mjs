import { loadEnv } from 'vite';
const env = { ...loadEnv('production', process.cwd(), ''), ...process.env };
for (const [key, protocol] of [['VITE_API_URL', 'https:'], ['VITE_WS_URL', 'wss:'], ['VITE_AUTH_REDIRECT_URL', 'https:']]) {
  let url;
  try { url = new URL(env[key]); } catch { throw Error(`${key} must be configured before packaging iOS.`); }
  if (url.protocol !== protocol || ['localhost', '127.0.0.1'].includes(url.hostname)) throw Error(`${key} must use a reachable ${protocol} endpoint.`);
}
if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY) throw Error('Configure public Supabase settings.');
console.log('Native endpoint configuration validated.');
