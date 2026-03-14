import type { PDFPage } from 'pdf-lib';
import { rgb } from 'pdf-lib';
import type { LineElement } from '../../../store/pdf-editor/types/elements';
import { hexToRgb } from '../utils/color';
import { canvasToPdfY } from '../utils/coordinates';

export function renderLine(page: PDFPage, el: LineElement): void {
  const pageHeight = page.getHeight();
  const { r, g, b } = hexToRgb(el.strokeColor);
  const pdfY = canvasToPdfY(el.position.y + el.height / 2, 0, pageHeight);
  page.drawLine({
    start: { x: el.position.x, y: pdfY },
    end: { x: el.position.x + el.width, y: pdfY },
    thickness: el.strokeWidth,
    color: rgb(r, g, b),
    opacity: el.opacity,
    dashArray: el.dashArray.length ? el.dashArray : undefined,
    lineCap: el.lineCap === 'round' ? 1 : el.lineCap === 'square' ? 2 : 0,
  });
}
