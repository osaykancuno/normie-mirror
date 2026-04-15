// NormieSticker — Gallery Screen (wallet → grid of owned Normies)

import { setState } from '../state.js';
import { getHoldings, loadNormie } from '../api/normies.js';
import { cachedFetch } from '../api/cache.js';
import { renderNormieToCanvas } from '../render/pixel-renderer.js';
import { el, showToast } from '../ui/components.js';
import { navigateTo } from '../app.js';

const GRID_PX = 80;
const BATCH = 6;
const MAX_DISPLAY = 200; // hard cap to protect whales / the UI
const MAX_NORMIE_ID = 6969;

export function mountGallery(container) {
  let unmounted = false;
  let loading = false;

  const screen = el('div', { className: 'screen' });
  screen.style.cssText = 'align-items:center; padding:24px; overflow-y:auto;';

  // Header
  const header = el('div', { style: { textAlign: 'center', marginBottom: '20px' } });
  const title = el('h1', { style: { fontSize: '16px' } }, 'GALLERY');
  const subtitle = el('p', {
    style: {
      fontFamily: 'var(--font-body)', fontSize: '12px',
      color: 'var(--color-text-muted)', marginTop: '8px',
    }
  }, 'Enter wallet to view collection');
  header.append(title, subtitle);

  // Input row
  const inputRow = el('div', {
    style: { width: '100%', maxWidth: '360px', display: 'flex', gap: '8px', marginBottom: '20px' }
  });
  const input = el('input', {
    className: 'input',
    type: 'text',
    placeholder: '0x...',
    autocomplete: 'off',
    spellcheck: 'false',
    style: { flex: '1', fontSize: '11px', letterSpacing: '0.5px' },
  });
  const searchBtn = el('button', {
    className: 'btn btn--small',
    onClick: () => handleSearch(),
    style: { whiteSpace: 'nowrap', padding: '14px 16px' },
  }, 'SEARCH');
  inputRow.append(input, searchBtn);

  const countLabel = el('p', {
    style: {
      fontFamily: 'var(--font-pixel)', fontSize: '10px',
      color: 'var(--color-text-muted)', marginBottom: '16px', display: 'none',
    }
  });

  const grid = el('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fill, minmax(${GRID_PX}px, 1fr))`,
      gap: '8px',
      width: '100%',
      maxWidth: '400px',
    }
  });

  const backBtn = el('button', {
    className: 'btn',
    onClick: () => navigateTo(''),
    style: { marginTop: '20px', marginBottom: '20px' },
  }, '\u2190 BACK');

  const footer = el('div', { className: 'footer' });
  footer.innerHTML = 'built by <a href="https://x.com/osaykancuno" target="_blank" rel="noopener">osaykancuno</a>';

  screen.append(header, inputRow, countLabel, grid, backBtn, footer);
  container.appendChild(screen);

  function isValidId(id) {
    const n = Number(id);
    return Number.isInteger(n) && n >= 0 && n <= MAX_NORMIE_ID;
  }

  async function handleSearch() {
    if (loading) return;
    const address = input.value.trim();

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      showToast('Invalid wallet address');
      return;
    }

    loading = true;
    searchBtn.textContent = '...';
    grid.innerHTML = '';
    countLabel.style.display = 'none';

    try {
      const data = await getHoldings(address);
      if (unmounted) return;

      const rawIds = Array.isArray(data?.tokenIds) ? data.tokenIds : [];
      const validIds = rawIds.filter(isValidId).map(Number);

      if (validIds.length === 0) {
        showToast('No Normies found');
        return;
      }

      const capped = validIds.slice(0, MAX_DISPLAY);
      const truncated = validIds.length > MAX_DISPLAY;
      countLabel.textContent = truncated
        ? `${capped.length} OF ${validIds.length} NORMIES`
        : `${capped.length} NORMIE${capped.length !== 1 ? 'S' : ''}`;
      countLabel.style.display = 'block';

      // Load thumbnails in batches with per-cell error isolation
      for (let i = 0; i < capped.length; i += BATCH) {
        if (unmounted) return;
        const batch = capped.slice(i, i + BATCH);
        await Promise.allSettled(batch.map(id => loadThumbnail(id)));
      }
    } catch {
      if (!unmounted) showToast('Failed to load holdings');
    } finally {
      loading = false;
      if (!unmounted) searchBtn.textContent = 'SEARCH';
    }
  }

  async function loadThumbnail(id) {
    const cell = el('div', {
      style: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        cursor: 'pointer', gap: '4px',
      },
      onClick: () => {
        setState({ normieId: id, pixelData: null, traits: null, metadata: null });
        navigateTo(`camera/${id}`);
      }
    });

    const canvas = el('canvas', {
      width: '80', height: '80',
      style: {
        width: `${GRID_PX}px`, height: `${GRID_PX}px`,
        border: '2px solid var(--color-border)',
        background: 'var(--color-surface)',
      }
    });

    const label = el('span', {
      style: {
        fontFamily: 'var(--font-pixel)', fontSize: '8px',
        color: 'var(--color-text-muted)',
      }
    }, `#${id}`);

    cell.append(canvas, label);
    grid.appendChild(cell);

    try {
      const data = await cachedFetch(`normie_${id}`, () => loadNormie(id));
      if (unmounted) return;
      const ctx = canvas.getContext('2d');
      renderNormieToCanvas(ctx, data.pixels, 0, 0, 2);
    } catch {
      canvas.style.opacity = '0.3';
    }
  }

  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSearch(); });

  return () => { unmounted = true; };
}
