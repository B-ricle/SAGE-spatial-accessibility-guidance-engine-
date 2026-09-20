const iso = value => typeof value === 'string' && /(Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
const text = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 128;
const finite = value => typeof value === 'number' && Number.isFinite(value);
export function parseMessage(raw, demo = false) {
  if (typeof raw !== 'string' || raw.length > 32768) throw Error('Message too large or not text.');
  const m = JSON.parse(raw);
  if (!m || !iso(m.timestamp) || typeof m.simulated !== 'boolean' || (demo && !m.simulated)) throw Error('Invalid message envelope.');
  if (m.type === 'pose_update') {
    if (!finite(m.x) || !finite(m.z) || !text(m.coordinate_frame) || m.units !== 'meters' || !Number.isSafeInteger(m.sequence) || m.sequence < 0) throw Error('Invalid position.');
  } else if (m.type === 'semantic_observation') {
    if (!text(m.object_label) || m.object_label.length > 80 || typeof m.observation_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m.observation_id) || (m.confidence != null && (!finite(m.confidence) || m.confidence < 0 || m.confidence > 1))) throw Error('Invalid observation.');
  } else if (m.type === 'hazard_update') {
    if (!text(m.coordinate_frame) || m.units !== 'meters' || !Array.isArray(m.hazards) || m.hazards.length > 100 || !m.hazards.every(h => text(h.id) && finite(h.x) && finite(h.z) && finite(h.radius_m) && h.radius_m > 0 && h.radius_m <= 20 && ['caution', 'high'].includes(h.severity))) throw Error('Invalid hazards.');
  } else if (m.type === 'system_status') {
    if (!['active', 'unavailable'].includes(m.localization) || !['active', 'unavailable'].includes(m.perception)) throw Error('Invalid system status.');
  } else throw Error('Unsupported message type.');
  return m;
}
export function socketURL(value) {
  const url = new URL(value);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (!['ws:', 'wss:'].includes(url.protocol) || (url.protocol === 'ws:' && !local) || url.username || url.password || url.hash) throw Error('Use a wss:// endpoint (ws:// is allowed on localhost).');
  return url.href;
}
