import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url, key, {
  global: {
    fetch: (input, options = {}) => {
      const timeout = AbortSignal.timeout(12000);
      const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
      return fetch(input, { ...options, signal });
    },
  },
}) : null;
export const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const configuredSocket = import.meta.env.VITE_WS_URL || '';
