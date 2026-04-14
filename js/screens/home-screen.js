// Normie Mirror — Home Screen

import { getState, setState } from '../state.js';
import { loadNormie } from '../api/normies.js';
import { cachedFetch } from '../api/cache.js';
import { createNormieSprite, renderNormieToCanvas } from '../render/pixel-renderer.js';
import { createAnimationFn } from '../render/animation-engine.js';
import { GIFEncoder } from '../capture/gif-encoder.js';
import { saveRecentNormie } from '../utils/storage.js';
import { downloadBlob } from '../utils/share.js';
import { el, showToast } from '../ui/components.js';
import { navigateTo } from '../app.js';

const MAX_NORMIE_ID = 6969;
const GIF_SIZE = 160;
const GIF_FRAMES = 20;
const GIF_DELAY = 80; // ms per frame

export function mountHome(container) {
  const screen = el('div', { className: 'screen' });
  screen.style.cssText = 'align-items:center; justify-content:space-between; padding:24px; overflow-y:auto;';

  // === Top spacer ===
  const spacer = el('div');

  // === Main content ===
  const main = el('div', {
    style: {
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '20px', width: '100%', maxWidth: '360px',
    }
  });

  // Title block
  const titleBlock = el('div', { style: { textAlign: 'center', lineHeight: '1.6' } });
  const title = el('h1', {}, 'NORMIE');
  const subtitle = el('h1', { style: { fontSize: '14px', marginTop: '4px' } }, 'MIRROR');
  const tagline = el('p', {
    style: {
      fontFamily: 'var(--font-body)', fontSize: '13px',
      color: 'var(--color-text-muted)', marginTop: '12px',
      fontStyle: 'italic', letterSpacing: '1px',
    }
  }, 'just a normie irl');
  titleBlock.append(title, subtitle, tagline);

  // Preview canvas
  const preview = el('canvas', {
    className: 'normie-canvas', width: '200', height: '200',
    style: {
      width: '180px', height: '180px',
      border: '2px solid var(--color-border)',
      background: 'var(--color-surface)', display: 'none',
    }
  });

  // Normie name + traits
  const infoBlock = el('div', {
    style: {
      display: 'none', flexDirection: 'column', alignItems: 'center', gap: '4px',
    }
  });
  const nameLabel = el('p', {
    style: { fontFamily: 'var(--font-pixel)', fontSize: '10px', color: 'var(--color-text)' }
  });
  const traitsLabel = el('p', {
    style: {
      fontFamily: 'var(--font-body)', fontSize: '11px',
      color: 'var(--color-text-muted)', textAlign: 'center',
    }
  });
  infoBlock.append(nameLabel, traitsLabel);

  // Input row
  const inputRow = el('div', {
    style: { width: '100%', display: 'flex', gap: '8px' }
  });
  const input = el('input', {
    className: 'input', type: 'number', placeholder: 'NORMIE ID',
    style: { flex: '1' },
  });
  const randomBtn = el('button', {
    className: 'btn btn--small',
    onClick: () => {
      const randomId = Math.floor(Math.random() * MAX_NORMIE_ID) + 1;
      input.value = randomId;
      handleGo();
    },
    style: { whiteSpace: 'nowrap', fontSize: '10px', padding: '14px 16px' },
    title: 'Random Normie',
  }, '\u{1F3B2}  RANDOM');

  inputRow.append(input, randomBtn);

  // Error
  const errorLabel = el('p', {
    style: {
      fontFamily: 'var(--font-body)', fontSize: '12px',
      color: '#d32f2f', textAlign: 'center', display: 'none', fontWeight: '600',
    }
  });

  // Action buttons
  const btnGroup = el('div', {
    style: { display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }
  });

  const goBtn = el('button', {
    className: 'btn btn--primary',
    onClick: () => handleGo(),
    style: { width: '100%' },
  }, 'VIEW IN AR \u2192');

  const tweetBtn = el('button', {
    className: 'btn', style: { width: '100%', display: 'none' },
    onClick: () => shareToTwitter(),
  }, 'SHARE ON X');

  // Export row (sticker + GIF)
  const exportRow = el('div', {
    style: { display: 'flex', gap: '10px', width: '100%' }
  });
  const stickerBtn = el('button', {
    className: 'btn', style: { flex: '1', display: 'none', fontSize: '12px' },
    onClick: () => handleStickerExport(),
  }, 'STICKER PNG');
  const gifBtn = el('button', {
    className: 'btn', style: { flex: '1', display: 'none', fontSize: '12px' },
    onClick: () => handleGifExport(),
  }, 'GIF ANIM');
  exportRow.append(stickerBtn, gifBtn);

  btnGroup.append(goBtn, tweetBtn, exportRow);

  // Gallery link
  const galleryBtn = el('button', {
    className: 'btn btn--ghost',
    onClick: () => navigateTo('gallery'),
    style: { width: '100%', fontSize: '12px' },
  }, 'WALLET GALLERY');

  // Recent normies
  const recentSection = el('div', {
    style: {
      display: 'none', flexDirection: 'column', alignItems: 'center',
      gap: '10px', width: '100%',
    }
  });
  const recentLabel = el('p', {
    style: {
      fontFamily: 'var(--font-body)', fontSize: '10px',
      color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '2px',
    }
  }, 'Recent');
  const recentList = el('div', {
    style: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }
  });
  recentSection.append(recentLabel, recentList);

  main.append(titleBlock, preview, infoBlock, errorLabel, inputRow, btnGroup, galleryBtn, recentSection);

  // === Footer ===
  const footer = el('div', { className: 'footer' });
  footer.innerHTML = 'built by <a href="https://x.com/osaykancuno" target="_blank" rel="noopener">osaykancuno</a>';

  screen.append(spacer, main, footer);
  container.appendChild(screen);

  // === Logic ===
  let loading = false;
  let currentPixels = null;
  let currentTraits = null;
  let gifBusy = false;

  function shareToTwitter() {
    const { normieId } = getState();
    const appUrl = `${window.location.origin}${window.location.pathname}?id=${normieId}`;
    const text = `Just a Normie IRL \u{1F4F7}\n\nCheck out Normie #${normieId} in AR:\n${appUrl}\n\n#NormieMirror #Normies #CC0`;
    const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank', 'noopener,width=550,height=420');
  }

  function handleStickerExport() {
    if (!currentPixels) return;
    const { normieId } = getState();

    // Render transparent PNG at high res (40x10 = 400px)
    const scale = 10;
    const size = 40 * scale;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Draw only ON pixels (transparent background)
    renderNormieToCanvas(ctx, currentPixels, 0, 0, scale, { transparent: true });

    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `normie-${normieId}-sticker.png`);
        showToast('Sticker saved!');
      }
    }, 'image/png');
  }

  async function handleGifExport() {
    if (!currentPixels || !currentTraits || gifBusy) return;
    gifBusy = true;
    const { normieId } = getState();

    gifBtn.textContent = 'GENERATING...';
    gifBtn.disabled = true;

    const yieldUI = () => new Promise(r => setTimeout(r, 0));
    await yieldUI();

    try {
      const encoder = new GIFEncoder(GIF_SIZE, GIF_SIZE);
      const canvas = document.createElement('canvas');
      canvas.width = GIF_SIZE;
      canvas.height = GIF_SIZE;
      const ctx = canvas.getContext('2d');

      const sprite = createNormieSprite(currentPixels, { transparent: false });
      const animFn = createAnimationFn(currentTraits);

      for (let i = 0; i < GIF_FRAMES; i++) {
        const t = (i / GIF_FRAMES) * 2;

        ctx.clearRect(0, 0, GIF_SIZE, GIF_SIZE);
        ctx.fillStyle = '#e3e5e4';
        ctx.fillRect(0, 0, GIF_SIZE, GIF_SIZE);

        const mods = animFn(t);

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const drawSize = GIF_SIZE * 0.85;
        const cx = GIF_SIZE / 2 + mods.x;
        const cy = GIF_SIZE / 2 + mods.y;
        ctx.translate(cx, cy);
        ctx.rotate((mods.rotation || 0) * Math.PI / 180);
        ctx.scale(mods.scaleX || 1, mods.scaleY || 1);
        ctx.drawImage(sprite, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
        ctx.restore();

        const imageData = ctx.getImageData(0, 0, GIF_SIZE, GIF_SIZE);
        encoder.addFrame(imageData, GIF_DELAY);

        // Yield to UI every few frames
        if (i % 4 === 3) await yieldUI();
      }

      await yieldUI();
      const data = encoder.encode();
      const blob = new Blob([data], { type: 'image/gif' });
      downloadBlob(blob, `normie-${normieId}-animated.gif`);
      showToast('GIF saved!');
    } catch {
      showToast('GIF generation failed');
    } finally {
      gifBusy = false;
      gifBtn.textContent = 'GIF ANIM';
      gifBtn.disabled = false;
    }
  }

  function buildRecent() {
    const { recentNormies } = getState();
    recentList.innerHTML = '';
    if (recentNormies.length === 0) { recentSection.style.display = 'none'; return; }
    recentSection.style.display = 'flex';
    for (const item of recentNormies) {
      const chip = el('button', {
        className: 'recent-chip',
        onClick: () => { input.value = item.id; handleGo(); }
      }, `#${item.id}`);
      recentList.appendChild(chip);
    }
  }

  function showNormie(id, data) {
    setState({ normieId: id, pixelData: data.pixels, traits: data.traits, metadata: data.metadata });
    currentPixels = data.pixels;
    currentTraits = data.traits;

    // Preview
    const ctx = preview.getContext('2d');
    ctx.clearRect(0, 0, 200, 200);
    renderNormieToCanvas(ctx, data.pixels, 0, 0, 5);
    preview.style.display = 'block';

    // Info
    nameLabel.textContent = data.metadata?.name || `Normie #${id}`;
    const traits = data.traits;
    if (traits) {
      const parts = [];
      if (traits.Type) parts.push(traits.Type);
      if (traits.Expression) parts.push(traits.Expression);
      if (traits.Accessory && traits.Accessory !== 'None') parts.push(traits.Accessory);
      traitsLabel.textContent = parts.join(' \u00B7 ');
    }
    infoBlock.style.display = 'flex';

    // Buttons
    tweetBtn.style.display = 'block';
    stickerBtn.style.display = 'block';
    gifBtn.style.display = 'block';

    // Save recent
    const recent = saveRecentNormie(id);
    setState({ recentNormies: recent });
    buildRecent();

    // Go button navigates
    goBtn.textContent = 'VIEW IN AR \u2192';
    goBtn.disabled = false;
    goBtn.onclick = () => navigateTo(`camera/${id}`);
  }

  async function handleGo() {
    const id = parseInt(input.value, 10);
    if (!id || id < 0 || loading) return;
    loading = true;
    errorLabel.style.display = 'none';
    goBtn.textContent = 'LOADING...';
    goBtn.disabled = true;

    try {
      const data = await cachedFetch(`normie_${id}`, () => loadNormie(id));
      showNormie(id, data);
    } catch (err) {
      errorLabel.textContent = 'Normie not found';
      errorLabel.style.display = 'block';
      preview.style.display = 'none';
      infoBlock.style.display = 'none';
      tweetBtn.style.display = 'none';
      stickerBtn.style.display = 'none';
      gifBtn.style.display = 'none';
    } finally {
      loading = false;
      if (goBtn.textContent === 'LOADING...') {
        goBtn.textContent = 'VIEW IN AR \u2192';
        goBtn.disabled = false;
      }
    }
  }

  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleGo(); });
  buildRecent();

  // Restore if already loaded
  const { normieId, pixelData, metadata, traits } = getState();
  if (normieId && pixelData) {
    input.value = normieId;
    showNormie(normieId, { pixels: pixelData, traits, metadata });
  }

  return () => {};
}
