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
