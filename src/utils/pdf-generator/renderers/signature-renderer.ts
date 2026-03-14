import type { PDFPage, PDFFont } from 'pdf-lib';
import { rgb } from 'pdf-lib';
import type { SignatureElement } from '../../../store/pdf-editor/types/elements';
import { hexToRgb } from '../utils/color';
import { canvasToPdfY } from '../utils/coordinates';

export function renderSignature(page: PDFPage, el: SignatureElement, font: PDFFont): void {
  const pageHeight = page.getHeight();
  const { r, g, b } = hexToRgb(el.lineColor);
  const lineColor = rgb(r, g, b);
  const pdfY = canvasToPdfY(el.position.y, el.height, pageHeight);

  if (el.style === 'line-only') {
    const lineY = pdfY + el.labelFontSize + 4;
    page.drawLine({ start: { x: el.position.x, y: lineY }, end: { x: el.position.x + el.width, y: lineY }, thickness: el.lineWidth, color: lineColor });
    page.drawText(el.label, { x: el.position.x, y: pdfY, size: el.labelFontSize, font, color: lineColor });
  } else if (el.style === 'box') {
    page.drawRectangle({ x: el.position.x, y: pdfY, width: el.width, height: el.height, borderColor: lineColor, borderWidth: el.lineWidth });
    page.drawText(el.label, { x: el.position.x + 4, y: pdfY + el.height - el.labelFontSize - 4, size: el.labelFontSize, font, color: lineColor });
  } else {
    // formal: 3 stacked lines
    const sectionHeight = el.height / 3;
    const labels = ['Signature', 'Printed Name', 'Date'];
    const numSections = 3;
    for (let i = 0; i < numSections; i++) {
      const lineY = pdfY + (numSections - i) * sectionHeight - el.labelFontSize - 4;
      page.drawLine({ start: { x: el.position.x, y: lineY }, end: { x: el.position.x + el.width, y: lineY }, thickness: el.lineWidth, color: lineColor });
      page.drawText(labels[i] ?? '', { x: el.position.x, y: lineY - el.labelFontSize - 2, size: el.labelFontSize, font, color: lineColor });
    }
  }
}
