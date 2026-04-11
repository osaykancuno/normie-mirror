// Normie Mirror — Home Screen

import { getState, setState } from '../state.js';
import { loadNormie } from '../api/normies.js';
import { cachedFetch } from '../api/cache.js';
import { createNormieSprite, renderNormieToCanvas } from '../render/pixel-renderer.js';
import { saveRecentNormie } from '../utils/storage.js';
import { el, createButton, showToast } from '../ui/components.js';
import { navigateTo } from '../app.js';

export function mountHome(container) {
  const screen = el('div', { className: 'screen screen--center' });
  screen.style.padding = '24px';
  screen.style.gap = '24px';

  // Title
  const title = el('h1', {
    style: { color: 'var(--color-accent)', textAlign: 'center', lineHeight: '1.8' }
  }, 'NORMIE');
  const subtitle = el('h2', {
    style: { color: 'var(--color-text)', textAlign: 'center', marginTop: '4px' }
  }, 'MIRROR');

  const tagline = el('p', {
    style: {
      fontFamily: 'var(--font-pixel)',
      fontSize: '8px',
      color: 'var(--color-text-muted)',
      textAlign: 'center',
      marginTop: '8px'
    }
  }, 'Just a Normie IRL');

  // Preview canvas
  const preview = el('canvas', {
    className: 'normie-canvas',
    width: '200',
    height: '200',
    style: {
      width: '200px',
      height: '200px',
      border: '3px solid var(--color-dark)',
      background: 'var(--color-surface)',
      display: 'none',
    }
  });

  // Normie name label
  const nameLabel = el('p', {
    style: {
      fontFamily: 'var(--font-pixel)',
      fontSize: '10px',
      color: 'var(--color-text)',
      textAlign: 'center',
      display: 'none',
    }
  });

  // Input
  const input = el('input', {
    className: 'input',
    type: 'number',
    placeholder: 'ENTER NORMIE ID',
    style: { maxWidth: '280px' }
  });

  // Error label
  const errorLabel = el('p', {
    style: {
      fontFamily: 'var(--font-pixel)',
      fontSize: '8px',
      color: 'var(--color-accent)',
      textAlign: 'center',
      display: 'none',
    }
  });

  // Buttons
  const goBtn = createButton('View in AR', () => handleGo(), 'primary');
  goBtn.style.minWidth = '200px';

  const qrBtn = createButton('Generate QR', () => {
    const state = getState();
    if (state.normieId) navigateTo(`qr/${state.normieId}`);
  }, 'ghost');
  qrBtn.style.minWidth = '200px';
  qrBtn.style.display = 'none';

  const muralBtn = createButton('Mural Mode', () => {
    const state = getState();
    if (state.normieId) navigateTo(`mural/${state.normieId}`);
  }, 'ghost');
  muralBtn.style.minWidth = '200px';
  muralBtn.style.display = 'none';

  // Recent normies
  const recentSection = el('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      marginTop: '8px',
    }
  });

  const recentTitle = el('p', {
    style: {
      fontFamily: 'var(--font-pixel)',
      fontSize: '8px',
      color: 'var(--color-text-muted)',
    }
  }, 'RECENT');

  const recentList = el('div', {
    style: {
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap',
      justifyContent: 'center',
    }
  });

  function buildRecent() {
    const { recentNormies } = getState();
    recentList.innerHTML = '';
    if (recentNormies.length === 0) {
      recentSection.style.display = 'none';
      return;
    }
    recentSection.style.display = 'flex';
    for (const item of recentNormies) {
      const chip = el('button', {
        className: 'filter-chip',
        onClick: () => {
          input.value = item.id;
          handleGo();
        }
      }, `#${item.id}`);
      recentList.appendChild(chip);
    }
  }

  let loading = false;

  async function handleGo() {
    const id = parseInt(input.value, 10);
    if (!id || id < 0 || loading) return;
    loading = true;
    errorLabel.style.display = 'none';
    goBtn.textContent = 'LOADING...';

    try {
      const data = await cachedFetch(`normie_${id}`, () => loadNormie(id));
      setState({
        normieId: id,
        pixelData: data.pixels,
        traits: data.traits,
        metadata: data.metadata,
      });

      // Show preview
      const ctx = preview.getContext('2d');
      ctx.clearRect(0, 0, 200, 200);
      renderNormieToCanvas(ctx, data.pixels, 0, 0, 5);
      preview.style.display = 'block';

      // Show name
      const name = data.metadata?.name || `Normie #${id}`;
      nameLabel.textContent = name;
      nameLabel.style.display = 'block';

      // Show action buttons
      qrBtn.style.display = 'block';
      muralBtn.style.display = 'block';

      // Save to recent
      const recent = saveRecentNormie(id);
      setState({ recentNormies: recent });
      buildRecent();

      // Navigate to camera after brief preview
      goBtn.textContent = 'VIEW IN AR';
      goBtn.onclick = () => navigateTo(`camera/${id}`);

    } catch (err) {
      errorLabel.textContent = 'NORMIE NOT FOUND';
      errorLabel.style.display = 'block';
      preview.style.display = 'none';
      nameLabel.style.display = 'none';
      qrBtn.style.display = 'none';
      muralBtn.style.display = 'none';
    } finally {
      loading = false;
      if (goBtn.textContent === 'LOADING...') goBtn.textContent = 'VIEW IN AR';
    }
  }

  // Enter key support
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleGo();
  });

  // Build recent list
  buildRecent();
  recentSection.appendChild(recentTitle);
  recentSection.appendChild(recentList);

  // Assemble
  screen.append(title, subtitle, tagline, preview, nameLabel, errorLabel, input, goBtn, qrBtn, muralBtn, recentSection);
  container.appendChild(screen);

  // If there's already a normie loaded, show it
  const { normieId, pixelData, metadata } = getState();
  if (normieId && pixelData) {
    input.value = normieId;
    const ctx = preview.getContext('2d');
    renderNormieToCanvas(ctx, pixelData, 0, 0, 5);
    preview.style.display = 'block';
    nameLabel.textContent = metadata?.name || `Normie #${normieId}`;
    nameLabel.style.display = 'block';
    qrBtn.style.display = 'block';
    muralBtn.style.display = 'block';
    goBtn.textContent = 'VIEW IN AR';
    goBtn.onclick = () => navigateTo(`camera/${normieId}`);
  }

  return () => { /* cleanup */ };
}
