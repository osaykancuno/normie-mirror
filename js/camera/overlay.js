// Normie Mirror — AR overlay compositor (enhanced visibility)

import { createNormieSprite } from '../render/pixel-renderer.js';
import { getState } from '../state.js';

export class AROverlay {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sprite = null;
    this.animFrame = null;
    this.animationFn = null;
    this.startTime = 0;
  }

  loadSprite(pixelData) {
    this.sprite = createNormieSprite(pixelData, { transparent: true });
  }

  setAnimationFn(fn) {
    this.animationFn = fn;
  }

  start() {
    this.startTime = performance.now();
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
    const elapsed = (performance.now() - this.startTime) / 1000;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Base size: 45% of shorter dimension
    const baseSize = Math.min(canvas.width, canvas.height) * 0.45;
    const size = baseSize * overlayScale;
    const x = overlayPosition.x * canvas.width;
    const y = overlayPosition.y * canvas.height;

    // Get animation modifiers
    let mods = { x: 0, y: 0, rotation: 0, opacity: 1, scaleX: 1, scaleY: 1, glowColor: null };
    if (this.animationFn) {
      mods = this.animationFn(elapsed, mods);
    }

    // Draw glow behind sprite
    if (mods.glowColor) {
      this._drawGlow(x + mods.x, y + mods.y, size, mods.glowColor, elapsed);
    }

    // Draw hologram glow (always — white/cyan tint)
    this._drawHologramGlow(x + mods.x, y + mods.y, size, elapsed);

    // Draw the sprite
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = mods.opacity;
    ctx.translate(x + mods.x, y + mods.y);
    ctx.rotate((overlayRotation + (mods.rotation || 0)) * Math.PI / 180);
    ctx.scale(mods.scaleX, mods.scaleY);
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
    ctx.restore();

    // Hologram effects on top
    this._drawScanlines(x + mods.x, y + mods.y, size, elapsed);
    this._drawEdgeGlow(x + mods.x, y + mods.y, size, elapsed);
  }

  _drawHologramGlow(x, y, size, t) {
    const { ctx } = this;
    const pulse = 0.3 + Math.sin(t * 2) * 0.15;
    const r = size * 0.6;

    ctx.save();
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, `rgba(200, 230, 255, ${pulse})`);
    gradient.addColorStop(0.5, `rgba(150, 200, 255, ${pulse * 0.4})`);
    gradient.addColorStop(1, 'rgba(150, 200, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  _drawGlow(x, y, size, color, t) {
    const { ctx } = this;
    const pulse = 0.4 + Math.sin(t * 3) * 0.2;
    const r = size * 0.7;

    ctx.save();
    const gradient = ctx.createRadialGradient(x, y, size * 0.2, x, y, r);
    gradient.addColorStop(0, color.replace(/[\d.]+\)$/, `${pulse})`));
    gradient.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
    ctx.fillStyle = gradient;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  _drawScanlines(x, y, size, t) {
    const { ctx } = this;
    const half = size / 2;

    // Moving scanline bar
    const sweepY = ((t * 0.4) % 1) * size;
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#ffffff';
    const barHeight = size * 0.08;
    ctx.fillRect(x - half, y - half + sweepY, size, barHeight);
    ctx.restore();

    // Static horizontal lines
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    for (let ly = -half; ly < half; ly += 3) {
      ctx.beginPath();
      ctx.moveTo(x - half, y + ly);
      ctx.lineTo(x + half, y + ly);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawEdgeGlow(x, y, size, t) {
    const { ctx } = this;
    const half = size / 2;
    const pulse = 0.2 + Math.sin(t * 1.5) * 0.1;

    ctx.save();
    ctx.strokeStyle = `rgba(200, 230, 255, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(150, 200, 255, 0.6)';
    ctx.shadowBlur = 8;
    ctx.strokeRect(x - half - 2, y - half - 2, size + 4, size + 4);
    ctx.restore();
  }

  captureFrame() {
    const capture = document.createElement('canvas');
    capture.width = this.canvas.width;
    capture.height = this.canvas.height;
    const ctx = capture.getContext('2d');
    ctx.drawImage(this.canvas, 0, 0);
    return capture;
  }
}
