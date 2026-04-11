// Normie Mirror — Mural mode perspective transform

/**
 * Calculate CSS transform to map a rectangle onto a quadrilateral
 * defined by 4 corner points (for mural projection on walls).
 *
 * Uses a simplified approach: estimate rotateX, rotateY, and perspective
 * from the quadrilateral shape.
 */
export function calculatePerspectiveCSS(corners, containerWidth, containerHeight) {
  if (!corners || corners.length !== 4) return '';

  // corners: [topLeft, topRight, bottomRight, bottomLeft] as {x, y} normalized 0-1
  const [tl, tr, br, bl] = corners;

  // Center of the quad
  const cx = (tl.x + tr.x + br.x + bl.x) / 4;
  const cy = (tl.y + tr.y + br.y + bl.y) / 4;

  // Estimate rotation from edge lengths
  const topWidth = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const bottomWidth = Math.hypot(br.x - bl.x, br.y - bl.y);
  const leftHeight = Math.hypot(bl.x - tl.x, bl.y - tl.y);
  const rightHeight = Math.hypot(br.x - tr.x, br.y - tr.y);

  // Perspective vanishing point estimation
  const rotateY = Math.atan2(rightHeight - leftHeight, (rightHeight + leftHeight)) * 60;
  const rotateX = Math.atan2(bottomWidth - topWidth, (bottomWidth + topWidth)) * 60;

  // Scale based on quad area
  const avgWidth = (topWidth + bottomWidth) / 2;
  const avgHeight = (leftHeight + rightHeight) / 2;

  const posX = cx * containerWidth;
  const posY = cy * containerHeight;
  const sizeW = avgWidth * containerWidth;
  const sizeH = avgHeight * containerHeight;

  return {
    transform: `perspective(800px) rotateX(${-rotateX}deg) rotateY(${rotateY}deg)`,
    left: `${posX - sizeW / 2}px`,
    top: `${posY - sizeH / 2}px`,
    width: `${sizeW}px`,
    height: `${sizeH}px`,
  };
}

/**
 * Check if a tap is within the quadrilateral defined by corners.
 */
export function isInsideQuad(point, corners) {
  if (!corners || corners.length !== 4) return false;
  // Simple ray-casting for convex polygon
  let inside = true;
  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    const cross = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
    if (cross < 0) { inside = false; break; }
  }
  return inside;
}
