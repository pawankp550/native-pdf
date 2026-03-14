import type { PDFPage } from 'pdf-lib';
import { rgb } from 'pdf-lib';
import type { RectangleElement } from '../../../store/pdf-editor/types/elements';
import { hexToRgb } from '../utils/color';
import { canvasToPdfY } from '../utils/coordinates';

export function renderRectangle(page: PDFPage, el: RectangleElement): void {
  const pageHeight = page.getHeight();
  const pdfY = canvasToPdfY(el.position.y, el.height, pageHeight);
  const fill = el.transparent ? undefined : hexToRgb(el.fillColor);
  const stroke = el.strokeWidth > 0 ? hexToRgb(el.strokeColor) : undefined;
  page.drawRectangle({
    x: el.position.x,
    y: pdfY,
    width: el.width,
    height: el.height,
    color: fill ? rgb(fill.r, fill.g, fill.b) : undefined,
    opacity: el.transparent ? 0 : el.fillOpacity * el.opacity,
    borderColor: stroke ? rgb(stroke.r, stroke.g, stroke.b) : undefined,
    borderWidth: el.strokeWidth,
    borderOpacity: el.opacity,
  });
}
