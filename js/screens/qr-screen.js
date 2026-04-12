// Normie Mirror — QR Code Screen

import { getState, setState } from '../state.js';
import { loadNormie } from '../api/normies.js';
import { cachedFetch } from '../api/cache.js';
import { renderNormieToCanvas } from '../render/pixel-renderer.js';
import { generateQRMatrix, renderQRToCanvas, generateQRBlob } from '../qr/qr-generator.js';
import { el, showToast } from '../ui/components.js';
import { downloadBlob } from '../utils/share.js';
import { navigateTo } from '../app.js';

export function mountQR(container) {
  const state = getState();
  const normieId = state.normieId;
  if (!normieId) { navigateTo(''); return; }

  const screen = el('div', { className: 'screen screen--center' });
  screen.style.cssText = 'padding:24px; gap:20px; overflow-y:auto;';

  const title = el('h2', { style: { textAlign: 'center' } }, 'QR CODE');
  const subtitle = el('p', {
    style: {
      fontFamily: 'var(--font-body)', fontSize: '12px',
      color: 'var(--color-text-muted)', textAlign: 'center',
      textTransform: 'uppercase', letterSpacing: '2px',
    }
  }, 'Scan to view in AR');

  // QR Canvas
  const qrCanvas = el('canvas', {
    className: 'normie-canvas',
    style: {
      maxWidth: '240px', width: '100%', aspectRatio: '1',
      border: '2px solid var(--color-border)',
    }
  });

  // Normie preview
  const previewCanvas = el('canvas', {
    className: 'normie-canvas',
    width: '120', height: '120',
    style: {
      width: '100px', height: '100px',
      border: '2px solid var(--color-border)',
      background: 'var(--color-surface)',
    }
  });

  const normieLabel = el('p', {
    style: {
      fontFamily: 'var(--font-pixel)', fontSize: '9px',
      color: 'var(--color-text)', textAlign: 'center',
    }
  }, `#${normieId}`);

  // Buttons
  const btnRow = el('div', {
    style: { display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }
  });

  const downloadBtn = el('button', {
    className: 'btn btn--primary',
    onClick: async () => {
      const blob = await generateQRBlob(getQRUrl(), 16);
      downloadBlob(blob, `normie-${normieId}-qr.png`);
      showToast('QR Downloaded!');
    }
  }, 'DOWNLOAD QR');

  const printBtn = el('button', {
    className: 'btn',
    onClick: () => window.print(),
  }, 'PRINT');

  const backBtn = el('button', {
    className: 'btn btn--ghost',
    onClick: () => navigateTo(`camera/${normieId}`),
  }, 'BACK');

  btnRow.append(downloadBtn, printBtn, backBtn);

  // Info
  const info = el('p', {
    style: {
      fontFamily: 'var(--font-body)', fontSize: '11px',
      color: 'var(--color-text-muted)', textAlign: 'center',
      maxWidth: '280px', lineHeight: '1.8',
    }
  }, 'Anyone who scans this QR will see your Normie in augmented reality. Print it, stick it anywhere!');

  screen.append(title, subtitle, qrCanvas, previewCanvas, normieLabel, btnRow, info);
  container.appendChild(screen);

  function getQRUrl() {
    const base = window.location.origin + window.location.pathname;
    return `${base}?id=${normieId}`;
  }

  async function init() {
    const url = getQRUrl();
    const matrix = generateQRMatrix(url);
    renderQRToCanvas(qrCanvas, matrix, { pixelSize: 8 });

    let { pixelData, metadata } = getState();
    if (!pixelData) {
      try {
        const data = await cachedFetch(`normie_${normieId}`, () => loadNormie(normieId));
        setState({ pixelData: data.pixels, traits: data.traits, metadata: data.metadata });
        pixelData = data.pixels;
        metadata = data.metadata;
      } catch (err) {
        showToast('Failed to load Normie');
      }
    }

    if (pixelData) {
      const ctx = previewCanvas.getContext('2d');
      renderNormieToCanvas(ctx, pixelData, 0, 0, 3);
    }
    if (metadata?.name) normieLabel.textContent = metadata.name;
  }

  init();
  return () => {};
}
