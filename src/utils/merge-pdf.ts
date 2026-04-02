import { PDFDocument } from 'pdf-lib';

export interface MergeEntry {
  id: string;
  file: File;
  pageCount: number;
  fromPage: number; // 1-based, inclusive
  toPage: number;   // 1-based, inclusive
}

export async function getPageCount(file: File): Promise<number> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  return doc.getPageCount();
}

export async function mergePdfs(entries: MergeEntry[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create();

  for (const entry of entries) {
    const bytes = await entry.file.arrayBuffer();
    const src = await PDFDocument.load(bytes);
    const total = src.getPageCount();
    const from = Math.max(1, Math.min(entry.fromPage, total)) - 1; // 0-based
    const to = Math.max(from, Math.min(entry.toPage, total) - 1);  // 0-based inclusive
    const indices = Array.from({ length: to - from + 1 }, (_, i) => from + i);
    const pages = await merged.copyPages(src, indices);
    pages.forEach(p => merged.addPage(p));
  }

  return merged.save();
}
