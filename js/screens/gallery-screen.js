// Normie Mirror — Gallery Screen (wallet → grid of owned Normies)

import { getState, setState } from '../state.js';
import { getHoldings, loadNormie } from '../api/normies.js';
import { cachedFetch } from '../api/cache.js';
import { renderNormieToCanvas } from '../render/pixel-renderer.js';
import { el, showToast } from '../ui/components.js';
import { navigateTo } from '../app.js';

const GRID_PX = 80; // each thumbnail size
const BATCH = 8;     // load this many at a time

export function mountGallery(container) {
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
    style: { flex: '1', fontSize: '11px', letterSpacing: '0.5px' },
  });
  const searchBtn = el('button', {
    className: 'btn btn--small',
    onClick: () => handleSearch(),
    style: { whiteSpace: 'nowrap', padding: '14px 16px' },
  }, 'SEARCH');
  inputRow.append(input, searchBtn);

  // Count label
  const countLabel = el('p', {
    style: {
      fontFamily: 'var(--font-pixel)', fontSize: '10px',
      color: 'var(--color-text-muted)', marginBottom: '16px', display: 'none',
    }
  });

  // Grid container
  const grid = el('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fill, minmax(${GRID_PX}px, 1fr))`,
      gap: '8px',
      width: '100%',
      maxWidth: '400px',
    }
  });

  // Back button
  const backBtn = el('button', {
    className: 'btn',
    onClick: () => navigateTo(''),
    style: { marginTop: '20px', marginBottom: '20px' },
  }, '\u2190 BACK');

  // Footer
  const footer = el('div', { className: 'footer' });
  footer.innerHTML = 'built by <a href="https://x.com/osaykancuno" target="_blank" rel="noopener">osaykancuno</a>';

  screen.append(header, inputRow, countLabel, grid, backBtn, footer);
  container.appendChild(screen);

  // Logic
  let loading = false;

  async function handleSearch() {
    const address = input.value.trim();
    if (!address || loading) return;

    // Validate
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
      const ids = data.tokenIds || [];

      if (ids.length === 0) {
        showToast('No Normies found');
        loading = false;
        searchBtn.textContent = 'SEARCH';
        return;
      }

      countLabel.textContent = `${ids.length} NORMIE${ids.length !== 1 ? 'S' : ''}`;
      countLabel.style.display = 'block';

      // Load thumbnails in batches
      for (let i = 0; i < ids.length; i += BATCH) {
        const batch = ids.slice(i, i + BATCH);
        await Promise.all(batch.map(id => loadThumbnail(id, grid)));
      }
    } catch (err) {
      showToast('Failed to load holdings');
    } finally {
      loading = false;
      searchBtn.textContent = 'SEARCH';
    }
  }

  async function loadThumbnail(id, container) {
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
    container.appendChild(cell);

    try {
      const data = await cachedFetch(`normie_${id}`, () => loadNormie(id));
      const ctx = canvas.getContext('2d');
      renderNormieToCanvas(ctx, data.pixels, 0, 0, 2);
    } catch {
      canvas.style.opacity = '0.3';
    }
  }

  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSearch(); });

  return () => {};
}
