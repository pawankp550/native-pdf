/**
 * Extracts positioned text blocks, vector shapes, and tables from a PDF.
 *
 * Text strategy: pdfjs getTextContent() — pixel-perfect for digital PDFs.
 *
 * Graphics strategy:
 *  - getOperatorList() → parse stroke/fill ops → lines + rectangles
 *  - Grid detection on rectangles → TableElement data
 *
 * All coordinates in canvas pixels (96 dpi = SCALE 96/72).
 */

if (!('getOrInsertComputed' in Map.prototype)) {
  // @ts-expect-error polyfill
  Map.prototype.getOrInsertComputed = function <K, V>(key: K, fn: (k: K) => V): V {
    if (!this.has(key)) this.set(key, fn(key));
    return this.get(key) as V;
  };
}

import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href;

const SCALE = 96 / 72;

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------

export interface ExtractedBlock {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontWeight: 'normal' | 'semi-bold' | 'bold';
  pageIndex: number;
}

export interface ExtractedShape {
  kind: 'hline' | 'vline' | 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;        // 'transparent' when no fill
  pageIndex: number;
}

export interface ExtractedTable {
  x: number;
  y: number;
  width: number;
  height: number;
  colWidths: number[];
  rowHeights: number[];
  cells: string[][];        // [rowIndex][colIndex]
  borderColor: string;
  borderWidth: number;
  pageIndex: number;
}

export interface ExtractedIcon {
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string;   // base64 PNG crop of the icon from the rendered page
  pageIndex: number;
}

export interface PageExtraction {
  textBlocks: ExtractedBlock[];
  shapes: ExtractedShape[];
  tables: ExtractedTable[];
  icons: ExtractedIcon[];
}

export interface ExtractionProgress {
  page: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function extractFromPdf(
  dataUrl: string,
  onProgress?: (p: ExtractionProgress) => void,
): Promise<PageExtraction[]> {
  const base64 = dataUrl.split(',')[1];
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const result: PageExtraction[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: SCALE });

    // --- Text ---
    onProgress?.({ page: i, total: pdf.numPages });
    const textContent = await page.getTextContent();
    const { blocks: textBlocks, iconBboxes } = extractFromPdfjsItems(textContent.items, viewport, i - 1);

    // --- Icon pixel crops ---
    // Render the page BEFORE getOperatorList so both don't compete for the
    // internal rendering pipeline. Crop each icon bounding box into a PNG.
    const icons: ExtractedIcon[] = [];
    if (iconBboxes.length > 0) {
      try {
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = Math.round(viewport.width);
        pageCanvas.height = Math.round(viewport.height);
        await page.render({ canvas: pageCanvas, viewport }).promise;

        for (const bbox of iconBboxes) {
          const w = Math.ceil(bbox.width);
          const h = Math.ceil(bbox.height);
          if (w < 1 || h < 1) continue;
          const crop = document.createElement('canvas');
          crop.width = w;
          crop.height = h;
          crop.getContext('2d')!.drawImage(pageCanvas, Math.round(bbox.x), Math.round(bbox.y), w, h, 0, 0, w, h);
          icons.push({ x: bbox.x, y: bbox.y, width: w, height: h, dataUrl: crop.toDataURL('image/png'), pageIndex: i - 1 });
        }
      } catch (err) {
        console.warn(`Icon render failed for page ${i}:`, err);
      }
    }

    // --- Graphics ---
    const opList = await page.getOperatorList();
    const rawShapes = extractShapesFromOpList(opList.fnArray, opList.argsArray, viewport, i - 1);

    // --- Table detection ---
    const { tables, remainingShapes, remainingBlocks } = detectTables(rawShapes, textBlocks, i - 1);

    result.push({ textBlocks: remainingBlocks, shapes: remainingShapes, tables, icons });
    page.cleanup();
  }

  return result;
}

