// Normie Mirror — AR overlay compositor

import { createNormieSprite } from '../render/pixel-renderer.js';
import { getState } from '../state.js';

export class AROverlay {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.spriteTransparent = null;
    this.spriteSolid = null;
    this.animationFn = null;
    this.animFrame = null;
    this.startTime = 0;
  }

  loadSprite(pixelData) {
    this.spriteTransparent = createNormieSprite(pixelData, { transparent: true });
    this.spriteSolid = createNormieSprite(pixelData, { transparent: false });
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
    const { ctx, canvas } = this;
    const state = getState();
    const isSolid = state.displayMode === 'solid';
    const sprite = isSolid ? this.spriteSolid : this.spriteTransparent;
    if (!sprite) return;

    const { overlayPosition, overlayScale, overlayRotation } = state;
    const elapsed = (performance.now() - this.startTime) / 1000;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const baseSize = Math.min(canvas.width, canvas.height) * 0.45;
    const size = baseSize * overlayScale;
    const x = overlayPosition.x * canvas.width;
    const y = overlayPosition.y * canvas.height;

    let mods = { x: 0, y: 0, rotation: 0, opacity: 1, scaleX: 1, scaleY: 1, glowColor: null };
    if (this.animationFn) {
      mods = this.animationFn(elapsed, mods);
    }

    const drawX = x + mods.x;
    const drawY = y + mods.y;
    const totalRotation = overlayRotation + (mods.rotation || 0);

    if (isSolid) {
      this._drawSolid(sprite, drawX, drawY, size, totalRotation, mods);
    } else {
      this._drawHologram(sprite, drawX, drawY, size, totalRotation, mods, elapsed);
    }
  }

  _drawSolid(sprite, x, y, size, rotation, mods) {
    const { ctx } = this;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(x, y);
    ctx.rotate(rotation * Math.PI / 180);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = size * 0.06;
    ctx.shadowOffsetX = size * 0.02;
    ctx.shadowOffsetY = size * 0.03;

    ctx.globalAlpha = mods.opacity;
    ctx.scale(mods.scaleX, mods.scaleY);
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  _drawHologram(sprite, x, y, size, rotation, mods, t) {
    const { ctx } = this;
    const half = size / 2;

    const glowColor = mods.glowColor || 'rgba(200, 220, 255, 0.25)';
    const glowPulse = 0.6 + Math.sin(t * 2.5) * 0.4;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation * Math.PI / 180);

    ctx.save();
    ctx.globalAlpha = glowPulse * 0.3;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = size * 0.15;
    ctx.fillStyle = glowColor;
    ctx.fillRect(-half * 0.9, -half * 0.9, size * 0.9, size * 0.9);
    ctx.restore();

    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = mods.opacity;
    ctx.scale(mods.scaleX, mods.scaleY);
    ctx.drawImage(sprite, -half, -half, size, size);

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
