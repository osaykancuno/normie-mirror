// NormieSticker — API client for api.normies.art

const BASE = 'https://api.normies.art';
const MAX_ID = 99999;

function validateId(id) {
  const n = Number(id);
  if (!Number.isInteger(n) || n < 0 || n > MAX_ID) {
    throw new Error(`Invalid Normie ID: ${id}`);
  }
  return n;
}

function validateAddress(address) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error('Invalid wallet address');
  }
  return address;
}

async function fetchJSON(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

async function fetchText(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.text();
}

export async function getPixels(id) {
  return fetchText(`/normie/${validateId(id)}/pixels`);
}

export async function getTraits(id) {
  return fetchJSON(`/normie/${validateId(id)}/traits`);
}

export async function getMetadata(id) {
  return fetchJSON(`/normie/${validateId(id)}/metadata`);
}

export async function getOwner(id) {
  return fetchJSON(`/normie/${validateId(id)}/owner`);
}

export async function getHoldings(address) {
  return fetchJSON(`/holders/${validateAddress(address)}`);
}

export function getSvgUrl(id) {
  return `${BASE}/normie/${validateId(id)}/image.svg`;
}

export function getPngUrl(id) {
  return `${BASE}/normie/${validateId(id)}/image.png`;
}

export async function getCanvasInfo(id) {
  return fetchJSON(`/normie/${validateId(id)}/canvas/info`);
}

// Load all data needed for AR display
export async function loadNormie(id) {
  const [pixels, traits, metadata] = await Promise.all([
    getPixels(id),
    getTraits(id),
    getMetadata(id),
  ]);
  return { id, pixels, traits, metadata };
}