/** Legacy export kept for backward compat */
export async function extractTextFromPdf(
  dataUrl: string,
  onProgress?: (p: ExtractionProgress) => void,
): Promise<ExtractedBlock[][]> {
  const pages = await extractFromPdf(dataUrl, onProgress);
  return pages.map(p => p.textBlocks);
}

// ---------------------------------------------------------------------------
// Text extraction — pdf.js items → grouped lines
// ---------------------------------------------------------------------------

interface IconBbox { x: number; y: number; width: number; height: number; }

function extractFromPdfjsItems(
  items: any[],
  viewport: pdfjsLib.PageViewport,
  pageIndex: number,
): { blocks: ExtractedBlock[]; iconBboxes: IconBbox[] } {
  interface Raw {
    text: string; x: number; y: number;
    width: number; height: number;
    fontSize: number; fontWeight: 'normal' | 'semi-bold' | 'bold';
  }

  // Separate icon-font glyphs (Unicode Private Use Area) from regular text.
  // Icons are collected as bounding boxes so the caller can pixel-crop them.
  const PUA_RE = /^[\uE000-\uF8FF\uFFF0-\uFFFF]+$/;
  const iconBboxes: IconBbox[] = [];
  const raw: Raw[] = items
    .filter((it: any) => {
      if (!it.str?.trim()) return false;
      if (PUA_RE.test(it.str)) {
        // Collect icon bbox for later pixel-crop from rendered page
        const fontSizePt = Math.abs(it.transform[3]) || 10;
        const fontSizePx = fontSizePt * SCALE;
        const [vpx, vpy] = viewport.convertToViewportPoint(it.transform[4], it.transform[5]);
        const widthPx = it.width > 0 ? it.width * SCALE : fontSizePx;
        const w = Math.max(widthPx, fontSizePx * 0.5);
        const h = Math.ceil(fontSizePx * 1.25);
        if (w >= 4 && h >= 4) {
          iconBboxes.push({ x: Math.max(0, vpx), y: Math.max(0, vpy - fontSizePx), width: w, height: h });
        }
        return false;
      }
      return true;
    })
    .map((it: any) => {
      const fontSizePt = Math.abs(it.transform[3]) || 10;
      const fontSizePx = fontSizePt * SCALE;
      const [vpx, vpy] = viewport.convertToViewportPoint(it.transform[4], it.transform[5]);
      const fontName: string = (it.fontName ?? '').toLowerCase();
      // Check semi-bold first so "SemiBold"/"DemiBold"/"Medium" don't fall into isBold
      const isSemiBold = /semibold|demibold|demi|medium/.test(fontName);
      const isBold = !isSemiBold && /bold|black|heavy/.test(fontName);
      // it.width is in text-space units (same scale as fontSizePt).
      // Fall back to character-count estimate when width is missing or zero.
      const widthPx = it.width > 0
        ? it.width * SCALE
        : it.str.length * fontSizePx * 0.55;
      return {
        text: it.str,
        x: vpx,
        y: vpy - fontSizePx,
        width: Math.max(widthPx, 4),
        height: Math.ceil(fontSizePx * 1.25),
        fontSize: Math.round(fontSizePx),
        fontWeight: isBold ? 'bold' : isSemiBold ? 'semi-bold' : 'normal',
      } as Raw;
    });

  if (raw.length === 0) return { blocks: [], iconBboxes };

  // Group into lines by Y proximity.
  const lines: Raw[][] = [];
  for (const block of [...raw].sort((a, b) => a.y - b.y)) {
    const blockMid = block.y + block.height / 2;
    const line = lines.find(l => {
      const lineTop = Math.min(...l.map(b => b.y));
      const lineBot = Math.max(...l.map(b => b.y + b.height));
      const lineMid = (lineTop + lineBot) / 2;
      return Math.abs(lineMid - blockMid) < block.height * 0.6;
    });
    if (line) line.push(block);
    else lines.push([block]);
  }

  const blocks: ExtractedBlock[] = lines
    .map(line => {
      const sorted = [...line].sort((a, b) => a.x - b.x);
      let text = '';
      for (let i = 0; i < sorted.length; i++) {
        if (i > 0) {
          const gap = sorted[i].x - (sorted[i - 1].x + sorted[i - 1].width);
          if (gap > sorted[i].fontSize * 0.35) text += ' ';
        }
        text += sorted[i].text;
      }
      return {
        text: text.trim(),
        x: Math.max(0, sorted[0].x),
        y: Math.max(0, Math.min(...sorted.map(b => b.y))),
        width: Math.max(Math.max(...sorted.map(b => b.x + b.width)) - sorted[0].x, 10),
        height: Math.max(...sorted.map(b => b.height)),
        fontSize: sorted[0].fontSize,
        fontWeight: sorted.some(b => b.fontWeight === 'bold')
          ? 'bold'
          : sorted.some(b => b.fontWeight === 'semi-bold')
            ? 'semi-bold'
            : 'normal',
        pageIndex,
      } as ExtractedBlock;
    })
    .filter(b => b.text.length > 0);

  return { blocks, iconBboxes };
}

