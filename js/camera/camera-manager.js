// Normie Mirror — Camera stream manager

export class CameraManager {
  constructor() {
    this.stream = null;
    this.videoElement = null;
    this.facing = 'environment';
  }

  async start(videoElement, facing = 'environment') {
    this.videoElement = videoElement;
    this.facing = facing;

    // Stop any existing stream
    this.stop();

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      videoElement.srcObject = this.stream;
      videoElement.setAttribute('playsinline', '');
      videoElement.setAttribute('autoplay', '');
      videoElement.muted = true;

      await videoElement.play();
      return true;
    } catch (err) {
      console.error('Camera access denied:', err);
      return false;
    }
  }

  async flip() {
    this.facing = this.facing === 'environment' ? 'user' : 'environment';
    if (this.videoElement) {
      return this.start(this.videoElement, this.facing);
    }
    return false;
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  getVideoSize() {
    if (!this.videoElement) return { width: 0, height: 0 };
    return {
      width: this.videoElement.videoWidth,
      height: this.videoElement.videoHeight,
    };
  }

  isActive() {
    return this.stream && this.stream.active;
  }
}
