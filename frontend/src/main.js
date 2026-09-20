// Styles load directly from HTML, independently of JavaScript dependencies.

const themeButton = document.querySelector('.theme-toggle');
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
let hasSavedPreference = false;
try {
  hasSavedPreference = ['light', 'dark'].includes(localStorage.getItem('sage-theme'));
} catch {
  // The switch still works for this visit if browser storage is unavailable.
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeButton.setAttribute('aria-pressed', String(theme === 'dark'));
  document.querySelector('meta[name="theme-color"]').content =
    theme === 'dark' ? '#09090b' : '#f5f5f7';
}

applyTheme(document.documentElement.dataset.theme);
themeButton.hidden = false;
themeButton.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  hasSavedPreference = true;
  try {
    localStorage.setItem('sage-theme', next);
  } catch {
    // Do not interrupt the page when persistence is blocked.
  }
});

// Follow device changes until the user explicitly chooses a theme.
systemTheme.addEventListener('change', ({ matches }) => {
  if (!hasSavedPreference) applyTheme(matches ? 'dark' : 'light');
});

// Rendering stays independent from theme controls and future networking.
import { createEnvironment } from './environment.js';
const disposeEnvironment = createEnvironment(
  document.querySelector('#environment-canvas'),
  document.querySelector('.scene-controls'),
  document.querySelector('#scene-status'),
);
if (import.meta.hot) import.meta.hot.dispose(disposeEnvironment);

import { connectTelemetry } from './telemetry.js';
const disposeTelemetry = connectTelemetry(document.querySelector('#telemetry-panel'));
if (import.meta.hot) import.meta.hot.dispose(disposeTelemetry);

const accountDialog = document.querySelector('#account-dialog');
const accountButton = document.querySelector('#open-account');
accountButton.addEventListener('click', () => accountDialog.showModal());
accountDialog.querySelector('.dialog-close').addEventListener('click', () => accountDialog.close());

// Auth failures should never prevent theme controls or the page from rendering.
let disposeAuth;
let authDisposed = false;
import('./auth.js').then(({ setupAuth }) => {
  if (!authDisposed) disposeAuth = setupAuth(document.querySelector('#auth-panel'));
}).catch(() => {
  document.querySelector('[data-identity]').textContent = 'Sign-in temporarily unavailable';
  document.querySelector('[data-auth-status]').textContent = 'Reload the page to try again.';
  document.querySelectorAll('#auth-panel button, #auth-panel input').forEach(element => { element.disabled = true; });
});
if (import.meta.hot) import.meta.hot.dispose(() => {
  authDisposed = true;
  disposeAuth?.();
  accountDialog.close();
});