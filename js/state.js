// Normie Mirror — Minimal pub/sub state store

const state = {
  normieId: null,
  pixelData: null,
  traits: null,
  metadata: null,
  overlayPosition: { x: 0.5, y: 0.5 },
  overlayScale: 1.0,
  overlayRotation: 0,
  mode: 'camera', // 'camera' | 'mural'
  perspectiveCorners: null,
  capturedMedia: null,
  capturedType: null, // 'photo' | 'video'
  isRecording: false,
  activeFilter: 'none',
  cameraFacing: 'environment',
  recentNormies: [],
};

const listeners = new Map();

export function getState() {
  return state;
}

export function setState(updates) {
  const changed = [];
  for (const key in updates) {
    if (state[key] !== updates[key]) {
      state[key] = updates[key];
      changed.push(key);
    }
  }
  if (changed.length > 0) {
    for (const key of changed) {
      const fns = listeners.get(key);
      if (fns) fns.forEach(fn => fn(state[key], state));
    }
    // Wildcard listeners
    const wildcards = listeners.get('*');
    if (wildcards) wildcards.forEach(fn => fn(state));
  }
}

export function subscribe(key, fn) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(fn);
  return () => listeners.get(key).delete(fn);
}

export function resetOverlay() {
  setState({
    overlayPosition: { x: 0.5, y: 0.5 },
    overlayScale: 1.0,
    overlayRotation: 0,
  });
}
