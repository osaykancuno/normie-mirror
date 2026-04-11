// Normie Mirror — Entry point + hash router

import { getState, setState } from './state.js';
import { loadRecentNormies } from './utils/storage.js';
import { mountHome } from './screens/home-screen.js';
import { mountCamera } from './screens/camera-screen.js';
import { mountMural } from './screens/mural-screen.js';
import { mountCapture } from './screens/capture-screen.js';
import { mountQR } from './screens/qr-screen.js';

const app = document.getElementById('app');
let currentUnmount = null;

const routes = {
  '':        mountHome,
  'camera':  mountCamera,
  'mural':   mountMural,
  'capture': mountCapture,
  'qr':      mountQR,
};

function parseHash() {
  const hash = window.location.hash.replace('#/', '').replace('#', '');
  const parts = hash.split('/');
  return { route: parts[0] || '', param: parts[1] || null };
}

function navigate() {
  const { route, param } = parseHash();

  // Unmount previous screen
  if (currentUnmount) {
    currentUnmount();
    currentUnmount = null;
  }
  app.innerHTML = '';

  // If param is a normie ID, set it in state
  if (param && /^\d+$/.test(param)) {
    setState({ normieId: parseInt(param, 10) });
  }

  const mountFn = routes[route] || routes[''];
  currentUnmount = mountFn(app) || null;
}

// Handle ?id= query param (from QR codes)
function handleQueryParam() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (id && /^\d+$/.test(id)) {
    window.location.replace(`#/camera/${id}`);
    return true;
  }
  return false;
}

// Public navigation helper
export function navigateTo(path) {
  window.location.hash = `#/${path}`;
}

// Init
function init() {
  setState({ recentNormies: loadRecentNormies() });

  if (!handleQueryParam()) {
    window.addEventListener('hashchange', navigate);
    navigate();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
