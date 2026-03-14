import type { PDFPage, PDFFont } from 'pdf-lib';
import { rgb } from 'pdf-lib';
import type { HeadingElement } from '../../../store/pdf-editor/types/elements';
import { canvasToPdfY } from '../utils/coordinates';
import { hexToRgb } from '../utils/color';

export function renderHeading(page: PDFPage, el: HeadingElement, font: PDFFont, boldFont: PDFFont): void {
  const pageHeight = page.getHeight();
  const { r, g, b } = hexToRgb(el.fontColor);
  const color = rgb(r, g, b);

  // Background
  if (el.backgroundColor && el.backgroundColor !== 'transparent') {
    const { r: br, g: bg, b: bb } = hexToRgb(el.backgroundColor);
    const bgY = canvasToPdfY(el.position.y, el.height, pageHeight);
    page.drawRectangle({ x: el.position.x, y: bgY, width: el.width, height: el.height, color: rgb(br, bg, bb) });
  }

  const lines = el.content.split('\n');
  const lineHeightPx = el.fontSize * 1.2;
  const totalTextHeight = lines.length * lineHeightPx;
  const innerH = el.height - el.padding * 2;

  let startY: number;
  if (el.verticalAlign === 'bottom') {
    startY = el.position.y + el.height - el.padding - totalTextHeight;
  } else if (el.verticalAlign === 'middle') {
    startY = el.position.y + (el.height - totalTextHeight) / 2;
  } else {
    startY = el.position.y + el.padding;
  }

  void innerH; // used implicitly via startY clamping

  lines.forEach((line, i) => {
    if (!line) return;
    const textY = canvasToPdfY(
      startY + i * lineHeightPx,
      el.fontSize,
      pageHeight,
    );
    const textWidth = boldFont.widthOfTextAtSize(line, el.fontSize);
    const innerW = el.width - el.padding * 2;

    let x = el.position.x + el.padding;
    if (el.textAlign === 'center') {
      x = el.position.x + (el.width - Math.min(textWidth, innerW)) / 2;
    } else if (el.textAlign === 'right') {
      x = el.position.x + el.width - el.padding - Math.min(textWidth, innerW);
    }

    page.drawText(line, {
      x,
      y: textY,
      size: el.fontSize,
      font: boldFont,
      color,
      maxWidth: innerW,
      opacity: el.opacity,
    });

    if (el.underline) {
      const actualWidth = Math.min(textWidth, innerW);
      page.drawLine({ start: { x, y: textY - 2 }, end: { x: x + actualWidth, y: textY - 2 }, thickness: 1, color });
    }
  });
}
