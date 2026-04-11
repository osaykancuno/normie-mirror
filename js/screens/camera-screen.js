// Normie Mirror — Camera AR Screen

import { getState, setState, subscribe } from '../state.js';
import { loadNormie } from '../api/normies.js';
import { cachedFetch } from '../api/cache.js';
import { CameraManager } from '../camera/camera-manager.js';
import { AROverlay } from '../camera/overlay.js';
import { TouchControls } from '../camera/touch-controls.js';
import { createAnimationFn } from '../render/animation-engine.js';
import { capturePhoto } from '../capture/photo-capture.js';
import { VideoCapture } from '../capture/video-capture.js';
import { getFilterNames } from '../capture/filters.js';
import { el, icon, showToast, createShutterButton } from '../ui/components.js';
import { navigateTo } from '../app.js';

export function mountCamera(container) {
  const state = getState();
  const normieId = state.normieId;
  if (!normieId) { navigateTo(''); return; }

  const camera = new CameraManager();
  let overlay = null;
  let touch = null;
  let videoCapture = null;
  let controlsHideTimer = null;

  // DOM structure
  const screen = el('div', { className: 'screen' });

  const cameraContainer = el('div', { className: 'camera-container' });
  const video = el('video', {
    className: 'camera-video',
    playsinline: '',
    autoplay: '',
    muted: '',
  });
  const overlayCanvas = el('canvas', { className: 'camera-overlay' });

  cameraContainer.append(video, overlayCanvas);

  // Top toolbar
  const topBar = el('div', { className: 'toolbar toolbar--top' });
  const backBtn = el('button', {
    className: 'btn btn--icon btn--ghost',
    onClick: () => navigateTo('')
  });
  backBtn.appendChild(icon('back', 20));

  const normieLabel = el('span', {
    style: { fontFamily: 'var(--font-pixel)', fontSize: '10px', color: '#fff' }
  }, `#${normieId}`);

  const flipBtn = el('button', {
    className: 'btn btn--icon btn--ghost',
    onClick: async () => {
      await camera.flip();
      setState({ cameraFacing: camera.facing });
    }
  });
  flipBtn.appendChild(icon('flip', 20));

  topBar.append(backBtn, normieLabel, flipBtn);

  // Bottom toolbar
  const bottomBar = el('div', { className: 'toolbar' });

  // Filter bar
  const filterBar = el('div', { className: 'filter-bar' });
  const filters = getFilterNames();
  filters.forEach(name => {
    const chip = el('button', {
      className: `filter-chip${name === state.activeFilter ? ' filter-chip--active' : ''}`,
      onClick: () => {
        setState({ activeFilter: name });
        filterBar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('filter-chip--active'));
        chip.classList.add('filter-chip--active');
      }
    }, name.toUpperCase());
    filterBar.appendChild(chip);
  });

  // Mural mode button
  const muralBtn = el('button', {
    className: 'btn btn--icon btn--ghost',
    onClick: () => navigateTo(`mural/${normieId}`),
    title: 'Mural Mode'
  });
  muralBtn.appendChild(icon('mural', 20));

  // QR button
  const qrBtn = el('button', {
    className: 'btn btn--icon btn--ghost',
    onClick: () => navigateTo(`qr/${normieId}`),
    title: 'QR Code'
  });
  qrBtn.appendChild(icon('qr', 20));

  // Shutter
  const shutterBtn = createShutterButton(
    // Tap: photo
    async () => {
      if (state.isRecording) return;
      showToast('Capturing...');
      try {
        const blob = await capturePhoto(video, overlayCanvas, getState().activeFilter);
        setState({ capturedMedia: blob, capturedType: 'photo' });
        navigateTo('capture');
      } catch (err) {
        showToast('Capture failed');
      }
    },
    // Long press: video
    () => {
      if (!VideoCapture.isSupported()) {
        showToast('Video not supported');
        return;
      }
      videoCapture = new VideoCapture(video, overlayCanvas, getState().activeFilter);
      if (videoCapture.start()) {
        setState({ isRecording: true });
        shutterBtn.classList.add('shutter-btn--recording');
        showToast('Recording...');
      }
    }
  );

  // Stop recording on tap when recording
  shutterBtn.addEventListener('pointerup', async () => {
    if (getState().isRecording && videoCapture) {
      const blob = await videoCapture.stop();
      setState({ isRecording: false, capturedMedia: blob, capturedType: 'video' });
      shutterBtn.classList.remove('shutter-btn--recording');
      if (blob) navigateTo('capture');
    }
  });

  bottomBar.append(muralBtn, shutterBtn, qrBtn);

  // Assemble
  screen.append(cameraContainer, topBar, filterBar, bottomBar);
  container.appendChild(screen);

  // Auto-hide controls
  function showControls() {
    topBar.style.opacity = '1';
    bottomBar.style.opacity = '1';
    filterBar.style.opacity = '1';
    clearTimeout(controlsHideTimer);
    controlsHideTimer = setTimeout(() => {
      if (!getState().isRecording) {
        topBar.style.opacity = '0';
        bottomBar.style.opacity = '0';
        filterBar.style.opacity = '0';
      }
    }, 3000);
  }

  [topBar, bottomBar, filterBar].forEach(el => {
    el.style.transition = 'opacity 0.3s';
  });
  screen.addEventListener('pointerdown', showControls);
  showControls();

  // Initialize
  async function init() {
    // Load normie data if not in state
    let { pixelData, traits } = getState();
    if (!pixelData) {
      try {
        const data = await cachedFetch(`normie_${normieId}`, () => loadNormie(normieId));
        setState({ pixelData: data.pixels, traits: data.traits, metadata: data.metadata });
        pixelData = data.pixels;
        traits = data.traits;
      } catch (err) {
        showToast('Failed to load Normie');
        navigateTo('');
        return;
      }
    }

    // Start camera
    const success = await camera.start(video, state.cameraFacing);
    if (!success) {
      showToast('Camera access denied');
      return;
    }

    // Wait for video to be ready
    await new Promise(resolve => {
      if (video.videoWidth > 0) resolve();
      else video.addEventListener('loadedmetadata', resolve, { once: true });
    });

    // Size overlay to match video display
    const resizeOverlay = () => {
      overlayCanvas.width = cameraContainer.clientWidth * window.devicePixelRatio;
      overlayCanvas.height = cameraContainer.clientHeight * window.devicePixelRatio;
      overlayCanvas.style.width = cameraContainer.clientWidth + 'px';
      overlayCanvas.style.height = cameraContainer.clientHeight + 'px';
      if (overlay) overlay.resize(overlayCanvas.width, overlayCanvas.height);
    };
    resizeOverlay();
    window.addEventListener('resize', resizeOverlay);

    // Init AR overlay
    overlay = new AROverlay(overlayCanvas);
    overlay.loadSprite(pixelData);
    overlay.setAnimationFn(createAnimationFn(traits));
    overlay.start();

    // Init touch controls
    touch = new TouchControls(overlayCanvas, {
      onMove: (dx, dy) => {
        const pos = getState().overlayPosition;
        setState({
          overlayPosition: {
            x: Math.max(0, Math.min(1, pos.x + dx)),
            y: Math.max(0, Math.min(1, pos.y + dy)),
          }
        });
      },
      onScale: (delta) => {
        const scale = getState().overlayScale;
        setState({ overlayScale: Math.max(0.2, Math.min(3, scale * delta)) });
      },
      onRotate: (degrees) => {
        const rot = getState().overlayRotation;
        setState({ overlayRotation: rot + degrees });
      }
    });
  }

  init();

  // Unmount
  return () => {
    camera.stop();
    if (overlay) overlay.stop();
    if (touch) touch.destroy();
    if (videoCapture && getState().isRecording) videoCapture.stop();
    clearTimeout(controlsHideTimer);
  };
}
