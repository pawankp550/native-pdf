import type { PDFPage } from 'pdf-lib';
import { rgb } from 'pdf-lib';
import type { CircleElement } from '../../../store/pdf-editor/types/elements';
import { hexToRgb } from '../utils/color';
import { canvasToPdfY } from '../utils/coordinates';

export function renderCircle(page: PDFPage, el: CircleElement): void {
  const pageHeight = page.getHeight();
  const pdfY = canvasToPdfY(el.position.y, el.height, pageHeight);
  const fill = el.transparent ? undefined : hexToRgb(el.fillColor);
  const stroke = el.strokeWidth > 0 ? hexToRgb(el.strokeColor) : undefined;
  page.drawEllipse({
    x: el.position.x + el.width / 2,
    y: pdfY + el.height / 2,
    xScale: el.width / 2,
    yScale: el.height / 2,
    color: fill ? rgb(fill.r, fill.g, fill.b) : undefined,
    opacity: el.transparent ? 0 : el.fillOpacity * el.opacity,
    borderColor: stroke ? rgb(stroke.r, stroke.g, stroke.b) : undefined,
    borderWidth: el.strokeWidth,
    borderOpacity: el.opacity,
  });
}
