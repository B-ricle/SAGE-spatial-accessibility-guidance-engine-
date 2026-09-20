import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url, key, {
  global: {
    fetch: async (input, options = {}) => {
      // AbortController also works on older iOS versions without AbortSignal.any.
      const controller = new AbortController();
      const source = options.signal || (input instanceof Request ? input.signal : undefined);
      const cancel = () => controller.abort();
      if (source?.aborted) cancel();
      else source?.addEventListener('abort', cancel, { once: true });
      const timer = setTimeout(cancel, 12000);
      try { return await fetch(input, { ...options, signal: controller.signal }); }
      finally { clearTimeout(timer); source?.removeEventListener('abort', cancel); }
    },
  },
}) : null;
export const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const configuredSocket = import.meta.env.VITE_WS_URL || '';

