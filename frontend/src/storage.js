import { supabase } from './supabase.js';
export async function saveObservation(observation, userId) {
  if (!supabase || !userId) throw Error('Sign in to save an observation.');
  const { error } = await supabase.from('observations').upsert({ id: observation.observation_id, user_id: userId, observed_at: observation.timestamp, payload: observation }, { onConflict: 'user_id,id', ignoreDuplicates: true });
  if (error) throw Error('Could not save. Check connectivity and apply the Supabase migration.');
}
export async function loadHistory() {
  const { data, error } = await supabase.from('observations').select('id,observed_at,payload').order('observed_at', { ascending: false }).limit(50);
  if (error) throw Error('History unavailable. Check connectivity and the database migration.');
  return data;
}
