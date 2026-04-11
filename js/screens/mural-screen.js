// Normie Mirror — Mural Mode Screen

import { getState, setState } from '../state.js';
import { loadNormie } from '../api/normies.js';
import { cachedFetch } from '../api/cache.js';
import { createNormieSprite } from '../render/pixel-renderer.js';
import { CameraManager } from '../camera/camera-manager.js';
import { calculatePerspectiveCSS } from '../camera/perspective.js';
import { capturePhoto } from '../capture/photo-capture.js';
import { el, icon, showToast, createShutterButton } from '../ui/components.js';
import { navigateTo } from '../app.js';

export function mountMural(container) {
  const state = getState();
  const normieId = state.normieId;
  if (!normieId) { navigateTo(''); return; }

  const camera = new CameraManager();
  const corners = [];
  let sprite = null;

  // DOM
  const screen = el('div', { className: 'screen' });
  const cameraContainer = el('div', { className: 'camera-container' });
  const video = el('video', {
    className: 'camera-video',
    playsinline: '',
    autoplay: '',
    muted: '',
  });

  // Overlay for corner markers
  const markerCanvas = el('canvas', {
    className: 'camera-overlay',
    style: { zIndex: '3' },
  });

  // Normie mural element
  const muralEl = el('div', {
    style: {
      position: 'absolute',
      zIndex: '2',
      imageRendering: 'pixelated',
      display: 'none',
      transformOrigin: 'center center',
      boxShadow: '0 0 20px rgba(0,0,0,0.3)',
    }
  });
  const muralCanvas = el('canvas', {
    width: '40',
    height: '40',
    style: { width: '100%', height: '100%', imageRendering: 'pixelated' }
  });
  muralEl.appendChild(muralCanvas);

  cameraContainer.append(video, muralEl, markerCanvas);

  // Instruction overlay
  const instruction = el('div', {
    style: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      fontFamily: 'var(--font-pixel)',
      fontSize: '10px',
      color: '#fff',
      textAlign: 'center',
      textShadow: '0 2px 8px rgba(0,0,0,0.8)',
      padding: '16px',
      zIndex: '5',
      lineHeight: '2',
    }
  }, 'TAP 4 CORNERS OF THE WALL');

  cameraContainer.appendChild(instruction);

  // Top bar
  const topBar = el('div', { className: 'toolbar toolbar--top' });
  const backBtn = el('button', {
    className: 'btn btn--icon btn--ghost',
    onClick: () => navigateTo(`camera/${normieId}`)
  });
  backBtn.appendChild(icon('back', 20));

  const label = el('span', {
    style: { fontFamily: 'var(--font-pixel)', fontSize: '10px', color: '#fff' }
  }, 'MURAL MODE');

  const resetBtn = el('button', {
    className: 'btn btn--ghost',
    style: { fontSize: '8px', padding: '8px 12px' },
    onClick: resetCorners
  }, 'RESET');

  topBar.append(backBtn, label, resetBtn);

  // Bottom bar
  const bottomBar = el('div', { className: 'toolbar' });
  const shutterBtn = createShutterButton(async () => {
    if (corners.length < 4) {
      showToast('Place 4 corners first');
      return;
    }
    showToast('Capturing...');
    try {
      // Composite: draw video, then draw mural overlay
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = w;
      captureCanvas.height = h;
      const ctx = captureCanvas.getContext('2d');
      ctx.drawImage(video, 0, 0, w, h);

      // Draw the Normie as mural at perspective position
      if (sprite) {
        ctx.imageSmoothingEnabled = false;
        const css = calculatePerspectiveCSS(corners, w, h);
        const mx = parseFloat(css.left);
        const my = parseFloat(css.top);
        const mw = parseFloat(css.width);
        const mh = parseFloat(css.height);
        ctx.drawImage(sprite, mx, my, mw, mh);
      }

      captureCanvas.toBlob((blob) => {
        setState({ capturedMedia: blob, capturedType: 'photo' });
        navigateTo('capture');
      }, 'image/png');
    } catch (err) {
      showToast('Capture failed');
    }
  });
  bottomBar.appendChild(shutterBtn);

  screen.append(cameraContainer, topBar, bottomBar);
  container.appendChild(screen);

  // Corner placement
  function drawMarkers() {
    const ctx = markerCanvas.getContext('2d');
    ctx.clearRect(0, 0, markerCanvas.width, markerCanvas.height);

    const w = markerCanvas.width;
    const h = markerCanvas.height;

    // Draw placed corners
    ctx.fillStyle = '#ff6b35';
    ctx.strokeStyle = '#ff6b35';
    ctx.lineWidth = 2;

    for (let i = 0; i < corners.length; i++) {
      const x = corners[i].x * w;
      const y = corners[i].y * h;

      // Corner marker
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();

      // Number label
      ctx.font = '10px "Press Start 2P"';
      ctx.fillText(String(i + 1), x + 10, y - 10);

      // Connect to next corner
      if (i > 0) {
        ctx.beginPath();
        ctx.moveTo(corners[i - 1].x * w, corners[i - 1].y * h);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }

    // Close the quad
    if (corners.length === 4) {
      ctx.beginPath();
      ctx.moveTo(corners[3].x * w, corners[3].y * h);
      ctx.lineTo(corners[0].x * w, corners[0].y * h);
      ctx.stroke();
    }
  }

  function updateMural() {
    if (corners.length < 4 || !sprite) {
      muralEl.style.display = 'none';
      return;
    }

    const css = calculatePerspectiveCSS(
      corners,
      cameraContainer.clientWidth,
      cameraContainer.clientHeight
    );

    muralEl.style.display = 'block';
    muralEl.style.transform = css.transform;
    muralEl.style.left = css.left;
    muralEl.style.top = css.top;
    muralEl.style.width = css.width;
    muralEl.style.height = css.height;

    instruction.style.display = 'none';
  }

  function resetCorners() {
    corners.length = 0;
    muralEl.style.display = 'none';
    instruction.style.display = 'block';
    instruction.textContent = 'TAP 4 CORNERS OF THE WALL';
    drawMarkers();
  }

  // Tap to place corners
  markerCanvas.addEventListener('pointerdown', (e) => {
    if (corners.length >= 4) return;

    const rect = markerCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    corners.push({ x, y });
    drawMarkers();

    if (corners.length < 4) {
      instruction.textContent = `TAP CORNER ${corners.length + 1} OF 4`;
    } else {
      updateMural();
    }
  });

  // Init
  async function init() {
    let { pixelData } = getState();
    if (!pixelData) {
      try {
        const data = await cachedFetch(`normie_${normieId}`, () => loadNormie(normieId));
        setState({ pixelData: data.pixels, traits: data.traits, metadata: data.metadata });
        pixelData = data.pixels;
      } catch (err) {
        showToast('Failed to load Normie');
        navigateTo('');
        return;
      }
    }

    // Create solid sprite (both ON and OFF pixels for mural look)
    sprite = createNormieSprite(pixelData, { transparent: false });
    const mCtx = muralCanvas.getContext('2d');
    mCtx.imageSmoothingEnabled = false;
    mCtx.drawImage(sprite, 0, 0);

    // Start camera
    const success = await camera.start(video, state.cameraFacing);
    if (!success) {
      showToast('Camera access denied');
      return;
    }

    await new Promise(resolve => {
      if (video.videoWidth > 0) resolve();
      else video.addEventListener('loadedmetadata', resolve, { once: true });
    });

    // Size marker canvas
    const resizeMarkers = () => {
      markerCanvas.width = cameraContainer.clientWidth * window.devicePixelRatio;
      markerCanvas.height = cameraContainer.clientHeight * window.devicePixelRatio;
      markerCanvas.style.width = cameraContainer.clientWidth + 'px';
      markerCanvas.style.height = cameraContainer.clientHeight + 'px';
      drawMarkers();
      if (corners.length === 4) updateMural();
    };
    resizeMarkers();
    window.addEventListener('resize', resizeMarkers);
  }

  init();

  return () => {
    camera.stop();
  };
}
