// Normie Mirror — Web Share API wrapper

export function canShare() {
  return !!navigator.share;
}

export function canShareFiles() {
  return !!navigator.canShare;
}

export async function shareImage(blob, title = 'My Normie') {
  const file = new File([blob], 'normie-mirror.png', { type: 'image/png' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    return navigator.share({
      title,
      text: 'Check out my Normie in AR! #NormieMirror',
      files: [file],
    });
  }

  // Fallback: share URL only
  if (navigator.share) {
    return navigator.share({
      title,
      text: 'Check out my Normie in AR! #NormieMirror',
    });
  }

  // Last fallback: download
  downloadBlob(blob, 'normie-mirror.png');
}

export async function shareVideo(blob, title = 'My Normie') {
  const file = new File([blob], 'normie-mirror.webm', { type: 'video/webm' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    return navigator.share({
      title,
      text: 'Check out my Normie in AR! #NormieMirror',
      files: [file],
    });
  }

  downloadBlob(blob, 'normie-mirror.webm');
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Open an X (Twitter) intent to share a Normie.
 * Mobile-safe: no width/height hints (ignored on mobile, can confuse Safari),
 * falls back to same-tab navigation if the popup is blocked.
 * Returns true on success, false if normieId is missing.
 */
export function shareToX(normieId) {
  if (normieId == null) return false;
  const id = Number(normieId);
  if (!Number.isInteger(id) || id <= 0) return false;

  const appUrl = `${window.location.origin}${window.location.pathname}?id=${id}`;
  const text = `Just a Normie IRL \u{1F4F7}\n\nCheck out Normie #${id} in AR:\n${appUrl}\n\n#NormieMirror #Normies #CC0`;
  const intentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;

  const win = window.open(intentUrl, '_blank', 'noopener,noreferrer');
  // Popup blocked (common on mobile Safari when not from a direct gesture):
  // fall back to same-tab navigation so the user still gets there.
  if (!win) {
    window.location.href = intentUrl;
  }
  return true;
}
