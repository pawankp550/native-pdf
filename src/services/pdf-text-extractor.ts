/**
 * Extracts positioned text blocks, vector shapes, and tables from a PDF.
 *
 * Text strategy (per page):
 *  1. pdfjs getTextContent() — instant, pixel-perfect for digital PDFs.
 *  2. Tesseract OCR fallback for scanned (image-only) pages.
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
import type Tesseract from 'tesseract.js';

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
  fontWeight: 'normal' | 'bold';
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

export interface PageExtraction {
  textBlocks: ExtractedBlock[];
  shapes: ExtractedShape[];
  tables: ExtractedTable[];
}

export interface ExtractionProgress {
  page: number;
  total: number;
  method: 'pdfjs' | 'ocr';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function extractFromPdf(
  dataUrl: string,
  pageImages: string[],
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
    const textContent = await page.getTextContent();
    const hasText = textContent.items.some((it: any) => it.str?.trim());

    let textBlocks: ExtractedBlock[];
    if (hasText) {
      onProgress?.({ page: i, total: pdf.numPages, method: 'pdfjs' });
      textBlocks = extractFromPdfjsItems(textContent.items, viewport, i - 1);
    } else {
      onProgress?.({ page: i, total: pdf.numPages, method: 'ocr' });
      textBlocks = await extractViaOcr(pageImages[i - 1], viewport.width, viewport.height, i - 1);
    }

    // --- Graphics ---
    const opList = await page.getOperatorList();
    const rawShapes = extractShapesFromOpList(opList.fnArray, opList.argsArray, viewport, i - 1);

    // --- Table detection ---
    const { tables, remainingShapes, remainingBlocks } = detectTables(rawShapes, textBlocks, i - 1);

    result.push({ textBlocks: remainingBlocks, shapes: remainingShapes, tables });
    page.cleanup();
  }

  return result;
}

/** Legacy export kept for backward compat */
export async function extractTextFromPdf(
  dataUrl: string,
  pageImages: string[],
  onProgress?: (p: ExtractionProgress) => void,
): Promise<ExtractedBlock[][]> {
  const pages = await extractFromPdf(dataUrl, pageImages, onProgress);
  return pages.map(p => p.textBlocks);
}

// ---------------------------------------------------------------------------
// Text extraction — pdf.js items → grouped lines
// ---------------------------------------------------------------------------

