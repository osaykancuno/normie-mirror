// Normie Mirror — Reusable UI components

/**
 * Create an element with attributes and children.
 */
export function el(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') element.className = value;
    else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    }
    else if (key.startsWith('on')) {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    }
    else element.setAttribute(key, value);
  }
  for (const child of children) {
    if (typeof child === 'string') element.appendChild(document.createTextNode(child));
    else if (child) element.appendChild(child);
  }
  return element;
}

/**
 * Show a toast message.
 */
let toastTimer = null;
export function showToast(message, duration = 2000) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = el('div', { className: 'toast' });
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('toast--visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('toast--visible'), duration);
}

/**
 * Create a pixel-art styled button.
 */
export function createButton(text, onClick, variant = '') {
  const cls = variant ? `btn btn--${variant}` : 'btn';
  return el('button', { className: cls, onClick }, text);
}

/**
 * Create the shutter button for camera modes.
 */
export function createShutterButton(onTap, onLongPress) {
  const btn = el('button', { className: 'shutter-btn' });
  let pressTimer = null;
  let longPressed = false;

  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    longPressed = false;
    pressTimer = setTimeout(() => {
      longPressed = true;
      if (onLongPress) onLongPress();
    }, 500);
  });

  btn.addEventListener('pointerup', (e) => {
    e.preventDefault();
    clearTimeout(pressTimer);
    if (!longPressed && onTap) onTap();
  });

  btn.addEventListener('pointerleave', () => clearTimeout(pressTimer));

  return btn;
}

/**
 * Simple SVG icon helper.
 */
export function icon(name, size = 24) {
  const icons = {
    back: `<path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>`,
    flip: `<path d="M9 12c0 1.66 1.34 3 3 3s3-1.34 3-3-1.34-3-3-3-3 1.34-3 3zm13-2V7c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-3l-4 4V8l4 4z"/>`,
    share: `<path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>`,
  };

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', 'currentColor');
  svg.innerHTML = icons[name] || '';
  return svg;
}