// ---------------------------------------------------------------------------
// Graphics extraction — getOperatorList → shapes
// ---------------------------------------------------------------------------

function extractShapesFromOpList(
  fnArray: number[],
  argsArray: any[],
  viewport: pdfjsLib.PageViewport,
  pageIndex: number,
): ExtractedShape[] {
  const OPS = pdfjsLib.OPS as Record<string, number>;
  const shapes: ExtractedShape[] = [];

  let strokeColor = '#000000';
  let fillColor = 'transparent';
  let lineWidthPt = 1;
  let pendingPath: { subOps: number[]; coords: number[] } | null = null;

  const toVP = (x: number, y: number) =>
    viewport.convertToViewportPoint(x, y) as [number, number];

  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    const a = argsArray[i];

    if      (fn === OPS.setLineWidth)       lineWidthPt = a[0];
    else if (fn === OPS.setStrokeRGBColor)  strokeColor = rgbToHex(a[0], a[1], a[2]);
    else if (fn === OPS.setFillRGBColor)    fillColor   = rgbToHex(a[0], a[1], a[2]);
    else if (fn === OPS.setStrokeGray)      strokeColor = grayToHex(a[0]);
    else if (fn === OPS.setFillGray)        fillColor   = grayToHex(a[0]);
    else if (fn === OPS.constructPath) {
      pendingPath = { subOps: Array.from(a[0] as number[]), coords: Array.from(a[1] as number[]) };
    }
    else if (fn === OPS.stroke || fn === OPS.closeStroke) {
      if (pendingPath) {
        const s = pathToShape(pendingPath, toVP, lineWidthPt * SCALE, strokeColor, 'transparent', pageIndex);
        if (s) shapes.push(s);
        pendingPath = null;
      }
    }
    else if (fn === OPS.fill || fn === OPS.eoFill) {
      if (pendingPath) {
        const s = pathToShape(pendingPath, toVP, 0, 'transparent', fillColor, pageIndex);
        if (s) shapes.push(s);
        pendingPath = null;
      }
    }
    else if (
      fn === OPS.fillStroke || fn === OPS.eoFillStroke ||
      fn === OPS.closeFillStroke || fn === OPS.closeEOFillStroke
    ) {
      if (pendingPath) {
        const s = pathToShape(pendingPath, toVP, lineWidthPt * SCALE, strokeColor, fillColor, pageIndex);
        if (s) shapes.push(s);
        pendingPath = null;
      }
    }
    else if (fn === OPS.endPath) {
      pendingPath = null;
    }
  }

  return shapes;
}

const SUB_OP_ARGC: Record<number, number> = {};

