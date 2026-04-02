import { PDFDocument } from 'pdf-lib';

/**
 * Extract specific pages (1-based) from a PDF file and return as a new PDF.
 */
export async function extractPages(file: File, pageNumbers: number[]): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes);
  const out = await PDFDocument.create();

  const indices = pageNumbers.map(n => n - 1); // convert to 0-based
  const pages = await out.copyPages(src, indices);
  pages.forEach(p => out.addPage(p));

  return out.save();
}
