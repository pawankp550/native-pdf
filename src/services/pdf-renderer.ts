/**
 * Uses pdfjs-dist to render each page of a PDF file into a PNG data URL.
 * Scale is 96/72 (PDF points → screen pixels at 96 DPI), matching the
 * canvas page-size convention used throughout the editor (e.g. A4 = 794×1123 px).
 */

// pdfjs-dist v5 uses Map.prototype.getOrInsertComputed (TC39 Stage 3 proposal)
// which is not yet available in all browsers. Polyfill it here before the import.
if (!('getOrInsertComputed' in Map.prototype)) {
  // @ts-expect-error — polyfill for missing TC39 proposal
  Map.prototype.getOrInsertComputed = function <K, V>(
    this: Map<K, V>,
    key: K,
    callbackFn: (key: K) => V,
  ): V {
    if (!this.has(key)) this.set(key, callbackFn(key));
    return this.get(key) as V;
  };
}

import * as pdfjsLib from 'pdfjs-dist';

// Point the worker at the bundled worker file so Vite can resolve it.
// pdfjs-dist ships an ES-module worker that Vite can import directly.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href;

const SCALE = 96 / 72; // PDF points → 96-dpi screen pixels

export interface RenderedPdfResult {
  pageImages: string[];
  pageDimensions: { width: number; height: number }[];
  pageCount: number;
}

export async function renderPdfToImages(dataUrl: string): Promise<RenderedPdfResult> {
  const base64 = dataUrl.split(',')[1];
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

  const loadingTask = pdfjsLib.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;

  const pageImages: string[] = [];
  const pageDimensions: { width: number; height: number }[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: SCALE });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context for PDF rendering');

    await page.render({ canvasContext: ctx, canvas, viewport }).promise;

    pageImages.push(canvas.toDataURL('image/png'));
    pageDimensions.push({ width: canvas.width, height: canvas.height });

    // Release page resources
    page.cleanup();
  }

  return { pageImages, pageDimensions, pageCount: pdf.numPages };
}
