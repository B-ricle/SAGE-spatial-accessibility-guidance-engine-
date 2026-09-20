import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url, key) : null;
export const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const configuredSocket = import.meta.env.VITE_WS_URL || '';
