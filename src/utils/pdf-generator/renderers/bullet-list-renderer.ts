import type { PDFPage, PDFFont } from 'pdf-lib';
import { rgb } from 'pdf-lib';
import type { BulletListElement } from '../../../store/pdf-editor/types/elements';
import { canvasToPdfY } from '../utils/coordinates';
import { hexToRgb } from '../utils/color';
import { sanitizeForWinAnsi } from '../utils/sanitize-text';

export function renderBulletList(page: PDFPage, el: BulletListElement, font: PDFFont): void {
  const { height: pageHeight } = page.getSize();
  const { r, g, b } = hexToRgb(el.fontColor);
  const { r: br, g: bg, b: bb } = hexToRgb(el.bulletColor);
  const textColor = rgb(r, g, b);
  const bulletRgb = rgb(br, bg, bb);

  const startX = el.position.x + el.padding;
  const textX = startX + el.indentSize;
  const availWidth = el.width - el.padding * 2 - el.indentSize;
  const itemLineH = el.fontSize * el.lineHeight;

  let canvasY = el.position.y + el.padding;

  el.items.forEach((item, i) => {
    const pdfY = canvasToPdfY(canvasY, el.fontSize, pageHeight);
    const bulletCenterX = startX + el.indentSize / 2;

    if (el.bulletStyle === 'disc') {
      const radius = el.fontSize * 0.18;
      page.drawEllipse({
        x: bulletCenterX,
        y: pdfY + el.fontSize * 0.3,
        xScale: radius,
        yScale: radius,
        color: bulletRgb,
        opacity: el.opacity,
      });
    } else if (el.bulletStyle === 'circle') {
      const radius = el.fontSize * 0.18;
      page.drawEllipse({
        x: bulletCenterX,
        y: pdfY + el.fontSize * 0.3,
        xScale: radius,
        yScale: radius,
        borderColor: bulletRgb,
        borderWidth: 1,
        opacity: el.opacity,
      });
    } else if (el.bulletStyle === 'square') {
      const s = el.fontSize * 0.3;
      page.drawRectangle({
        x: bulletCenterX - s / 2,
        y: pdfY + el.fontSize * 0.15,
        width: s,
        height: s,
        color: bulletRgb,
        opacity: el.opacity,
      });
    } else if (el.bulletStyle === 'decimal') {
      page.drawText(sanitizeForWinAnsi(`${i + 1}.`), {
        x: startX,
        y: pdfY,
        size: el.fontSize,
        font,
        color: bulletRgb,
        opacity: el.opacity,
      });
    }

    // Word-wrap item text and draw each line
    const lines = wrapText(sanitizeForWinAnsi(item), availWidth, font, el.fontSize);
    lines.forEach((line, li) => {
      const linePdfY = canvasToPdfY(canvasY + li * itemLineH, el.fontSize, pageHeight);
      page.drawText(line, {
        x: textX,
        y: linePdfY,
        size: el.fontSize,
        font,
        color: textColor,
        opacity: el.opacity,
      });
    });

    canvasY += lines.length * itemLineH + el.gap;
  });
}

function wrapText(text: string, maxWidth: number, font: PDFFont, size: number): string[] {
  if (!text.trim()) return [''];
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}
