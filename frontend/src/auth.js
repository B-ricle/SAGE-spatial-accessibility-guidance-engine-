import { supabase } from './supabase.js';

export function setupAuth(panel) {
  const form = panel.querySelector('form');
  const status = panel.querySelector('[data-auth-status]');
  const identity = panel.querySelector('[data-identity]');
  const signOut = panel.querySelector('[data-sign-out]');
  const modeButton = panel.querySelector('[data-auth-mode]');
  const submit = form.querySelector('[type=submit]');
  const password = form.elements.password;
  let signingUp = false;
  let busy = false;
  let disposed = false;
  function loading(value) {
    busy = value;
    panel.querySelectorAll('button, input').forEach(control => { control.disabled = value; });
    form.setAttribute('aria-busy', String(value));
  }
  function render(session) {
    if (disposed) return;
    document.querySelector('#open-account').textContent = session ? 'Account' : 'Sign in';
    form.hidden = Boolean(session);
    modeButton.hidden = Boolean(session);
    signOut.hidden = !session;
    identity.textContent = session ? `Signed in as ${session.user.email || 'SAGE user'}` : 'Not signed in';
    if (!session) password.value = '';
  }
  if (!supabase) {
    status.textContent = 'Sign-in unavailable: configure the Supabase URL and publishable key.';
    loading(true);
    return () => {};
  }
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    render(session);
    if (event === 'SIGNED_OUT') status.textContent = 'Signed out on this device.';
    if (event === 'SIGNED_IN') status.textContent = 'Signed in successfully.';
  });
  function changeMode() {
    signingUp = !signingUp;
    submit.textContent = signingUp ? 'Create account' : 'Sign in';
    modeButton.textContent = signingUp ? 'Already have an account? Sign in' : 'New to SAGE? Create an account';
    password.autocomplete = signingUp ? 'new-password' : 'current-password';
    password.minLength = signingUp ? 8 : 1;
    status.textContent = signingUp ? 'Use at least 8 characters. Your project may require a stronger password.' : '';
  }
  async function authenticate(event) {
    event.preventDefault();
    if (busy) return;
    loading(true);
    status.textContent = signingUp ? 'Creating account…' : 'Signing in…';
    const credentials = { email: form.elements.email.value.trim(), password: password.value };
    try {
      const { data, error } = signingUp
        ? await supabase.auth.signUp({ ...credentials, options: { emailRedirectTo: location.origin } })
        : await supabase.auth.signInWithPassword(credentials);
      if (disposed) return;
      if (error) {
        status.textContent = error.status === 429 ? 'Too many attempts. Please wait and try again.' :
          signingUp ? 'Account creation failed. Check your details and the project password requirements, then try again.' :
          'Sign-in failed. Check your credentials, email confirmation, and connection.';
      } else {
        render(data.session);
        status.textContent = data.session ? 'Signed in successfully.' :
          'Check your email for a confirmation link if confirmation is required, then return to sign in.';
      }
    } catch {
      if (!disposed) status.textContent = 'Unable to reach sign-in. Check your connection and try again.';
    } finally {
      password.value = '';
      if (!disposed) loading(false);
    }
  }
  async function logout() {
    if (busy) return;
    loading(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (!disposed) status.textContent = error ? 'Sign-out failed. Please try again.' : 'Signed out on this device.';
    } catch {
      if (!disposed) status.textContent = 'Sign-out failed. Check your connection and try again.';
    } finally { if (!disposed) loading(false); }
  }
  form.addEventListener('submit', authenticate);
  modeButton.addEventListener('click', changeMode);
  signOut.addEventListener('click', logout);
  return () => {
    disposed = true;
    subscription.unsubscribe();
    form.removeEventListener('submit', authenticate);
    modeButton.removeEventListener('click', changeMode);
    signOut.removeEventListener('click', logout);
  };
}
