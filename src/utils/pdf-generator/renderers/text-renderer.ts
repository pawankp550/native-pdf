import type { PDFPage, PDFFont } from 'pdf-lib';
import { rgb } from 'pdf-lib';
import type { TextElement } from '../../../store/pdf-editor/types/elements';
import { canvasToPdfY } from '../utils/coordinates';
import { hexToRgb } from '../utils/color';

export async function renderText(page: PDFPage, el: TextElement, font: PDFFont, boldFont: PDFFont): Promise<void> {
  const pageHeight = page.getHeight();
  const { r, g, b } = hexToRgb(el.fontColor);
  const color = rgb(r, g, b);
  const lines = el.content.split('\n');
  const lineHeightPx = el.fontSize * el.lineHeight;

  // Background
  if (el.backgroundColor && el.backgroundColor !== 'transparent') {
    const { r: br, g: bg, b: bb } = hexToRgb(el.backgroundColor);
    const pdfY = canvasToPdfY(el.position.y, el.height, pageHeight);
    page.drawRectangle({
      x: el.position.x,
      y: pdfY,
      width: el.width,
      height: el.height,
      color: rgb(br, bg, bb),
    });
  }

  lines.forEach((line, i) => {
    const textY = canvasToPdfY(
      el.position.y + el.padding + i * lineHeightPx,
      el.fontSize,
      pageHeight
    );
    const usedFont = el.fontWeight === 'bold' ? boldFont : font;
    let x = el.position.x + el.padding;
    if (el.textAlign === 'center') {
      const textWidth = usedFont.widthOfTextAtSize(line, el.fontSize);
      const innerW = el.width - el.padding * 2;
      x = el.position.x + el.padding + (innerW - Math.min(textWidth, innerW)) / 2;
    } else if (el.textAlign === 'right') {
      const textWidth = usedFont.widthOfTextAtSize(line, el.fontSize);
      x = el.position.x + el.width - el.padding - textWidth;
    }
    page.drawText(line, { x, y: textY, size: el.fontSize, font: usedFont, color, opacity: el.opacity });

    // Underline
    if (el.underline) {
      const textWidth = usedFont.widthOfTextAtSize(line, el.fontSize);
      page.drawLine({ start: { x, y: textY - 2 }, end: { x: x + textWidth, y: textY - 2 }, thickness: 1, color });
    }
    // Strikethrough
    if (el.strikethrough) {
      const textWidth = usedFont.widthOfTextAtSize(line, el.fontSize);
      const midY = textY + el.fontSize / 2;
      page.drawLine({ start: { x, y: midY }, end: { x: x + textWidth, y: midY }, thickness: 1, color });
    }
  });
}
