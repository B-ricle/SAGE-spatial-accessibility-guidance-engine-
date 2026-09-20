// Latest-message state only. No history, hardware access, or scene mutations.
export function connectTelemetry(panel) {
  const button = panel.querySelector('button');
  const state = panel.querySelector('[data-connection]');
  const coordinates = panel.querySelector('[data-position]');
  const timestamp = panel.querySelector('[data-timestamp]');
  const raw = panel.querySelector('pre');
  let socket = null;
  let lastReceived = null;
  let sequence = -1;
  function disconnect() {
    const previous = socket;
    socket = null;
    previous?.close();
    state.textContent = 'Disconnected — displayed data is not live';
    button.textContent = 'Connect demo';
  }
  function toggle() {
    if (socket) { disconnect(); return; }
    lastReceived = null;
    sequence = -1;
    coordinates.textContent = 'Waiting for a valid message';
    timestamp.textContent = 'None received';
    raw.textContent = 'No message received';
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const current = new WebSocket(`${protocol}//${location.host}/ws/demo`);
    socket = current;
    state.textContent = 'Connecting…';
    button.textContent = 'Disconnect';
    current.onopen = () => {
      if (socket === current) state.textContent = 'Connected — waiting for simulated data';
    };
    current.onmessage = ({ data }) => {
      if (socket !== current) return;
      raw.textContent = String(data).slice(0, 4096);
      try {
        const message = JSON.parse(data);
        if (message.type !== 'pose_update' || message.simulated !== true ||
            message.coordinate_frame !== 'demo_room' || message.units !== 'meters' ||
            !Number.isInteger(message.sequence) || message.sequence <= sequence ||
            !Number.isFinite(message.x) || !Number.isFinite(message.z) ||
            typeof message.timestamp !== 'string' ||
            !/(Z|[+-]\d{2}:\d{2})$/.test(message.timestamp) ||
            !Number.isFinite(Date.parse(message.timestamp))) throw new Error('Invalid pose');
        sequence = message.sequence;
        lastReceived = performance.now();
        state.textContent = 'Connected — simulated data';
        coordinates.textContent = `X ${message.x.toFixed(2)} m · Z ${message.z.toFixed(2)} m`;
        timestamp.textContent = message.timestamp;
      } catch {
        state.textContent = 'Invalid message — last accepted values retained';
      }
    };
    current.onclose = () => {
      if (socket === current) disconnect();
    };
    current.onerror = () => {
      if (socket === current) {
        disconnect();
        state.textContent = 'Connection failed — check backend, then reconnect';
      }
    };
  }
  const timer = setInterval(() => {
    if (socket?.readyState === WebSocket.OPEN && lastReceived !== null &&
        performance.now() - lastReceived > 5000) {
      state.textContent = 'Stale — no valid update for over 5 seconds';
    }
  }, 1000);
  button.addEventListener('click', toggle);
  return () => { disconnect(); clearInterval(timer); button.removeEventListener('click', toggle); };
}