function extractFromPdfjsItems(
  items: any[],
  viewport: pdfjsLib.PageViewport,
  pageIndex: number,
): ExtractedBlock[] {
  interface Raw {
    text: string; x: number; y: number;
    width: number; height: number;
    fontSize: number; fontWeight: 'normal' | 'bold';
  }

  const raw: Raw[] = items
    .filter((it: any) => it.str?.trim())
    .map((it: any) => {
      const fontSizePt = Math.abs(it.transform[3]) || 10;
      const fontSizePx = fontSizePt * SCALE;
      const [vpx, vpy] = viewport.convertToViewportPoint(it.transform[4], it.transform[5]);
      const fontName: string = (it.fontName ?? '').toLowerCase();
      const isBold = /bold|black|heavy|demi/.test(fontName);
      return {
        text: it.str,
        x: vpx,
        y: vpy - fontSizePx,
        width: Math.max((it.width || fontSizePt) * SCALE, 4),
        height: Math.ceil(fontSizePx * 1.25),
        fontSize: Math.round(fontSizePx),
        fontWeight: isBold ? 'bold' : 'normal',
      } as Raw;
    });

  if (raw.length === 0) return [];

  // Group into lines by Y proximity
  const lines: Raw[][] = [];
  for (const block of [...raw].sort((a, b) => a.y - b.y)) {
    const line = lines.find(l => Math.abs(l[0].y - block.y) < block.height * 0.55);
    if (line) line.push(block);
    else lines.push([block]);
  }

  return lines
    .map(line => {
      const sorted = [...line].sort((a, b) => a.x - b.x);
      let text = '';
      for (let i = 0; i < sorted.length; i++) {
        if (i > 0) {
          const gap = sorted[i].x - (sorted[i - 1].x + sorted[i - 1].width);
          if (gap > sorted[i].fontSize * 0.25) text += ' ';
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
        fontWeight: sorted.some(b => b.fontWeight === 'bold') ? 'bold' : 'normal',
        pageIndex,
      } as ExtractedBlock;
    })
    .filter(b => b.text.length > 0);
}

// ---------------------------------------------------------------------------
// Tesseract OCR fallback
// ---------------------------------------------------------------------------

async function extractViaOcr(
  pageImage: string,
  canvasWidth: number,
  canvasHeight: number,
  pageIndex: number,
): Promise<ExtractedBlock[]> {
  const { createWorker } = await import('tesseract.js');
  const imgSize = await measureImage(pageImage);
  const scaleX = canvasWidth / imgSize.width;
  const scaleY = canvasHeight / imgSize.height;
  const worker = await createWorker('eng', 1, { logger: () => {} });
  try {
    const { data } = await worker.recognize(pageImage);
    const lines = (data.blocks ?? []).flatMap(b =>
      (b.paragraphs ?? []).flatMap(p => p.lines ?? []),
    );
    return lines
      .filter((l: Tesseract.Line) => l.text.trim() && l.confidence > 30)
      .map((l: Tesseract.Line) => {
        const w = (l.bbox.x1 - l.bbox.x0) * scaleX;
        const h = (l.bbox.y1 - l.bbox.y0) * scaleY;
        return {
          text: l.text.trim(),
          x: l.bbox.x0 * scaleX,
          y: l.bbox.y0 * scaleY,
          width: Math.max(w, 10),
          height: Math.max(h, 10),
          fontSize: Math.max(6, Math.round(h * 0.72)),
          fontWeight: 'normal',
          pageIndex,
        } as ExtractedBlock;
      });
  } finally {
    await worker.terminate();
  }
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

    // --- Graphics state ---
    if      (fn === OPS.setLineWidth)       lineWidthPt = a[0];
    else if (fn === OPS.setStrokeRGBColor)  strokeColor = rgbToHex(a[0], a[1], a[2]);
    else if (fn === OPS.setFillRGBColor)    fillColor   = rgbToHex(a[0], a[1], a[2]);
    else if (fn === OPS.setStrokeGray)      strokeColor = grayToHex(a[0]);
    else if (fn === OPS.setFillGray)        fillColor   = grayToHex(a[0]);

    // --- Path construction ---
    else if (fn === OPS.constructPath) {
      pendingPath = { subOps: Array.from(a[0] as number[]), coords: Array.from(a[1] as number[]) };
    }

    // --- Path painting ---
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

  // Straight horizontal or vertical line
  if (dy <= sw * 2 && dx > 3) {
    return { kind: 'hline', x: minX, y: minY, width: dx, height: sw, strokeColor, strokeWidth: sw, fillColor: 'transparent', pageIndex };
  }
  if (dx <= sw * 2 && dy > 3) {
    return { kind: 'vline', x: minX, y: minY, width: sw, height: dy, strokeColor, strokeWidth: sw, fillColor: 'transparent', pageIndex };
  }

  // Closed rectangular path (4 corners with only 2 unique X and 2 unique Y)
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

  // Group rects that form a grid: same rows (same y±tol) and same cols (same x±tol)
  const TOL = 4;
  const snap = (v: number) => Math.round(v / TOL) * TOL;

  // Cluster by top-Y to find rows
  const rowGroups = new Map<number, ExtractedShape[]>();
  for (const r of rects) {
    const key = snap(r.y);
    if (!rowGroups.has(key)) rowGroups.set(key, []);
    rowGroups.get(key)!.push(r);
  }

  // A table candidate: ≥2 rows that have the same number of rects and same X positions
  const usedRectIds = new Set<number>();
  const tables: ExtractedTable[] = [];

  const sortedRowKeys = [...rowGroups.keys()].sort((a, b) => a - b);

  for (let ri = 0; ri < sortedRowKeys.length; ri++) {
    const firstRow = rowGroups.get(sortedRowKeys[ri])!.sort((a, b) => a.x - b.x);
    if (firstRow.length < 1) continue;

    const colCount = firstRow.length;
    const colXs = firstRow.map(r => snap(r.x));

    // Find consecutive rows with matching column structure
    const gridRows: ExtractedShape[][] = [firstRow];

    for (let rj = ri + 1; rj < sortedRowKeys.length; rj++) {
      const nextRow = rowGroups.get(sortedRowKeys[rj])!.sort((a, b) => a.x - b.x);
      if (nextRow.length !== colCount) break;
      const nextColXs = nextRow.map(r => snap(r.x));
      if (!colXs.every((cx, ci) => Math.abs(cx - nextColXs[ci]) <= TOL)) break;
      gridRows.push(nextRow);
    }

    if (gridRows.length < 2) continue;

    // Mark rects as used
    const flatRects = gridRows.flat();
    const rectIndices = flatRects.map(r => rects.indexOf(r));
    rectIndices.forEach(idx => usedRectIds.add(idx));

    // Build table geometry
    const colWidths = firstRow.map(r => r.width);
    const rowHeights = gridRows.map(row => Math.max(...row.map(r => r.height)));

    const tableX = Math.min(...flatRects.map(r => r.x));
    const tableY = Math.min(...flatRects.map(r => r.y));
    const tableW = Math.max(...flatRects.map(r => r.x + r.width)) - tableX;
    const tableH = Math.max(...flatRects.map(r => r.y + r.height)) - tableY;

    // Collect text inside each cell
    const cells: string[][] = gridRows.map(row =>
      row.map(cell => {
        const inside = textBlocks.filter(b =>
          b.x >= cell.x - TOL && b.x + b.width <= cell.x + cell.width + TOL &&
          b.y >= cell.y - TOL && b.y + b.height <= cell.y + cell.height + TOL,
        );
        return inside.map(b => b.text).join(' ').trim();
      }),
    );

    const borderColor = firstRow[0].strokeColor !== 'transparent' ? firstRow[0].strokeColor : '#000000';

    tables.push({
      x: tableX, y: tableY, width: tableW, height: tableH,
      colWidths, rowHeights, cells,
      borderColor,
      borderWidth: Math.max(firstRow[0].strokeWidth, 1),
      pageIndex,
    });

    ri += gridRows.length - 1; // skip consumed rows
  }

  // Remove rects absorbed into tables + text blocks inside tables
  const tableRegions = tables;
  const absorbedBlock = (b: ExtractedBlock) =>
    tableRegions.some(t =>
      b.x >= t.x - TOL && b.x + b.width <= t.x + t.width + TOL &&
      b.y >= t.y - TOL && b.y + b.height <= t.y + t.height + TOL,
    );

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

function measureImage(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = src;
  });
}
