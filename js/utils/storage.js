// NormieSticker — localStorage helpers

const RECENT_KEY = 'normie_mirror_recent';
const MAX_RECENT = 10;

export function loadRecentNormies() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRecentNormie(id) {
  const recent = loadRecentNormies();
  const filtered = recent.filter(r => r.id !== id);
  filtered.unshift({ id, ts: Date.now() });
  const trimmed = filtered.slice(0, MAX_RECENT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(trimmed));
  } catch { /* ignore */ }
  return trimmed;
}

export function clearRecent() {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch { /* ignore */ }
}
