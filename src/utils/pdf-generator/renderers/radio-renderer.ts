import type { PDFPage, PDFFont } from 'pdf-lib';
import { rgb } from 'pdf-lib';
import type { RadioElement } from '../../../store/pdf-editor/types/elements';
import { hexToRgb } from '../utils/color';
import { canvasToPdfY } from '../utils/coordinates';

export function renderRadio(page: PDFPage, el: RadioElement, font: PDFFont): void {
  const pageHeight = page.getHeight();
  const pdfElementY = canvasToPdfY(el.position.y, el.height, pageHeight);

  const circleD = el.height;
  const radius = circleD / 2 - el.strokeWidth / 2;
  const gap = 6;

  const circleCenterX = el.labelPosition === 'left'
    ? el.position.x + el.width - circleD / 2
    : el.position.x + circleD / 2;
  const circleCenterY = pdfElementY + el.height / 2;

  // Outer ring
  const fill = hexToRgb(el.fillColor);
  const stroke = hexToRgb(el.strokeColor);
  page.drawEllipse({
    x: circleCenterX,
    y: circleCenterY,
    xScale: radius,
    yScale: radius,
    color: rgb(fill.r, fill.g, fill.b),
    borderColor: rgb(stroke.r, stroke.g, stroke.b),
    borderWidth: el.strokeWidth,
    opacity: el.opacity,
    borderOpacity: el.opacity,
  });

  // Inner dot when checked
  if (el.checked) {
    const dot = hexToRgb(el.checkColor);
    const innerRadius = radius * 0.44;
    page.drawEllipse({
      x: circleCenterX,
      y: circleCenterY,
      xScale: innerRadius,
      yScale: innerRadius,
      color: rgb(dot.r, dot.g, dot.b),
      opacity: el.opacity,
    });
  }

  // Label text
  if (el.label) {
    const labelX = el.labelPosition === 'left'
      ? el.position.x
      : el.position.x + circleD + gap;
    const labelY = pdfElementY + (el.height - el.labelFontSize) / 2;
    const lc = hexToRgb(el.labelColor);
    page.drawText(el.label, {
      x: labelX,
      y: labelY,
      size: el.labelFontSize,
      font,
      color: rgb(lc.r, lc.g, lc.b),
      opacity: el.opacity,
    });
  }
}
