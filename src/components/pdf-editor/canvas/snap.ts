import type { CanvasElement } from '@/store/pdf-editor/types/elements';

export const SNAP_THRESHOLD = 6;

export function computeSnap(
  draggedId: string,
  rawX: number,
  rawY: number,
  allElements: CanvasElement[],
  page?: { width: number; height: number },
): { x: number; y: number; xs: number[]; ys: number[] } {
  const dragged = allElements.find(e => e.id === draggedId);
  if (!dragged) return { x: rawX, y: rawY, xs: [], ys: [] };

  const elW = dragged.width;
  const elH = dragged.height;
  const dragCx = rawX + elW / 2;
  const dragCy = rawY + elH / 2;

  const candidates = allElements
    .filter(e => e.id !== draggedId)
    .map(e => ({
      e,
      dist: Math.hypot(
        e.position.x + e.width / 2 - dragCx,
        e.position.y + e.height / 2 - dragCy,
      ),
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 10)
    .map(({ e }) => e);

  const dragXAnchors = [0, elW / 2, elW];
  const dragYAnchors = [0, elH / 2, elH];

  let snapX = rawX;
  let snapY = rawY;
  let bestXDist = SNAP_THRESHOLD + 1;
  let bestYDist = SNAP_THRESHOLD + 1;
  const guideXs = new Set<number>();
  const guideYs = new Set<number>();

  for (const cand of candidates) {
    const candXs = [cand.position.x, cand.position.x + cand.width / 2, cand.position.x + cand.width];
    const candYs = [cand.position.y, cand.position.y + cand.height / 2, cand.position.y + cand.height];

    for (const anchorOffX of dragXAnchors) {
      for (const cx of candXs) {
        const dist = Math.abs(rawX + anchorOffX - cx);
        if (dist <= SNAP_THRESHOLD) {
          guideXs.add(cx);
          if (dist < bestXDist) { bestXDist = dist; snapX = cx - anchorOffX; }
        }
      }
    }

    for (const anchorOffY of dragYAnchors) {
      for (const cy of candYs) {
        const dist = Math.abs(rawY + anchorOffY - cy);
        if (dist <= SNAP_THRESHOLD) {
          guideYs.add(cy);
          if (dist < bestYDist) { bestYDist = dist; snapY = cy - anchorOffY; }
        }
      }
    }
  }

  // Page center guides
  if (page) {
    const pageCx = page.width / 2;
    const pageCy = page.height / 2;

    for (const anchorOffX of dragXAnchors) {
      const dist = Math.abs(rawX + anchorOffX - pageCx);
      if (dist <= SNAP_THRESHOLD) {
        guideXs.add(pageCx);
        if (dist < bestXDist) { bestXDist = dist; snapX = pageCx - anchorOffX; }
      }
    }

    for (const anchorOffY of dragYAnchors) {
      const dist = Math.abs(rawY + anchorOffY - pageCy);
      if (dist <= SNAP_THRESHOLD) {
        guideYs.add(pageCy);
        if (dist < bestYDist) { bestYDist = dist; snapY = pageCy - anchorOffY; }
      }
    }
  }

  return {
    x: Math.round(snapX),
    y: Math.round(snapY),
    xs: [...guideXs],
    ys: [...guideYs],
  };
}
