import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { supabase, apiBase, configuredSocket } from './supabase.js';
import { parseMessage, socketURL } from './contracts.js';
import { saveObservation, loadHistory } from './storage.js';

function Account({ session, open, onClose }) {
  const dialog = useRef();
  const [mode, setMode] = useState('signin'), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { if (open) dialog.current.showModal(); else dialog.current.close(); }, [open]);
  async function submit(event) {
    event.preventDefault(); if (!supabase) return setMessage('Supabase is not configured.');
    const form = event.currentTarget, values = new FormData(form);
    const credentials = { email: String(values.get('email')).trim(), password: String(values.get('password') || '') };
    setBusy(true); setMessage('Working…');
    try {
      let result;
      if (mode === 'signup') result = await supabase.auth.signUp(credentials);
      else if (mode === 'reset') result = await supabase.auth.resetPasswordForEmail(credentials.email, { redirectTo: import.meta.env.VITE_AUTH_REDIRECT_URL || location.origin });
      else if (mode === 'update') result = await supabase.auth.updateUser({ password: credentials.password });
      else result = await supabase.auth.signInWithPassword(credentials);
      if (result.error) throw result.error;
      form.reset();
      setMessage(mode === 'signup' || mode === 'reset' ? 'Check your email for the next step, if applicable.' : 'Success.');
      if (mode === 'update') setMode('signin');
    } catch { setMessage('Request failed. Check your details, email confirmation, password requirements, and connection.'); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange(event => { if (event === 'PASSWORD_RECOVERY') { setMode('update'); dialog.current.showModal(); } });
    return () => data.subscription.unsubscribe();
  }, []);
  async function logout() {
    setBusy(true);
    try { const { error } = await supabase.auth.signOut({ scope: 'local' }); if (error) throw error; setMessage('Signed out.'); }
    catch { setMessage('Sign-out failed. Try again.'); } finally { setBusy(false); }
  }
  return <dialog ref={dialog} id="account-dialog" aria-labelledby="auth-title" onCancel={onClose} onClose={onClose}>
    <button className="dialog-close" onClick={onClose}>Close</button><section id="auth-panel">
      <p className="eyebrow">Your account</p><h2 id="auth-title">Welcome to SAGE.</h2>
      {session && mode !== 'update' ? <><p>{session.user.email}</p><button disabled={busy} onClick={logout}>Sign out</button></> : <>
        <form onSubmit={submit}>
          {mode !== 'update' && <><label htmlFor="auth-email">Email</label><input id="auth-email" name="email" type="email" autoComplete="email" required /></>}
          {mode !== 'reset' && <><label htmlFor="auth-password">Password</label><input id="auth-password" name="password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={mode === 'signin' ? 1 : 8} required /></>}
          <button disabled={busy || !supabase} type="submit">{({ signin: 'Sign in', signup: 'Create account', reset: 'Send reset email', update: 'Set new password' })[mode]}</button>
        </form>
        <button onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setMessage(''); }}>{mode === 'signup' ? 'Back to sign in' : 'Create an account'}</button>
        <button onClick={() => setMode(mode === 'reset' ? 'signin' : 'reset')}>{mode === 'reset' ? 'Back to sign in' : 'Forgot password?'}</button>
      </>}
      <p role="status">{message}</p><p>Accounts protect saved data. The simulator is public.</p>
    </section>
  </dialog>;
}