function getSubOpArgc(OPS: Record<string, number>): Record<number, number> {
  if (OPS.moveTo in SUB_OP_ARGC) return SUB_OP_ARGC;
  SUB_OP_ARGC[OPS.moveTo]    = 2;
  SUB_OP_ARGC[OPS.lineTo]    = 2;
  SUB_OP_ARGC[OPS.curveTo]   = 6;
  SUB_OP_ARGC[OPS.curveTo2]  = 4;
  SUB_OP_ARGC[OPS.curveTo3]  = 4;
  SUB_OP_ARGC[OPS.closePath] = 0;
  SUB_OP_ARGC[OPS.rectangle] = 4;
  return SUB_OP_ARGC;
}

function pathToShape(
  path: { subOps: number[]; coords: number[] },
  toVP: (x: number, y: number) => [number, number],
  strokeWidth: number,
  strokeColor: string,
  fillColor: string,
  pageIndex: number,
): ExtractedShape | null {
  const OPS = pdfjsLib.OPS as Record<string, number>;
  const argc = getSubOpArgc(OPS);

  const points: [number, number][] = [];
  let ci = 0;
  let rectShape: ExtractedShape | null = null;

  for (const subOp of path.subOps) {
    if (subOp === OPS.rectangle) {
      const [rx, ry, rw, rh] = path.coords.slice(ci, ci + 4);
      ci += 4;
      const [x1, y1] = toVP(rx, ry);
      const [x2, y2] = toVP(rx + Math.abs(rw), ry + Math.abs(rh));
      const x = Math.min(x1, x2), y = Math.min(y1, y2);
      const w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
      if (w < 1 && h < 1) continue;
      if (w <= 2 || h <= 2) {
        rectShape = {
          kind: w > h ? 'hline' : 'vline',
          x, y, width: Math.max(w, strokeWidth), height: Math.max(h, strokeWidth),
          strokeColor: strokeColor !== 'transparent' ? strokeColor : fillColor,
          strokeWidth: Math.max(strokeWidth, 1),
          fillColor: 'transparent',
          pageIndex,
        };
      } else {
        rectShape = { kind: 'rect', x, y, width: w, height: h, strokeColor, strokeWidth, fillColor, pageIndex };
      }
    } else if (subOp === OPS.moveTo || subOp === OPS.lineTo) {
      const [vx, vy] = toVP(path.coords[ci], path.coords[ci + 1]);
      points.push([vx, vy]);
      ci += 2;
    } else {
      ci += (argc[subOp] ?? 0);
    }
  }

  if (rectShape) return rectShape;
  if (points.length < 2) return null;

  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const dx = maxX - minX, dy = maxY - minY;

  const sw = Math.max(strokeWidth, 1);

  if (dy <= sw * 2 && dx > 3) {
    return { kind: 'hline', x: minX, y: minY, width: dx, height: sw, strokeColor, strokeWidth: sw, fillColor: 'transparent', pageIndex };
  }
  if (dx <= sw * 2 && dy > 3) {
    return { kind: 'vline', x: minX, y: minY, width: sw, height: dy, strokeColor, strokeWidth: sw, fillColor: 'transparent', pageIndex };
  }

  if (points.length >= 4) {
    const uxs = [...new Set(xs.map(x => Math.round(x)))];
    const uys = [...new Set(ys.map(y => Math.round(y)))];
    if (uxs.length <= 2 && uys.length <= 2 && dx > 3 && dy > 3) {
      return { kind: 'rect', x: minX, y: minY, width: dx, height: dy, strokeColor, strokeWidth: sw, fillColor, pageIndex };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Table detection — grid of adjacent rectangles
// ---------------------------------------------------------------------------

function detectTables(
  shapes: ExtractedShape[],
  textBlocks: ExtractedBlock[],
  pageIndex: number,
): {
  tables: ExtractedTable[];
  remainingShapes: ExtractedShape[];
  remainingBlocks: ExtractedBlock[];
} {
  const rects = shapes.filter(s => s.kind === 'rect');
  const nonRects = shapes.filter(s => s.kind !== 'rect');

  if (rects.length < 2) {
    return { tables: [], remainingShapes: shapes, remainingBlocks: textBlocks };
  }

  const TOL = 4;
  const snap = (v: number) => Math.round(v / TOL) * TOL;

  const MIN_CELL_W = 30;
  const MIN_CELL_H = 15;

  const rowGroups = new Map<number, ExtractedShape[]>();
  for (const r of rects) {
    if (r.width < MIN_CELL_W || r.height < MIN_CELL_H) continue;
    const key = snap(r.y);
    if (!rowGroups.has(key)) rowGroups.set(key, []);
    rowGroups.get(key)!.push(r);
  }

  const usedRectIds = new Set<number>();
  const tables: ExtractedTable[] = [];

  const sortedRowKeys = [...rowGroups.keys()].sort((a, b) => a - b);

  for (let ri = 0; ri < sortedRowKeys.length; ri++) {
    const firstRow = rowGroups.get(sortedRowKeys[ri])!.sort((a, b) => a.x - b.x);
    if (firstRow.length < 1) continue;

    const colCount = firstRow.length;
    const colXs = firstRow.map(r => snap(r.x));

    const gridRows: ExtractedShape[][] = [firstRow];

    for (let rj = ri + 1; rj < sortedRowKeys.length; rj++) {
      const nextRow = rowGroups.get(sortedRowKeys[rj])!.sort((a, b) => a.x - b.x);
      if (nextRow.length !== colCount) break;
      const nextColXs = nextRow.map(r => snap(r.x));
      if (!colXs.every((cx, ci) => Math.abs(cx - nextColXs[ci]) <= TOL)) break;
      gridRows.push(nextRow);
    }

    if (gridRows.length < 2) continue;

    const flatRects = gridRows.flat();
    const rectIndices = flatRects.map(r => rects.indexOf(r));
    rectIndices.forEach(idx => usedRectIds.add(idx));

    const colWidths = firstRow.map(r => r.width);
    const rowHeights = gridRows.map(row => Math.max(...row.map(r => r.height)));

    const tableX = Math.min(...flatRects.map(r => r.x));
    const tableY = Math.min(...flatRects.map(r => r.y));
    const tableW = Math.max(...flatRects.map(r => r.x + r.width)) - tableX;
    const tableH = Math.max(...flatRects.map(r => r.y + r.height)) - tableY;

    const cells: string[][] = gridRows.map(row =>
      row.map(cell => {
        const inside = textBlocks
          .filter(b => {
            const cx = b.x + b.width / 2;
            const cy = b.y + b.height / 2;
            return cx >= cell.x - TOL && cx <= cell.x + cell.width + TOL &&
                   cy >= cell.y - TOL && cy <= cell.y + cell.height + TOL;
          })
          .sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);
        return inside.map(b => b.text).join(' ').trim();
      }),
    );

    const hasAnyText = cells.some(row => row.some(cell => cell.length > 0));
    if (!hasAnyText) {
      rectIndices.forEach(idx => usedRectIds.delete(idx));
      continue;
    }

    const borderColor = firstRow[0].strokeColor !== 'transparent' ? firstRow[0].strokeColor : '#000000';

    tables.push({
      x: tableX, y: tableY, width: tableW, height: tableH,
      colWidths, rowHeights, cells,
      borderColor,
      borderWidth: Math.max(firstRow[0].strokeWidth, 1),
      pageIndex,
    });

    ri += gridRows.length - 1;
  }

  const absorbedBlock = (b: ExtractedBlock) => {
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    return tables.some(t =>
      cx >= t.x - TOL && cx <= t.x + t.width + TOL &&
      cy >= t.y - TOL && cy <= t.y + t.height + TOL,
    );
  };

  const remainingShapes = [
    ...nonRects,
    ...rects.filter((_, idx) => !usedRectIds.has(idx)),
  ];
  const remainingBlocks = textBlocks.filter(b => !absorbedBlock(b));

  return { tables, remainingShapes, remainingBlocks };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rgbToHex(r: number, g: number, b: number): string {
  const toB = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toB(r)}${toB(g)}${toB(b)}`;
}

function grayToHex(g: number): string {
  return rgbToHex(g, g, g);
}
