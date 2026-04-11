// Normie Mirror — Touch gesture controls (drag, pinch, rotate)

export class TouchControls {
  constructor(element, callbacks = {}) {
    this.element = element;
    this.callbacks = callbacks; // { onMove, onScale, onRotate }
    this.pointers = new Map();
    this.lastPinchDist = 0;
    this.lastPinchAngle = 0;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);

    element.addEventListener('pointerdown', this._onPointerDown);
    element.addEventListener('pointermove', this._onPointerMove);
    element.addEventListener('pointerup', this._onPointerUp);
    element.addEventListener('pointercancel', this._onPointerUp);
  }

  _onPointerDown(e) {
    e.preventDefault();
    this.element.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.pointers.size === 2) {
      const pts = [...this.pointers.values()];
      this.lastPinchDist = this._dist(pts[0], pts[1]);
      this.lastPinchAngle = this._angle(pts[0], pts[1]);
    }
  }

  _onPointerMove(e) {
    if (!this.pointers.has(e.pointerId)) return;
    e.preventDefault();

    const prev = this.pointers.get(e.pointerId);
    const curr = { x: e.clientX, y: e.clientY };
    this.pointers.set(e.pointerId, curr);

    if (this.pointers.size === 1) {
      // Single pointer: drag
      const dx = (curr.x - prev.x) / this.element.clientWidth;
      const dy = (curr.y - prev.y) / this.element.clientHeight;
      if (this.callbacks.onMove) this.callbacks.onMove(dx, dy);
    } else if (this.pointers.size === 2) {
      // Two pointers: pinch + rotate
      const pts = [...this.pointers.values()];
      const dist = this._dist(pts[0], pts[1]);
      const angle = this._angle(pts[0], pts[1]);

      if (this.lastPinchDist > 0) {
        const scaleDelta = dist / this.lastPinchDist;
        if (this.callbacks.onScale) this.callbacks.onScale(scaleDelta);
      }

      const angleDelta = angle - this.lastPinchAngle;
      if (Math.abs(angleDelta) < 45) { // Filter noise
        if (this.callbacks.onRotate) this.callbacks.onRotate(angleDelta);
      }

      this.lastPinchDist = dist;
      this.lastPinchAngle = angle;
    }
  }

  _onPointerUp(e) {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) {
      this.lastPinchDist = 0;
      this.lastPinchAngle = 0;
    }
  }

  _dist(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  _angle(a, b) {
    return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
  }

  destroy() {
    this.element.removeEventListener('pointerdown', this._onPointerDown);
    this.element.removeEventListener('pointermove', this._onPointerMove);
    this.element.removeEventListener('pointerup', this._onPointerUp);
    this.element.removeEventListener('pointercancel', this._onPointerUp);
  }
}
