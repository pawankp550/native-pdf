import type { PDFPage } from 'pdf-lib';
import { rgb } from 'pdf-lib';
import type { CheckboxElement } from '../../../store/pdf-editor/types/elements';
import { hexToRgb } from '../utils/color';
import { canvasToPdfY } from '../utils/coordinates';

export function renderCheckbox(page: PDFPage, el: CheckboxElement): void {
  const pageHeight = page.getHeight();
  const pdfY = canvasToPdfY(el.position.y, el.height, pageHeight);
  const fill = hexToRgb(el.fillColor);
  const stroke = hexToRgb(el.strokeColor);
  page.drawRectangle({
    x: el.position.x,
    y: pdfY,
    width: el.width,
    height: el.height,
    color: rgb(fill.r, fill.g, fill.b),
    borderColor: rgb(stroke.r, stroke.g, stroke.b),
    borderWidth: el.strokeWidth,
    opacity: el.opacity,
  });
  if (el.checked) {
    const check = hexToRgb(el.checkColor);
    const checkColor = rgb(check.r, check.g, check.b);
    const pad = el.width * 0.15;
    const x1 = el.position.x + pad;
    const x2 = el.position.x + el.width - pad;
    const y1 = pdfY + pad;
    const y2 = pdfY + el.height - pad;
    if (el.checkStyle === 'check') {
      const midX = el.position.x + el.width * 0.35;
      const midY = pdfY + el.height * 0.25;
      page.drawLine({ start: { x: x1, y: pdfY + el.height * 0.5 }, end: { x: midX, y: midY }, thickness: el.strokeWidth, color: checkColor });
      page.drawLine({ start: { x: midX, y: midY }, end: { x: x2, y: y2 }, thickness: el.strokeWidth, color: checkColor });
    } else if (el.checkStyle === 'cross') {
      page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: el.strokeWidth, color: checkColor });
      page.drawLine({ start: { x: x2, y: y1 }, end: { x: x1, y: y2 }, thickness: el.strokeWidth, color: checkColor });
    } else {
      page.drawRectangle({ x: x1, y: y1, width: x2 - x1, height: y2 - y1, color: checkColor });
    }
  }
}
