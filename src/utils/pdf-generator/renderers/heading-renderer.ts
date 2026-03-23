import type { PDFPage, PDFFont } from 'pdf-lib';
import { rgb } from 'pdf-lib';
import type { HeadingElement } from '../../../store/pdf-editor/types/elements';
import { canvasToPdfY } from '../utils/coordinates';
import { hexToRgb } from '../utils/color';
import { sanitizeForWinAnsi } from '../utils/sanitize-text';
import { STANDARD_PDF_FONTS } from '../../../constants/fonts';

function wrapLine(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const measure = (s: string) => font.widthOfTextAtSize(s, fontSize);
  if (measure(text) <= maxWidth) return [text];

  const breakToken = (token: string, prefix: string): string[] => {
    const out: string[] = [];
    let current = prefix;
    for (const ch of token) {
      const candidate = current + ch;
      if (measure(candidate) <= maxWidth) {
        current = candidate;
      } else {
        if (current) out.push(current);
        current = ch;
      }
    }
    if (current) out.push(current);
    return out;
  };

  const words = text.split(' ');
  const wrapped: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate) <= maxWidth) {
      current = candidate;
    } else if (measure(word) <= maxWidth) {
      if (current) wrapped.push(current);
      current = word;
    } else {
      const broken = breakToken(word, current ? `${current} ` : '');
      wrapped.push(...broken.slice(0, -1));
      current = broken[broken.length - 1] ?? '';
    }
  }
  if (current) wrapped.push(current);
  return wrapped.length > 0 ? wrapped : [text];
}

export function renderHeading(page: PDFPage, el: HeadingElement, font: PDFFont, boldFont: PDFFont): void {
  const pageHeight = page.getHeight();
  const { r, g, b } = hexToRgb(el.fontColor);
  const color = rgb(r, g, b);

  if (el.backgroundColor && el.backgroundColor !== 'transparent') {
    const { r: br, g: bg, b: bb } = hexToRgb(el.backgroundColor);
    const bgY = canvasToPdfY(el.position.y, el.height, pageHeight);
    page.drawRectangle({ x: el.position.x, y: bgY, width: el.width, height: el.height, color: rgb(br, bg, bb) });
  }

  const innerW = el.width - el.padding * 2;
  const lineHeightPx = el.fontSize * 1.2;

  const safeContent = STANDARD_PDF_FONTS.has(el.fontFamily)
    ? sanitizeForWinAnsi(el.content)
    : el.content;

  const visualLines: string[] = [];
  for (const contentLine of safeContent.split('\n')) {
    visualLines.push(...wrapLine(contentLine, boldFont, el.fontSize, innerW));
  }

  const totalTextHeight = visualLines.length * lineHeightPx;

  let startY: number;
  if (el.verticalAlign === 'bottom') {
    startY = el.position.y + el.height - el.padding - totalTextHeight;
  } else if (el.verticalAlign === 'middle') {
    startY = el.position.y + (el.height - totalTextHeight) / 2;
  } else {
    startY = el.position.y + el.padding;
  }

  visualLines.forEach((line, i) => {
    const textY = canvasToPdfY(
      startY + i * lineHeightPx,
      el.fontSize,
      pageHeight,
    );
    const textWidth = boldFont.widthOfTextAtSize(line, el.fontSize);

    let x = el.position.x + el.padding;
    if (el.textAlign === 'center') {
      x = el.position.x + (el.width - Math.min(textWidth, innerW)) / 2;
    } else if (el.textAlign === 'right') {
      x = el.position.x + el.width - el.padding - Math.min(textWidth, innerW);
    }

    if (line) {
      page.drawText(line, {
        x,
        y: textY,
        size: el.fontSize,
        font: boldFont,
        color,
        opacity: el.opacity,
      });

      if (el.underline) {
        page.drawLine({ start: { x, y: textY - 2 }, end: { x: x + textWidth, y: textY - 2 }, thickness: 1, color });
      }
    }
  });
}
