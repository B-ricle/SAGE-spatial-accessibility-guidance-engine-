import { supabase } from './supabase.js';

function databaseError(error, action) {
  const code = error.code || '';
  if (code === 'PGRST205' || code === '42P01') return new Error(`${action}: observations table not found in the configured Supabase project.`);
  if (code === '42501') return new Error(`${action}: database permission denied. Check the authenticated grants and owner policies.`);
  if (code === 'PGRST301' || code === 'PGRST303') return new Error(`${action}: session expired. Sign out and sign in again.`);
  if (/abort|timeout/i.test(error.message || '')) return new Error(`${action}: request timed out. Check your connection and retry.`);
  return new Error(`${action}: database request failed${code ? ` (${code})` : ''}. Check your connection and Supabase project settings.`);
}

export async function saveObservation(observation, userId) {
  if (!supabase || !userId) throw Error('Sign in to save an observation.');
  const { error } = await supabase.from('observations').upsert({ id: observation.observation_id, user_id: userId, observed_at: observation.timestamp, payload: observation }, { onConflict: 'user_id,id', ignoreDuplicates: true }).abortSignal(AbortSignal.timeout(15000));
  if (error) throw databaseError(error, 'Could not save');
}
export async function loadHistory() {
  if (!supabase) throw Error('Supabase is not configured in this build.');
  const { data, error } = await supabase.from('observations').select('id,observed_at,payload').order('observed_at', { ascending: false }).limit(50).abortSignal(AbortSignal.timeout(15000));
  if (error) throw databaseError(error, 'History unavailable');
  return data || [];
}
