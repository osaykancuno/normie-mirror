// Normie Mirror — Capture review screen

import { getState, setState } from '../state.js';
import { el, createButton, showToast } from '../ui/components.js';
import { shareImage, shareVideo, downloadBlob, canShare } from '../utils/share.js';
import { navigateTo } from '../app.js';

export function mountCapture(container) {
  const { capturedMedia, capturedType, normieId } = getState();
  if (!capturedMedia) { navigateTo(`camera/${normieId || ''}`); return; }

  const screen = el('div', { className: 'screen screen--center' });
  screen.style.background = 'var(--color-bg)';
  screen.style.padding = '16px';
  screen.style.gap = '16px';

  const title = el('h2', { style: { textAlign: 'center' } },
    capturedType === 'video' ? 'VIDEO CAPTURED' : 'PHOTO CAPTURED'
  );

  // Preview
  const previewContainer = el('div', {
    style: {
      width: '100%',
      maxWidth: '400px',
      aspectRatio: '16/9',
      border: '3px solid var(--color-dark)',
      overflow: 'hidden',
      background: '#000',
    }
  });

  if (capturedType === 'video') {
    const url = URL.createObjectURL(capturedMedia);
    const videoEl = el('video', {
      style: { width: '100%', height: '100%', objectFit: 'contain' },
      controls: '',
      autoplay: '',
      loop: '',
      playsinline: '',
    });
    videoEl.src = url;
    previewContainer.appendChild(videoEl);
  } else {
    const url = URL.createObjectURL(capturedMedia);
    const img = el('img', {
      style: { width: '100%', height: '100%', objectFit: 'contain' },
      src: url,
    });
    previewContainer.appendChild(img);
  }

  // Buttons
  const btnContainer = el('div', {
    style: { display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }
  });

  if (canShare()) {
    const shareBtn = createButton('Share', async () => {
      try {
        if (capturedType === 'video') await shareVideo(capturedMedia);
        else await shareImage(capturedMedia);
      } catch (err) {
        if (err.name !== 'AbortError') showToast('Share failed');
      }
    }, 'primary');
    btnContainer.appendChild(shareBtn);
  }

  const downloadBtn = createButton('Download', () => {
    const ext = capturedType === 'video' ? 'webm' : 'png';
    downloadBlob(capturedMedia, `normie-mirror.${ext}`);
    showToast('Downloaded!');
  }, 'ghost');

  const retakeBtn = createButton('Retake', () => {
    setState({ capturedMedia: null, capturedType: null });
    navigateTo(`camera/${normieId || ''}`);
  }, 'ghost');

  const homeBtn = createButton('Home', () => {
    setState({ capturedMedia: null, capturedType: null });
    navigateTo('');
  }, 'ghost');

  btnContainer.append(downloadBtn, retakeBtn, homeBtn);

  screen.append(title, previewContainer, btnContainer);
  container.appendChild(screen);

  return () => {
    // Clean up object URLs
    previewContainer.querySelectorAll('img, video').forEach(el => {
      if (el.src.startsWith('blob:')) URL.revokeObjectURL(el.src);
    });
  };
}
