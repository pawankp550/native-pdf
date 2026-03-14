import type { PDFPage, PDFDocument } from 'pdf-lib';
import { rgb } from 'pdf-lib';
import type { SignaturePadElement } from '../../../store/pdf-editor/types/elements';
import { hexToRgb } from '../utils/color';
import { canvasToPdfY } from '../utils/coordinates';

export async function renderSignaturePad(
  page: PDFPage,
  el: SignaturePadElement,
  pdfDoc: PDFDocument,
): Promise<void> {
  const pageHeight = page.getHeight();
  const pdfY = canvasToPdfY(el.position.y, el.height, pageHeight);

  // Background fill
  if (el.backgroundColor && el.backgroundColor !== 'transparent') {
    const { r, g, b } = hexToRgb(el.backgroundColor);
    page.drawRectangle({
      x: el.position.x,
      y: pdfY,
      width: el.width,
      height: el.height,
      color: rgb(r, g, b),
    });
  }

  // Border
  if (el.borderWidth > 0) {
    const { r, g, b } = hexToRgb(el.borderColor);
    page.drawRectangle({
      x: el.position.x,
      y: pdfY,
      width: el.width,
      height: el.height,
      borderColor: rgb(r, g, b),
      borderWidth: el.borderWidth,
    });
  }

  // Signature image
  if (el.dataUrl) {
    try {
      const base64 = el.dataUrl.split(',')[1];
      if (base64) {
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const pngImage = await pdfDoc.embedPng(bytes);
        page.drawImage(pngImage, {
          x: el.position.x,
          y: pdfY,
          width: el.width,
          height: el.height,
        });
      }
    } catch (err) {
      console.error('Failed to embed signature pad image:', err);
    }
  }
}
