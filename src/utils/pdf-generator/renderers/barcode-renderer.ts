import type { PDFPage, PDFDocument } from 'pdf-lib';
import JsBarcode from 'jsbarcode';
import type { BarcodeElement } from '../../../store/pdf-editor/types/elements';
import { canvasToPdfY } from '../utils/coordinates';

export async function renderBarcode(
  page: PDFPage,
  el: BarcodeElement,
  pdfDoc: PDFDocument,
): Promise<void> {
  if (!el.value.trim()) return;

  const canvas = document.createElement('canvas');
  try {
    JsBarcode(canvas, el.value, {
      format: el.format,
      lineColor: el.lineColor,
      background: el.background,
      displayValue: el.displayValue,
      fontSize: el.fontSize,
      margin: el.margin,
      width: 2,
      height: el.height - (el.displayValue ? el.fontSize + el.margin * 2 + 4 : el.margin * 2),
    });
  } catch {
    return; // invalid value for the format — skip silently
  }

  // Scale canvas to element size
  const out = document.createElement('canvas');
  out.width = Math.round(el.width);
  out.height = Math.round(el.height);
  const ctx = out.getContext('2d')!;
  ctx.drawImage(canvas, 0, 0, out.width, out.height);

  const dataUrl = out.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1];
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const image = await pdfDoc.embedPng(bytes);

  const pdfY = canvasToPdfY(el.position.y, el.height, page.getHeight());
  page.drawImage(image, {
    x: el.position.x,
    y: pdfY,
    width: el.width,
    height: el.height,
    opacity: el.opacity,
  });
}