function Environment({ pose, hazards, stale, theme }) {
  const host = useRef(), scene = useRef();
  const [status, setStatus] = useState('Loading scene…'), [frame, setFrame] = useState('building'), [modelFrame, setModelFrame] = useState('demo_room');
  useEffect(() => {
    let disposed = false;
    import('./environment.js').then(({ createEnvironment }) => {
      if (!disposed) scene.current = createEnvironment(host.current, setStatus);
    }).catch(() => setStatus('3D could not load. Text data is still available.'));
    return () => { disposed = true; scene.current?.dispose(); scene.current = null; };
  }, []);
  useEffect(() => { scene.current?.pose(pose, stale); }, [pose, stale, modelFrame, status]);
  useEffect(() => { scene.current?.hazards(stale ? [] : hazards); }, [hazards, stale, modelFrame, status]);
  useEffect(() => { scene.current?.theme(theme === 'dark'); }, [theme, status]);
  async function load(event) {
    const file = event.target.files?.[0]; if (!file) return;
    try { await scene.current?.load(file, frame); setModelFrame(frame.trim()); }
    catch (error) { setStatus(error.message); }
    event.target.value = '';
  }
  return <section className="environment" aria-labelledby="environment-title">
    <div className="section-header"><h2 id="environment-title">Environment</h2><span className="badge">{modelFrame === 'demo_room' ? 'Demo model' : 'Local GLB'}</span></div>
    <div ref={host} className="scene-viewport" />
    <div className="scene-controls">{['rotate', 'in', 'out', 'reset'].map(action => <button key={action} onClick={() => scene.current?.view(action)}>{({ rotate: 'Rotate view', in: 'Zoom in', out: 'Zoom out', reset: 'Reset view' })[action]}</button>)}</div>
    <p className="scene-help" role="status">{status}</p>
    <details className="scene-help"><summary>Load a building</summary>
      <p>Self-contained GLB, up to 30 MB. Stays on this device. Preserve the EE coordinate origin and meter scale.</p>
      <label>Coordinate frame <input value={frame} onChange={e => setFrame(e.target.value)} maxLength={128} /></label>
      <label className="file-label">Choose .glb<input type="file" accept=".glb" onChange={load} /></label>
      <button onClick={() => { scene.current?.demo(); setModelFrame('demo_room'); }}>Return to demo room</button>
    </details>
    <div className="scene-footer"><span>X/Z: floor · Y: up · meters</span><span>{pose ? pose.coordinate_frame === modelFrame ? stale ? 'Position stale' : `${pose.simulated ? 'Simulated' : 'Received'} position` : 'Position hidden: coordinate frames differ' : 'Position unknown'}</span></div>
  </section>;
}

