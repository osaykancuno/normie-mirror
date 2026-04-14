// Normie Mirror — Video capture (MediaRecorder + canvas composite)

export class VideoCapture {
  constructor(video, overlayCanvas) {
    this.video = video;
    this.overlayCanvas = overlayCanvas;
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

    this._compositeLoop();

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
    this.recorder.start(100);
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

    ctx.drawImage(this.video, 0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.overlayCanvas, 0, 0, w, h);
  }

  static isSupported() {
    return typeof MediaRecorder !== 'undefined' &&
      typeof HTMLCanvasElement.prototype.captureStream === 'function';
  }
}
