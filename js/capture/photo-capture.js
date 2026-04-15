// NormieSticker — Photo capture (composite camera + overlay)

/**
 * Capture a photo compositing the video frame with the Normie overlay.
 * @param {HTMLVideoElement} video
 * @param {HTMLCanvasElement} overlayCanvas
 * @returns {Promise<Blob>}
 */
export async function capturePhoto(video, overlayCanvas) {
  const w = video.videoWidth || 1280;
  const h = video.videoHeight || 720;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(video, 0, 0, w, h);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(overlayCanvas, 0, 0, w, h);

  drawWatermark(ctx, w, h);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('toBlob failed'));
    }, 'image/png');
  });
}

function drawWatermark(ctx, w, h) {
  const fontSize = Math.max(12, Math.round(w * 0.015));
  ctx.save();

  ctx.font = `${fontSize}px "Press Start 2P", monospace`;
  const text = 'NORMIESTICKER';
  const metrics = ctx.measureText(text);
  const px = fontSize * 0.6;
  const py = fontSize * 0.4;
  const bx = w - metrics.width - px * 2 - 8;
  const by = h - fontSize - py * 2 - 8;

  ctx.fillStyle = 'rgba(72, 73, 75, 0.6)';
  ctx.fillRect(bx, by, metrics.width + px * 2, fontSize + py * 2);

  ctx.fillStyle = 'rgba(227, 229, 228, 0.9)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(text, bx + px, by + py);

  ctx.restore();
}
