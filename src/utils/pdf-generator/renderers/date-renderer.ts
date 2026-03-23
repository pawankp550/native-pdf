import type { PDFPage, PDFFont } from 'pdf-lib';
import { rgb } from 'pdf-lib';
import type { DateElement } from '../../../store/pdf-editor/types/elements';
import { hexToRgb } from '../utils/color';
import { canvasToPdfY } from '../utils/coordinates';
import { formatDate, parseIsoDate } from '../../date-format';

export function renderDate(
  page: PDFPage,
  el: DateElement,
  font: PDFFont,
  boldFont: PDFFont,
): void {
  const pageHeight = page.getHeight();

  const date = el.dateSource === 'fixed' && el.fixedDate
    ? parseIsoDate(el.fixedDate)
    : new Date();

  const text = el.format ? formatDate(date, el.format) : '';
  if (!text) return;

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

  const textY = canvasToPdfY(
    el.position.y + (el.height - el.fontSize) / 2,
    el.fontSize,
    pageHeight,
  );

  const { r, g, b } = hexToRgb(el.fontColor);
  page.drawText(text, {
    x,
    y: textY,
    size: el.fontSize,
    font: usedFont,
    color: rgb(r, g, b),
    opacity: el.opacity,
  });
}
