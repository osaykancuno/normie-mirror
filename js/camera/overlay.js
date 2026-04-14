// Normie Mirror — AR overlay compositor (multi-normie support)

import { createNormieSprite } from '../render/pixel-renderer.js';
import { getState } from '../state.js';

export class AROverlay {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sprites = []; // Array of { spriteTransparent, spriteSolid, position, scale, rotation, animationFn, id }
    this.activeIndex = 0;
    this.animFrame = null;
    this.startTime = 0;
  }

  loadSprite(pixelData, id = 0) {
    const spriteTransparent = createNormieSprite(pixelData, { transparent: true });
    const spriteSolid = createNormieSprite(pixelData, { transparent: false });

    if (this.sprites.length === 0) {
      // First sprite uses state position
      this.sprites.push({
        spriteTransparent,
        spriteSolid,
        position: null, // null means use global state
        scale: 1.0,
        rotation: 0,
        animationFn: null,
        id,
      });
    } else {
      // Additional sprites get offset positions
      const offset = this.sprites.length * 0.15;
      this.sprites.push({
        spriteTransparent,
        spriteSolid,
        position: { x: 0.3 + offset, y: 0.5 },
        scale: 0.8,
        rotation: 0,
        animationFn: null,
        id,
      });
    }
    return this.sprites.length - 1;
  }

  removeSprite(index) {
    if (index > 0 && index < this.sprites.length) {
      this.sprites.splice(index, 1);
      if (this.activeIndex >= this.sprites.length) {
        this.activeIndex = 0;
      }
    }
  }

  setAnimationFn(fn, index = 0) {
    if (this.sprites[index]) {
      this.sprites[index].animationFn = fn;
    }
  }

  setActiveIndex(index) {
    this.activeIndex = Math.max(0, Math.min(index, this.sprites.length - 1));
  }

  getActiveSprite() {
    return this.sprites[this.activeIndex] || null;
  }

  getSpriteCount() {
    return this.sprites.length;
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
    const elapsed = (performance.now() - this.startTime) / 1000;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all sprites
    for (let i = 0; i < this.sprites.length; i++) {
      const s = this.sprites[i];
      const sprite = isSolid ? s.spriteSolid : s.spriteTransparent;
      if (!sprite) continue;

      // Position: first sprite uses global state, others use own position
      let pos, scale, rotation;
      if (i === 0) {
        pos = state.overlayPosition;
        scale = state.overlayScale;
        rotation = state.overlayRotation;
      } else {
        pos = s.position;
        scale = s.scale;
        rotation = s.rotation;
      }

      const baseSize = Math.min(canvas.width, canvas.height) * 0.45;
      const size = baseSize * scale;
      const x = pos.x * canvas.width;
      const y = pos.y * canvas.height;

      let mods = { x: 0, y: 0, rotation: 0, opacity: 1, scaleX: 1, scaleY: 1, glowColor: null };
      if (s.animationFn) {
        mods = s.animationFn(elapsed + i * 0.5, mods); // offset time for variety
      }

      const drawX = x + mods.x;
      const drawY = y + mods.y;

      if (isSolid) {
        this._drawSolid(sprite, drawX, drawY, size, rotation + (mods.rotation || 0), mods);
      } else {
        this._drawHologram(sprite, drawX, drawY, size, rotation + (mods.rotation || 0), mods, elapsed + i * 0.5);
      }
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

    // Glow behind sprite
    ctx.save();
    ctx.globalAlpha = glowPulse * 0.3;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = size * 0.15;
    ctx.fillStyle = glowColor;
    ctx.fillRect(-half * 0.9, -half * 0.9, size * 0.9, size * 0.9);
    ctx.restore();

    // Main sprite
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = mods.opacity;
    ctx.scale(mods.scaleX, mods.scaleY);
    ctx.drawImage(sprite, -half, -half, size, size);

    ctx.restore();
  }

  // Move a specific sprite (for multi-normie touch)
  moveSprite(index, dx, dy) {
    const s = this.sprites[index];
    if (!s || index === 0) return; // index 0 uses global state
    s.position.x = Math.max(0, Math.min(1, s.position.x + dx));
    s.position.y = Math.max(0, Math.min(1, s.position.y + dy));
  }

  scaleSprite(index, delta) {
    const s = this.sprites[index];
    if (!s || index === 0) return;
    s.scale = Math.max(0.15, Math.min(4, s.scale * delta));
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
