// Normie Mirror — Capture review screen

import { getState, setState } from '../state.js';
import { el, showToast } from '../ui/components.js';
import { shareImage, shareVideo, downloadBlob, canShare, shareToX } from '../utils/share.js';
import { navigateTo } from '../app.js';

export function mountCapture(container) {
  const { capturedMedia, capturedType, normieId } = getState();
  if (!capturedMedia) { navigateTo(`camera/${normieId || ''}`); return; }

  const screen = el('div', { className: 'screen screen--center' });
  screen.style.cssText = 'background:var(--color-bg); padding:24px; gap:20px;';

  const title = el('h2', { style: { textAlign: 'center' } },
    capturedType === 'video' ? 'VIDEO CAPTURED' : 'PHOTO CAPTURED'
  );

  // Preview
  const previewContainer = el('div', {
    style: {
      width: '100%', maxWidth: '400px', aspectRatio: '16/9',
      border: '2px solid var(--color-border)', overflow: 'hidden', background: '#000',
    }
  });

  const blobUrl = URL.createObjectURL(capturedMedia);

  if (capturedType === 'video') {
    const videoEl = el('video', {
      style: { width: '100%', height: '100%', objectFit: 'contain' },
      controls: '', autoplay: '', loop: '', playsinline: '',
    });
    videoEl.src = blobUrl;
    previewContainer.appendChild(videoEl);
  } else {
    const img = el('img', {
      style: { width: '100%', height: '100%', objectFit: 'contain' },
      src: blobUrl,
    });
    previewContainer.appendChild(img);
  }

  // Buttons
  const btnContainer = el('div', {
    style: { display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }
  });

  if (canShare()) {
    const shareBtn = el('button', {
      className: 'btn btn--primary',
      onClick: async () => {
        try {
          if (capturedType === 'video') await shareVideo(capturedMedia);
          else await shareImage(capturedMedia);
        } catch (err) {
          if (err.name !== 'AbortError') showToast('Share failed');
        }
      }
    }, 'SHARE');
    btnContainer.appendChild(shareBtn);
  }

  const downloadBtn = el('button', {
    className: 'btn',
    onClick: () => {
      const ext = capturedType === 'video' ? 'webm' : 'png';
      downloadBlob(capturedMedia, `normie-mirror.${ext}`);
      showToast('Downloaded!');
    }
  }, 'DOWNLOAD');

  const retakeBtn = el('button', {
    className: 'btn btn--ghost',
    onClick: () => {
      setState({ capturedMedia: null, capturedType: null });
      navigateTo(`camera/${normieId || ''}`);
    }
  }, 'RETAKE');

  // Share to X
  const tweetBtn = el('button', {
    className: 'btn',
    onClick: () => {
      if (!shareToX(normieId)) showToast('Normie ID missing');
    }
  }, 'POST ON X');

  btnContainer.append(downloadBtn, tweetBtn, retakeBtn);

  screen.append(title, previewContainer, btnContainer);
  container.appendChild(screen);

  return () => {
    URL.revokeObjectURL(blobUrl);
  };
}
