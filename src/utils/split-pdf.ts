import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

export type SplitMode = 'ranges' | 'every-n' | 'each-page';

export interface SplitRange {
  id: string;
  from: number; // 1-based inclusive
  to: number;   // 1-based inclusive
  name: string;
}

export async function getPageCount(file: File): Promise<number> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  return doc.getPageCount();
}

async function extractPages(srcBytes: ArrayBuffer, from: number, to: number): Promise<Uint8Array> {
  const src = await PDFDocument.load(srcBytes);
  const out = await PDFDocument.create();
  const total = src.getPageCount();
  const f = Math.max(0, from - 1);
  const t = Math.min(total - 1, to - 1);
  const indices = Array.from({ length: t - f + 1 }, (_, i) => f + i);
  const pages = await out.copyPages(src, indices);
  pages.forEach(p => out.addPage(p));
  return out.save();
}

export async function splitPdf(
  file: File,
  mode: SplitMode,
  ranges: SplitRange[],
  everyN: number,
): Promise<void> {
  const srcBytes = await file.arrayBuffer();
  const src = await PDFDocument.load(srcBytes);
  const total = src.getPageCount();
  const baseName = file.name.replace(/\.pdf$/i, '');

  // Build list of { from, to, name } to extract
  const parts: { from: number; to: number; name: string }[] = [];

  if (mode === 'ranges') {
    for (const r of ranges) {
      parts.push({ from: r.from, to: r.to, name: r.name || `${baseName}_pages_${r.from}-${r.to}` });
    }
  } else if (mode === 'every-n') {
    const n = Math.max(1, everyN);
    let part = 1;
    for (let i = 1; i <= total; i += n) {
      const to = Math.min(i + n - 1, total);
      parts.push({ from: i, to, name: `${baseName}_part${part}` });
      part++;
    }
  } else {
    // each-page
    for (let i = 1; i <= total; i++) {
      parts.push({ from: i, to: i, name: `${baseName}_page${i}` });
    }
  }

  if (parts.length === 1) {
    // Single output — direct download, no zip needed
    const bytes = await extractPages(srcBytes, parts[0].from, parts[0].to);
    downloadBytes(bytes, `${parts[0].name}.pdf`);
    return;
  }

  // Multiple outputs — bundle into zip
  const zip = new JSZip();
  await Promise.all(
    parts.map(async p => {
      const bytes = await extractPages(srcBytes, p.from, p.to);
      zip.file(`${p.name}.pdf`, bytes);
    }),
  );

  const zipBytes = await zip.generateAsync({ type: 'uint8array' });
  downloadBytes(zipBytes, `${baseName}_split.zip`);
}

function downloadBytes(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type: filename.endsWith('.zip') ? 'application/zip' : 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
