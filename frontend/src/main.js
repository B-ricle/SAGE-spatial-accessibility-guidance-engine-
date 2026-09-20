import './styles.css';

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
