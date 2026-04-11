// Normie Mirror — Photo capture (composite camera + overlay)

import { applyFilter } from './filters.js';

/**
 * Capture a photo compositing the video frame with the Normie overlay.
 * @param {HTMLVideoElement} video
 * @param {HTMLCanvasElement} overlayCanvas
 * @param {string} filter - filter name
 * @returns {Promise<Blob>}
 */
export async function capturePhoto(video, overlayCanvas, filter = 'none') {
  const w = video.videoWidth || 1280;
  const h = video.videoHeight || 720;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Draw video frame
  ctx.drawImage(video, 0, 0, w, h);

  // Apply filter to video frame
  if (filter !== 'none') {
    applyFilter(ctx, w, h, filter);
  }

  // Draw overlay (scale from overlay canvas size to video size)
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(overlayCanvas, 0, 0, w, h);

  // Add watermark
  drawWatermark(ctx, w, h);

  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });
}

function drawWatermark(ctx, w, h) {
  ctx.save();
  ctx.font = '12px "Press Start 2P", monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.textAlign = 'right';
  ctx.fillText('normies.art', w - 12, h - 12);
  ctx.restore();
}
