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
    camera: `<circle cx="12" cy="12" r="3.2"/><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9z"/>`,
    download: `<path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>`,
    share: `<path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>`,
    qr: `<path d="M3 11h2v2H3zm0-4h2v2H3zm4 4h2v2H7zm0-4h2v2H7zm-4-4h6v6H3zm1 1v4h4V4zM13 3h6v6h-6zm1 1v4h4V4zm-1 6h2v2h-2zm4 0h2v2h-2zm-4 4h2v2h-2zm4 0h2v2h-2zm-8 0h2v2H9zm0-4h2v2H9zm-6 4h6v6H3zm1 1v4h4v-4z"/>`,
    mural: `<path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM5 15l3.5-4.5 2.5 3.01L14.5 9l4.5 6H5z"/>`,
    close: `<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>`,
  };

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', 'currentColor');
  svg.innerHTML = icons[name] || '';
  return svg;
}
