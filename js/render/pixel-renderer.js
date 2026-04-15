// NormieSticker — 40×40 pixel grid renderer

const GRID_SIZE = 40;
const COLOR_ON = '#48494b';
const COLOR_OFF = '#e3e5e4';

/**
 * Create an offscreen canvas with the Normie rendered at native 40×40.
 * @param {string} pixelString - 1600 char binary string
 * @param {object} options
 * @param {boolean} options.transparent - skip OFF pixels (for AR overlay)
 * @param {string} options.colorOn - override dark pixel color
 * @param {string} options.colorOff - override light pixel color
 * @returns {OffscreenCanvas|HTMLCanvasElement}
 */
export function createNormieSprite(pixelString, options = {}) {
  const { transparent = true, colorOn = COLOR_ON, colorOff = COLOR_OFF } = options;

  const canvas = document.createElement('canvas');
  canvas.width = GRID_SIZE;
  canvas.height = GRID_SIZE;
  const ctx = canvas.getContext('2d');

  ctx.imageSmoothingEnabled = false;

  if (!transparent) {
    ctx.fillStyle = colorOff;
    ctx.fillRect(0, 0, GRID_SIZE, GRID_SIZE);
  }

  ctx.fillStyle = colorOn;
  for (let i = 0; i < pixelString.length; i++) {
    if (pixelString[i] === '1') {
      const x = i % GRID_SIZE;
      const y = Math.floor(i / GRID_SIZE);
      ctx.fillRect(x, y, 1, 1);
    }
  }

  return canvas;
}

/**
 * Render a Normie sprite onto a target canvas at given position/size.
 * @param {CanvasRenderingContext2D} ctx - target context
 * @param {HTMLCanvasElement} sprite - from createNormieSprite
 * @param {number} x - center X
 * @param {number} y - center Y
 * @param {number} size - display size in pixels
 * @param {number} rotation - degrees
 * @param {number} opacity - 0-1
 */
export function drawNormie(ctx, sprite, x, y, size, rotation = 0, opacity = 1) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = opacity;
  ctx.translate(x, y);

  if (rotation !== 0) {
    ctx.rotate(rotation * Math.PI / 180);
  }

  ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
  ctx.restore();
}

/**
 * Render Normie directly from pixel string to a target canvas.
 * Useful for previews where no sprite caching is needed.
 */
export function renderNormieToCanvas(ctx, pixelString, x, y, pixelSize, options = {}) {
  const { transparent = false, colorOn = COLOR_ON, colorOff = COLOR_OFF } = options;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  if (!transparent) {
    ctx.fillStyle = colorOff;
    ctx.fillRect(x, y, GRID_SIZE * pixelSize, GRID_SIZE * pixelSize);
  }

  ctx.fillStyle = colorOn;
  for (let i = 0; i < pixelString.length; i++) {
    if (pixelString[i] === '1') {
      const col = i % GRID_SIZE;
      const row = Math.floor(i / GRID_SIZE);
      ctx.fillRect(x + col * pixelSize, y + row * pixelSize, pixelSize, pixelSize);
    }
  }

  ctx.restore();
}

/**
 * Get pixel count (number of ON pixels).
 */
export function getPixelCount(pixelString) {
  let count = 0;
  for (let i = 0; i < pixelString.length; i++) {
    if (pixelString[i] === '1') count++;
  }
  return count;
}

export { GRID_SIZE, COLOR_ON, COLOR_OFF };
