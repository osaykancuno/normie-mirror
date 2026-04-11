// Normie Mirror — AR overlay compositor

import { createNormieSprite, drawNormie } from '../render/pixel-renderer.js';
import { getState } from '../state.js';

export class AROverlay {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sprite = null;
    this.animFrame = null;
    this.animationFn = null; // Set by animation engine
    this.time = 0;
  }

  loadSprite(pixelData, transparent = true) {
    this.sprite = createNormieSprite(pixelData, { transparent });
  }

  setAnimationFn(fn) {
    this.animationFn = fn;
  }

  start() {
    this.time = performance.now();
    this._loop();
  }

  stop() {
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  _loop() {
    this.animFrame = requestAnimationFrame(() => this._loop());
    this._draw();
  }

  _draw() {
    const { ctx, canvas, sprite } = this;
    if (!sprite) return;

    const state = getState();
    const { overlayPosition, overlayScale, overlayRotation } = state;
    const now = performance.now();
    const dt = (now - this.time) / 1000;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Base size: 40% of shorter dimension
    const baseSize = Math.min(canvas.width, canvas.height) * 0.4;
    const size = baseSize * overlayScale;

    const x = overlayPosition.x * canvas.width;
    const y = overlayPosition.y * canvas.height;

    // Get animation modifiers
    let animOffset = { x: 0, y: 0, rotation: 0, opacity: 1, scaleX: 1, scaleY: 1 };
    if (this.animationFn) {
      animOffset = this.animationFn(dt, animOffset);
    }

    // Draw with animation
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = animOffset.opacity;
    ctx.translate(x + animOffset.x, y + animOffset.y);
    ctx.rotate((overlayRotation + animOffset.rotation) * Math.PI / 180);
    ctx.scale(animOffset.scaleX, animOffset.scaleY);
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);

    // Hologram scanline effect
    this._drawScanlines(size);

    ctx.restore();
  }

  _drawScanlines(size) {
    const { ctx } = this;
    const t = (performance.now() / 3000) % 1;
    const lineY = -size / 2 + t * size;

    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-size / 2, lineY, size, size * 0.15);
    ctx.restore();

    // Subtle horizontal lines
    ctx.save();
    ctx.globalAlpha = 0.03;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let y = -size / 2; y < size / 2; y += 4) {
      ctx.beginPath();
      ctx.moveTo(-size / 2, y);
      ctx.lineTo(size / 2, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Capture the current overlay state to an offscreen canvas.
   */
  captureFrame() {
    const capture = document.createElement('canvas');
    capture.width = this.canvas.width;
    capture.height = this.canvas.height;
    const ctx = capture.getContext('2d');
    ctx.drawImage(this.canvas, 0, 0);
    return capture;
  }
}
