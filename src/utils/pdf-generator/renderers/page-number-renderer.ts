import type { PDFPage, PDFFont } from 'pdf-lib';
import { rgb } from 'pdf-lib';
import type { PageNumberElement } from '../../../store/pdf-editor/types/elements';
import { canvasToPdfY } from '../utils/coordinates';
import { hexToRgb } from '../utils/color';

export function renderPageNumber(
  page: PDFPage,
  el: PageNumberElement,
  font: PDFFont,
  boldFont: PDFFont,
  pageIndex: number,   // 1-based
  totalPages: number,
): void {
  const pageHeight = page.getHeight();

  const text = el.format
    .replace(/\{n\}/g, String(pageIndex))
    .replace(/\{total\}/g, String(totalPages));

  if (!text) return;

  // Background fill
  if (el.backgroundColor && el.backgroundColor !== 'transparent') {
    const { r, g, b } = hexToRgb(el.backgroundColor);
    const bgY = canvasToPdfY(el.position.y, el.height, pageHeight);
    page.drawRectangle({ x: el.position.x, y: bgY, width: el.width, height: el.height, color: rgb(r, g, b) });
  }

  const usedFont = el.fontWeight === 'bold' ? boldFont : font;
  const textWidth = usedFont.widthOfTextAtSize(text, el.fontSize);
  const innerW = el.width - el.padding * 2;

  let x = el.position.x + el.padding;
  if (el.textAlign === 'center') {
    x = el.position.x + (el.width - Math.min(textWidth, innerW)) / 2;
  } else if (el.textAlign === 'right') {
    x = el.position.x + el.width - el.padding - Math.min(textWidth, innerW);
  }

  // Vertically centre text within the element
  const textY = canvasToPdfY(
    el.position.y + (el.height - el.fontSize) / 2,
    el.fontSize,
    pageHeight
  );

  const { r, g, b } = hexToRgb(el.fontColor);
  page.drawText(text, {
    x,
    y: textY,
    size: el.fontSize,
    font: usedFont,
    color: rgb(r, g, b),
    maxWidth: innerW,
    opacity: el.opacity,
  });
}
