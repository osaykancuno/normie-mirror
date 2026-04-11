// Normie Mirror — Camera filters

const FILTERS = {
  none: null,
  office: applyOffice,
  subway: applySubway,
  rave: applyRave,
  vintage: applyVintage,
};

export function getFilterNames() {
  return Object.keys(FILTERS);
}

export function applyFilter(ctx, w, h, filterName) {
  const fn = FILTERS[filterName];
  if (fn) fn(ctx, w, h);
}

// Office: warm, slightly desaturated, soft vignette
function applyOffice(ctx, w, h) {
  // Warm overlay
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(255, 243, 224, 0.15)';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Soft vignette
  drawVignette(ctx, w, h, 0.3);
}

// Subway: cool blue, high contrast
function applySubway(ctx, w, h) {
  // Cool blue overlay
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = 'rgba(0, 40, 80, 0.12)';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Contrast boost
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  drawVignette(ctx, w, h, 0.4);
}

// Rave: saturated, RGB shift, scanlines
function applyRave(ctx, w, h) {
  const t = (performance.now() / 1000) % 6.28;

  // Color cycle overlay
  const r = Math.sin(t) * 30 + 128;
  const g = Math.sin(t + 2.09) * 30 + 128;
  const b = Math.sin(t + 4.18) * 30 + 128;

  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = `rgba(${r|0}, ${g|0}, ${b|0}, 0.15)`;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Scanlines
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#000';
  for (let y = 0; y < h; y += 3) {
    ctx.fillRect(0, y, w, 1);
  }
  ctx.restore();
}

// Vintage: sepia-ish, grain
function applyVintage(ctx, w, h) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(240, 220, 180, 0.2)';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Grain noise
  ctx.save();
  ctx.globalAlpha = 0.04;
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();

  drawVignette(ctx, w, h, 0.5);
}

function drawVignette(ctx, w, h, strength) {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.max(w, h) * 0.7;

  const gradient = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${strength})`);

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
