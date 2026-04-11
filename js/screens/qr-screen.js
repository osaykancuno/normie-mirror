// Normie Mirror — QR Code Screen

import { getState, setState } from '../state.js';
import { loadNormie } from '../api/normies.js';
import { cachedFetch } from '../api/cache.js';
import { renderNormieToCanvas } from '../render/pixel-renderer.js';
import { generateQRMatrix, renderQRToCanvas, generateQRBlob } from '../qr/qr-generator.js';
import { el, createButton, showToast } from '../ui/components.js';
import { downloadBlob } from '../utils/share.js';
import { navigateTo } from '../app.js';

export function mountQR(container) {
  const state = getState();
  const normieId = state.normieId;
  if (!normieId) { navigateTo(''); return; }

  const screen = el('div', { className: 'screen screen--center' });
  screen.style.padding = '24px';
  screen.style.gap = '20px';
  screen.style.overflowY = 'auto';

  const title = el('h2', { style: { textAlign: 'center' } }, 'QR CODE');
  const subtitle = el('p', {
    style: {
      fontFamily: 'var(--font-pixel)',
      fontSize: '8px',
      color: 'var(--color-text-muted)',
      textAlign: 'center',
    }
  }, 'SCAN TO VIEW THIS NORMIE IN AR');

  // QR Canvas
  const qrCanvas = el('canvas', {
    className: 'normie-canvas',
    style: {
      maxWidth: '260px',
      width: '100%',
      height: 'auto',
      border: '3px solid var(--color-dark)',
    }
  });

  // Normie preview
  const previewCanvas = el('canvas', {
    className: 'normie-canvas',
    width: '120',
    height: '120',
    style: {
      width: '120px',
      height: '120px',
      border: '3px solid var(--color-dark)',
      background: 'var(--color-surface)',
    }
  });

  const normieLabel = el('p', {
    style: {
      fontFamily: 'var(--font-pixel)',
      fontSize: '10px',
      color: 'var(--color-text)',
      textAlign: 'center',
    }
  }, `NORMIE #${normieId}`);

  const urlLabel = el('p', {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: '10px',
      color: 'var(--color-text-muted)',
      textAlign: 'center',
      wordBreak: 'break-all',
    }
  });

  // Buttons
  const btnRow = el('div', {
    style: { display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }
  });

  const downloadBtn = createButton('Download QR', async () => {
    const blob = await generateQRBlob(getQRUrl(), 16);
    downloadBlob(blob, `normie-${normieId}-qr.png`);
    showToast('QR Downloaded!');
  }, 'primary');

  const printBtn = createButton('Print', () => {
    window.print();
  }, 'ghost');

  const backBtn = createButton('Back', () => {
    navigateTo(`camera/${normieId}`);
  }, 'ghost');

  const homeBtn = createButton('Home', () => navigateTo(''), 'ghost');

  btnRow.append(downloadBtn, printBtn, backBtn, homeBtn);

  // Info box
  const infoBox = el('div', {
    style: {
      padding: '12px',
      border: '2px solid var(--color-dark)',
      background: 'var(--color-surface)',
      maxWidth: '300px',
    }
  });
  const infoText = el('p', {
    style: {
      fontFamily: 'var(--font-pixel)',
      fontSize: '7px',
      color: 'var(--color-text-muted)',
      lineHeight: '2',
      textAlign: 'center',
    }
  }, 'ANYONE WHO SCANS THIS QR CODE WILL SEE YOUR NORMIE IN AUGMENTED REALITY. PRINT IT, STICK IT ANYWHERE!');
  infoBox.appendChild(infoText);

  screen.append(title, subtitle, qrCanvas, previewCanvas, normieLabel, urlLabel, btnRow, infoBox);
  container.appendChild(screen);

  function getQRUrl() {
    // Use current origin, or fallback
    const base = window.location.origin + window.location.pathname;
    return `${base}?id=${normieId}`;
  }

  // Init
  async function init() {
    // Generate QR
    const url = getQRUrl();
    urlLabel.textContent = url;
    const matrix = generateQRMatrix(url);
    renderQRToCanvas(qrCanvas, matrix, { pixelSize: 8 });
    // Fix canvas display aspect ratio
    qrCanvas.style.aspectRatio = '1';

    // Load Normie preview
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

    if (metadata?.name) {
      normieLabel.textContent = metadata.name;
    }
  }

  init();

  return () => {};
}