function App() {
  const [theme, setTheme] = useState(document.documentElement.dataset.theme || 'light');
  const [session, setSession] = useState(null), [account, setAccount] = useState(false);
  const [mode, setMode] = useState('demo'), [endpoint, setEndpoint] = useState(configuredSocket);
  const [connection, setConnection] = useState('Disconnected'), [connected, setConnected] = useState(false);
  const [pose, setPose] = useState(null), [hazards, setHazards] = useState([]), [systems, setSystems] = useState(null);
  const [systemAt, setSystemAt] = useState(0);
  const [observations, setObservations] = useState([]), [raw, setRaw] = useState('No message received');
  const [last, setLast] = useState(0), [poseAt, setPoseAt] = useState(0), [hazardAt, setHazardAt] = useState(0), [clock, setClock] = useState(Date.now());
  const [autoReconnect, setAutoReconnect] = useState(true), [notice, setNotice] = useState('');
  const [image, setImage] = useState(null), [consent, setConsent] = useState(false), [analyzing, setAnalyzing] = useState(false);
  const [speech, setSpeech] = useState(false);
  const lastSpoken = useRef(0);
  const [history, setHistory] = useState([]), [historyStatus, setHistoryStatus] = useState('');
  const socket = useRef(), retry = useRef(), wanted = useRef(false), attempts = useRef(0), reconnect = useRef(true), sessionRef = useRef(null), userId = useRef(null), mounted = useRef(true);
  reconnect.current = autoReconnect; sessionRef.current = session;
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#09090b' : '#f5f5f7';
    try { localStorage.setItem('sage-theme', theme); } catch {}
  }, [theme]);
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event, value) => {
      setSession(value); userId.current = value?.user.id || null;
      setHistory([]); setHistoryStatus('');
      if (event === 'SIGNED_OUT') { setObservations(old => old.filter(item => item.source !== 'image')); setImage(null); setConsent(false); setNotice(''); }
      if (event === 'PASSWORD_RECOVERY') setAccount(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    mounted.current = true;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => { mounted.current = false; wanted.current = false; clearInterval(timer); clearTimeout(retry.current); socket.current?.close(); };
  }, []);
  function addObservation(item, source) {
    setObservations(old => [{ ...item, source, receivedAt: Date.now() }, ...old.filter(v => v.observation_id !== item.observation_id)].slice(0, 20));
  }
  function disconnect() {
    wanted.current = false; clearTimeout(retry.current);
    const old = socket.current; socket.current = null; old?.close();
    window.speechSynthesis?.cancel();
    setConnected(false); setConnection('Disconnected — retained data is historical');
  }
  function connect() {
    if (Capacitor.isNativePlatform() && mode === 'demo' && !configuredSocket) { setConnection('Configure VITE_WS_URL before packaging the iOS app.'); return; }
    clearTimeout(retry.current); socket.current?.close();
    let url;
    try { url = socketURL(mode === 'demo' ? configuredSocket || `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/demo` : endpoint); }
    catch (error) { setConnection(error.message); return; }
    wanted.current = true; setConnected(false); setConnection('Connecting…'); setPose(null); setHazards([]); setSystems(null); setLast(0); setPoseAt(0); setHazardAt(0);
    let ws;
    try { ws = new WebSocket(url); } catch { wanted.current = false; setConnection('Unable to open connection. Check the endpoint.'); return; }
    socket.current = ws; let sequence = -1;
    const timeout = setTimeout(() => { if (ws.readyState === WebSocket.CONNECTING) ws.close(); }, 10000);
    ws.onopen = () => { if (socket.current !== ws) return; clearTimeout(timeout); attempts.current = 0; setConnected(true); setLast(Date.now()); setConnection(mode === 'demo' ? 'Connected — simulator' : 'Connected — external source (unverified)'); };
    ws.onmessage = ({ data }) => {
      if (socket.current !== ws) return;
      setRaw(String(data).slice(0, 32768));
      try {
        const m = parseMessage(data, mode === 'demo');
        if (m.type === 'pose_update') { if (m.sequence <= sequence) throw Error('Out-of-order position.'); sequence = m.sequence; setPose(m); setPoseAt(Date.now()); }
        if (m.type === 'semantic_observation') addObservation(m, 'stream');
        if (m.type === 'hazard_update') { setHazards(m.hazards.map(h => ({ ...h, coordinate_frame: m.coordinate_frame, simulated: m.simulated }))); setHazardAt(Date.now()); }
        if (m.type === 'system_status') { setSystems(m); setSystemAt(Date.now()); }
        setLast(Date.now()); setNotice('');
      } catch (error) { setNotice(`Ignored message: ${error.message}`); }
    };
    ws.onerror = () => { if (socket.current === ws) setConnection('Connection unavailable'); };
    ws.onclose = () => {
      clearTimeout(timeout);
      if (socket.current !== ws || !mounted.current) return;
      socket.current = null; setConnected(false); setConnection('Disconnected — retained data is historical');
      if (wanted.current && reconnect.current) {
        const delay = Math.min(30000, 1000 * 2 ** attempts.current++);
        setConnection(`Disconnected — retrying in ${delay / 1000}s`); retry.current = setTimeout(connect, delay);
      }
    };
  }
  async function analyzeImage() {
    if (!session || !image || !consent) return;
    if (Capacitor.isNativePlatform() && !apiBase) return setNotice('Configure VITE_API_URL before packaging iOS.');
    if (image.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png'].includes(image.type)) return setNotice('Choose a JPEG/PNG up to 5 MB.');
    const owner = session.user.id; setAnalyzing(true); setNotice('Analyzing the selected image…');
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw Error('Sign in again.');
      const response = await fetch(`${apiBase}/api/analyze`, { method: 'POST', headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': image.type }, body: image, signal: AbortSignal.timeout(65000) });
      const body = await response.json();
      if (!response.ok) throw Error(typeof body.detail === 'string' ? body.detail : 'Analysis unavailable.');
      if (!Array.isArray(body) || body.length > 10) throw Error('Invalid analysis response.');
      const validated = body.map(item => parseMessage(JSON.stringify(item)));
      if (userId.current !== owner) return;
      validated.forEach(item => addObservation(item, 'image'));
      setNotice(validated.length ? 'Analysis complete. Locations and navigation risk remain unknown.' : 'No identifiable objects returned. This does not establish that the scene is safe.');
    } catch (error) { setNotice(error.name === 'TimeoutError' ? 'Analysis timed out.' : error.message); }
    finally { setAnalyzing(false); }
  }
  async function save(item) {
    try { const { receivedAt, source, ...payload } = item; await saveObservation(payload, session?.user.id); setNotice('Observation saved to your history.'); }
    catch (error) { setNotice(error.message); }
  }
  async function refreshHistory() {
    if (!session) return setHistoryStatus('Sign in to view your history.');
    const owner = session.user.id; setHistoryStatus('Loading…');
    try { const rows = await loadHistory(); if (userId.current === owner) { setHistory(rows); setHistoryStatus(rows.length ? 'Latest 50 or fewer saved observations.' : 'No saved observations.'); } }
    catch (error) { if (userId.current === owner) setHistoryStatus(error.message); }
  }
  async function preference(save) {
    if (!session || !supabase) return setNotice('Sign in to sync preferences.');
    const owner = session.user.id;
    const result = save ? await supabase.from('preferences').upsert({ user_id: owner, theme }) : await supabase.from('preferences').select('theme').eq('user_id', owner).maybeSingle();
    if (userId.current !== owner) return;
    if (result.error) return setNotice('Preferences unavailable. Apply the database migration and check connectivity.');
    if (!save && ['dark', 'light'].includes(result.data?.theme)) setTheme(result.data.theme);
    setNotice(save ? 'Theme saved to your account.' : 'Account theme loaded if available.');
  }
  const stale = !connected || !poseAt || clock - poseAt > 5000 || systems?.localization === 'unavailable';
  const hazardStale = !connected || !hazardAt || clock - hazardAt > 5000 || systems?.perception === 'unavailable';
  useEffect(() => {
    if (!speech || hazardStale || !('speechSynthesis' in window)) return;
    const high = hazards.find(item => item.severity === 'high');
    if (high && Date.now() - lastSpoken.current > 10000) {
      lastSpoken.current = Date.now();
      const utterance = new SpeechSynthesisUtterance(`${high.simulated ? 'Simulation. ' : ''}High priority hazard reported. Check the monitoring display.`);
      window.speechSynthesis.speak(utterance);
    }
  }, [hazards, hazardStale, speech]);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  return <>
    <a className="skip-link" href="#main">Skip to main content</a>
    <header className="topbar"><a className="brand" href="/">sage.</a><span className="edition">Spatial Accessibility Guidance Engine</span><span className="version">Software preview</span>
      <button className="theme-toggle" aria-pressed={theme === 'dark'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>Dark theme</button>
      <button className="account-button" onClick={() => setAccount(true)}>{session ? 'Account' : 'Sign in'}</button>
    </header>
    <main id="main" tabIndex="-1">
      <div className="intro"><p className="eyebrow">Environment overview</p><h1>Your surroundings.<br />A little clearer.</h1><p className="intro-copy">Your environment, observations, and system state.<br />A clearer view, wherever you are.</p></div>
      <div className="workspace"><Environment pose={pose} hazards={hazardStale ? [] : hazards} stale={stale} theme={theme} />
        <aside aria-label="Monitoring status"><section className="status-panel" id="telemetry-panel"><p className="eyebrow">Data connection</p><h2>{mode === 'demo' ? 'Laptop simulator' : 'External backend'}</h2>
          <p role="status">{connected && last && clock - last > 5000 ? 'Stale — no recent valid messages' : connection}</p>
          <label>Source<select value={mode} onChange={e => { disconnect(); setMode(e.target.value); setObservations([]); }}>{['demo', 'external'].map(v => <option key={v} value={v}>{v === 'demo' ? 'Simulated data' : 'EE/backend endpoint'}</option>)}</select></label>
          {mode === 'external' && <><label>WebSocket URL<input type="url" value={endpoint} onChange={e => { disconnect(); setEndpoint(e.target.value); }} placeholder="wss://your-backend.example/stream" /></label><p>No SAGE tokens are forwarded to arbitrary endpoints. The EE authentication contract must be agreed before protected data is connected.</p></>}
          <div className="actions"><button onClick={connect}>Connect</button><button onClick={disconnect}>Disconnect</button></div>
          <label><input type="checkbox" checked={autoReconnect} onChange={e => { setAutoReconnect(e.target.checked); if (!e.target.checked) clearTimeout(retry.current); }} /> Reconnect automatically</label>
          <label><input type="checkbox" checked={speech} disabled={!("speechSynthesis" in window)} onChange={e => { setSpeech(e.target.checked); if (!e.target.checked) window.speechSynthesis?.cancel(); }} /> Speak high-priority reports (optional device voice)</label><dl><div><dt>Position</dt><dd>{pose ? `X ${pose.x.toFixed(2)} · Z ${pose.z.toFixed(2)} m${stale ? ' (stale)' : ''}` : 'Unknown'}</dd></div><div><dt>Frame</dt><dd>{pose?.coordinate_frame || 'Unknown'}</dd></div><div><dt>Localization</dt><dd>{!connected || clock - systemAt > 5000 ? 'Unknown / stale' : systems?.localization || 'Unknown'}</dd></div><div><dt>Perception</dt><dd>{!connected || clock - systemAt > 5000 ? 'Unknown / stale' : systems?.perception || 'Unknown'}</dd></div><div><dt>Hazards</dt><dd>{hazardStale ? 'Unknown / stale' : `${hazards.length} reported`}</dd></div></dl>
          {!hazardStale && hazards.map(h => <p key={h.id}>{h.simulated ? 'Simulated ' : ''}{h.severity}: X {h.x}, Z {h.z} m</p>)}
          <details><summary>Latest raw message</summary><pre>{raw}</pre></details>
        </section></aside>
      </div>
      <div className="tools-grid">
        <section className="observations"><p className="eyebrow">Perception</p><h2>Observations</h2><p>Labels are evidence, not collision decisions. Unlocated objects are not placed in 3D.</p>
          {observations.length === 0 && <p>No observations received.</p>}
          {observations.map(item => <article key={item.observation_id}><h3>{item.object_label}</h3><p>{item.simulated ? 'Simulated' : 'Received observation'} · confidence {item.confidence == null ? 'not provided' : `${Math.round(item.confidence * 100)}%`}</p><p>{item.timestamp}</p><p>{item.source === 'image' ? 'Single-image result; not a live feed' : !connected || clock - item.receivedAt > 12000 ? 'Historical / stale' : 'Recently received'}</p><button disabled={!session} onClick={() => save(item)}>Save to my history</button><details><summary>Parsed observation</summary><pre>{JSON.stringify(item, null, 2)}</pre></details></article>)}
        </section>
        <section className="status-panel"><p className="eyebrow">Controlled image analysis</p><h2>Understand an image.</h2><p>Select a JPEG or PNG, up to 5 MB. Analysis sends this image to your backend and Google Gemini. Images are not stored by this app.</p><label>Choose image<input type="file" accept="image/jpeg,image/png" onChange={e => { setImage(e.target.files?.[0] || null); setConsent(false); }} /></label><label><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> Send this selected image to Gemini for analysis</label><button disabled={!session || !image || !consent || analyzing} onClick={analyzeImage}>{analyzing ? 'Analyzing…' : 'Analyze image'}</button>{!session && <p>Sign in to analyze images.</p>}<p>No distances, personal identification, or safety guarantees are inferred.</p></section>
      </div>
      <p role="status" className="notice">{notice}</p>
      <details className="details"><summary>My saved history and preferences</summary><div className="actions"><button disabled={!session} onClick={refreshHistory}>Refresh history</button><button disabled={!session} onClick={() => preference(true).catch(() => setNotice('Preferences unavailable.'))}>Save account theme</button><button disabled={!session} onClick={() => preference(false).catch(() => setNotice('Preferences unavailable.'))}>Load account theme</button></div><p role="status">{historyStatus}</p>{history.map(row => <p key={row.id}>{row.payload.object_label} · {row.observed_at} · {row.payload.simulated ? 'simulated' : 'model result'}</p>)}</details>
      <details className="details"><summary>How this preview works</summary><p>A laptop can run the entire simulator. No Raspberry Pi is required. The blue marker uses received X/Z coordinates only when its frame matches the model. Red and amber areas are supplied hazard reports, not Gemini guesses. A missing or stale report does not mean the area is clear.</p></details>
    </main>
    <footer><span>SAGE · Spatial awareness, thoughtfully designed.</span><span>Software preview · Not a mobility safety system</span></footer>
    <Account session={session} open={account} onClose={() => setAccount(false)} />
  </>;
}
createRoot(document.getElementById('root')).render(<App />);
