// Normie Mirror — Video capture (MediaRecorder + fallback)

import { applyFilter } from './filters.js';

export class VideoCapture {
  constructor(video, overlayCanvas, filter = 'none') {
    this.video = video;
    this.overlayCanvas = overlayCanvas;
    this.filter = filter;
    this.recorder = null;
    this.chunks = [];
    this.compositeCanvas = null;
    this.animFrame = null;
    this.isRecording = false;
  }

  start() {
    const w = this.video.videoWidth || 1280;
    const h = this.video.videoHeight || 720;

    this.compositeCanvas = document.createElement('canvas');
    this.compositeCanvas.width = w;
    this.compositeCanvas.height = h;

    this.chunks = [];
    this.isRecording = true;

    // Composite loop
    this._compositeLoop();

    // Try MediaRecorder
    const stream = this.compositeCanvas.captureStream(30);
    const mimeTypes = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ];

    let mimeType = '';
    for (const mt of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mt)) {
        mimeType = mt;
        break;
      }
    }

    if (!mimeType) {
      console.warn('No supported video MIME type found');
      this.isRecording = false;
      return false;
    }

    this.recorder = new MediaRecorder(stream, { mimeType });
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start(100); // 100ms chunks
    return true;
  }

  stop() {
    this.isRecording = false;
    if (this.animFrame) cancelAnimationFrame(this.animFrame);

    return new Promise((resolve) => {
      if (!this.recorder || this.recorder.state === 'inactive') {
        resolve(null);
        return;
      }
      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.recorder.mimeType });
        resolve(blob);
      };
      this.recorder.stop();
    });
  }

  _compositeLoop() {
    if (!this.isRecording) return;
    this.animFrame = requestAnimationFrame(() => this._compositeLoop());

    const ctx = this.compositeCanvas.getContext('2d');
    const w = this.compositeCanvas.width;
    const h = this.compositeCanvas.height;

    // Draw video
    ctx.drawImage(this.video, 0, 0, w, h);

    // Apply filter
    if (this.filter !== 'none') {
      applyFilter(ctx, w, h, this.filter);
    }

    // Draw overlay
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.overlayCanvas, 0, 0, w, h);
  }

  static isSupported() {
    return typeof MediaRecorder !== 'undefined' &&
      typeof HTMLCanvasElement.prototype.captureStream === 'function';
  }
}
