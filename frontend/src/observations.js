// Validate before display. Observation evidence never creates a hazard or 3D marker.
export function validateObservation(message) {
  const allowed = ['type', 'observation_id', 'timestamp', 'simulated', 'object_label', 'confidence'];
  if (!message || Object.keys(message).some(key => !allowed.includes(key)) ||
      message.type !== 'semantic_observation' || typeof message.simulated !== 'boolean' ||
      typeof message.observation_id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(message.observation_id) ||
      typeof message.timestamp !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(message.timestamp) ||
      !Number.isFinite(Date.parse(message.timestamp)) ||
      typeof message.object_label !== 'string' || !message.object_label.trim() ||
      message.object_label.length > 80 ||
      (message.confidence !== null && message.confidence !== undefined &&
       (!Number.isFinite(message.confidence) || message.confidence < 0 || message.confidence > 1))) {
    throw new Error('Invalid semantic observation');
  }
  return message;
}

export function createObservationPanel(panel) {
  const status = panel.querySelector('[data-observation-state]');
  const label = panel.querySelector('[data-observation-label]');
  const evidence = panel.querySelector('[data-observation-evidence]');
  const raw = panel.querySelector('pre');
  let receivedAt = null;
  let connected = false;
  return {
    receive(message) {
      validateObservation(message);
      // This connection is explicitly a simulator; real observations need a real source.
      if (!message.simulated) throw new Error('Unexpected real data on demo stream');
      receivedAt = performance.now();
      label.textContent = message.object_label;
      evidence.textContent = `Label confidence: ${message.confidence == null ? 'unknown' : Math.round(message.confidence * 100) + '%'} · Observed ${message.timestamp}`;
      raw.textContent = JSON.stringify(message, null, 2);
      status.textContent = 'Simulated observation — position unknown; hazard not assessed';
    },
    reset() {
      receivedAt = null; connected = true;
      label.textContent = 'No observation received'; evidence.textContent = '';
      raw.textContent = 'No message received'; status.textContent = 'Waiting for simulated observations';
    },
    disconnect() { connected = false; status.textContent = 'Disconnected — any displayed observation is historical'; },
    tick() {
      if (connected && receivedAt !== null && performance.now() - receivedAt > 12000) {
        status.textContent = 'Stale — no observation received for over 12 seconds';
      }
    },
  };
}
