// Normie Mirror — Camera AR Screen

import { getState, setState } from '../state.js';
import { loadNormie } from '../api/normies.js';
import { cachedFetch } from '../api/cache.js';
import { CameraManager } from '../camera/camera-manager.js';
import { AROverlay } from '../camera/overlay.js';
import { TouchControls } from '../camera/touch-controls.js';
import { createAnimationFn } from '../render/animation-engine.js';
import { capturePhoto } from '../capture/photo-capture.js';
import { VideoCapture } from '../capture/video-capture.js';
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
  let controlsTimer = null;
  let resizeHandler = null;
  let unmounted = false;

  // DOM
  const screen = el('div', { className: 'screen' });
  const cameraContainer = el('div', { className: 'camera-container' });
  const video = el('video', { className: 'camera-video', playsinline: '', autoplay: '', muted: '' });
  const overlayCanvas = el('canvas', { className: 'camera-overlay' });
  cameraContainer.append(video, overlayCanvas);

  // Top toolbar
  const topBar = el('div', { className: 'toolbar toolbar--top' });

  const backBtn = el('button', {
    className: 'btn btn--icon',
    onClick: () => navigateTo(''),
  });
  backBtn.appendChild(icon('back', 20));

  const normieLabel = el('span', {
    style: {
      fontFamily: 'var(--font-pixel)', fontSize: '9px', color: '#fff',
      background: 'rgba(0,0,0,0.4)', padding: '6px 10px',
      backdropFilter: 'blur(4px)',
    }
  }, `#${normieId}`);

  const flipBtn = el('button', {
    className: 'btn btn--icon',
    onClick: async () => {
      await camera.flip();
      setState({ cameraFacing: camera.facing });
    }
  });
  flipBtn.appendChild(icon('flip', 20));

  topBar.append(backBtn, normieLabel, flipBtn);

  // Mode toggle (Hologram vs Original)
  const modeBar = el('div', {
    className: 'filter-bar',
    style: { bottom: '150px' },
  });
  const modes = [
    { key: 'ar', label: 'HOLOGRAM' },
    { key: 'solid', label: 'ORIGINAL' },
  ];
  modes.forEach(m => {
    const chip = el('button', {
      className: `filter-chip${state.displayMode === m.key ? ' filter-chip--active' : ''}`,
      onClick: () => {
        setState({ displayMode: m.key });
        modeBar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('filter-chip--active'));
        chip.classList.add('filter-chip--active');
      }
    }, m.label);
    modeBar.appendChild(chip);
  });

  // Bottom toolbar
  const bottomBar = el('div', { className: 'toolbar' });

  const shutterBtn = createShutterButton(
    async () => {
      if (getState().isRecording) return;
      showToast('Capturing...');
      try {
        const blob = await capturePhoto(video, overlayCanvas);
        setState({ capturedMedia: blob, capturedType: 'photo' });
        navigateTo('capture');
      } catch {
        showToast('Capture failed');
      }
    },
    () => {
      if (!VideoCapture.isSupported()) {
        showToast('Video not supported on this device');
        return;
      }
      videoCapture = new VideoCapture(video, overlayCanvas);
      if (videoCapture.start()) {
        setState({ isRecording: true });
        shutterBtn.classList.add('shutter-btn--recording');
        showToast('Recording...');
      }
    }
  );

  shutterBtn.addEventListener('pointerup', async () => {
    if (getState().isRecording && videoCapture) {
      const blob = await videoCapture.stop();
      setState({ isRecording: false, capturedMedia: blob, capturedType: 'video' });
      shutterBtn.classList.remove('shutter-btn--recording');
      if (blob) navigateTo('capture');
    }
  });

  const shareBtn = el('button', {
    className: 'btn btn--icon',
    onClick: async () => {
      showToast('Capturing...');
      try {
        const blob = await capturePhoto(video, overlayCanvas);
        setState({ capturedMedia: blob, capturedType: 'photo' });
        navigateTo('capture');
      } catch {
        showToast('Failed');
      }
    }
  });
  shareBtn.appendChild(icon('share', 20));

  bottomBar.append(shutterBtn, shareBtn);

  // Assemble
  screen.append(cameraContainer, topBar, modeBar, bottomBar);
  container.appendChild(screen);

  // Auto-hide controls
  function setControlsVisible(show) {
    const opacity = show ? '1' : '0';
    topBar.style.opacity = opacity;
    bottomBar.style.opacity = opacity;
    modeBar.style.opacity = opacity;
  }

  function resetControlsTimer() {
    setControlsVisible(true);
    clearTimeout(controlsTimer);
    controlsTimer = setTimeout(() => {
      if (!getState().isRecording) setControlsVisible(false);
    }, 4000);
  }

  [topBar, bottomBar, modeBar].forEach(e => { e.style.transition = 'opacity 0.3s'; });
  screen.addEventListener('pointerdown', resetControlsTimer);
  resetControlsTimer();

  async function init() {
    let { pixelData, traits } = getState();
    if (!pixelData) {
      try {
        const data = await cachedFetch(`normie_${normieId}`, () => loadNormie(normieId));
        if (unmounted) return;
        setState({ pixelData: data.pixels, traits: data.traits, metadata: data.metadata });
        pixelData = data.pixels;
        traits = data.traits;
      } catch {
        if (unmounted) return;
        showToast('Failed to load Normie');
        navigateTo('');
        return;
      }
    }

    const success = await camera.start(video, state.cameraFacing);
    if (unmounted) { camera.stop(); return; }
    if (!success) {
      showToast('Camera access denied');
      return;
    }

    await new Promise(resolve => {
      if (video.videoWidth > 0) resolve();
      else video.addEventListener('loadedmetadata', resolve, { once: true });
    });
    if (unmounted) { camera.stop(); return; }

    resizeHandler = () => {
      const dpr = window.devicePixelRatio || 1;
      overlayCanvas.width = cameraContainer.clientWidth * dpr;
      overlayCanvas.height = cameraContainer.clientHeight * dpr;
      overlayCanvas.style.width = cameraContainer.clientWidth + 'px';
      overlayCanvas.style.height = cameraContainer.clientHeight + 'px';
      if (overlay) overlay.resize(overlayCanvas.width, overlayCanvas.height);
    };
    resizeHandler();
    window.addEventListener('resize', resizeHandler);

    overlay = new AROverlay(overlayCanvas);
    overlay.loadSprite(pixelData);
    overlay.setAnimationFn(createAnimationFn(traits));
    overlay.start();

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
        setState({ overlayScale: Math.max(0.15, Math.min(4, scale * delta)) });
      },
      onRotate: (degrees) => {
        const rot = getState().overlayRotation;
        setState({ overlayRotation: rot + degrees });
      }
    });
  }

  init();

  return () => {
    unmounted = true;
    camera.stop();
    if (overlay) overlay.stop();
    if (touch) touch.destroy();
    if (videoCapture && getState().isRecording) videoCapture.stop();
    if (resizeHandler) window.removeEventListener('resize', resizeHandler);
    clearTimeout(controlsTimer);
  };
}
