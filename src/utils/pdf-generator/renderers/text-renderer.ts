import type { PDFPage, PDFFont } from 'pdf-lib';
import { rgb, PDFName, PDFString, PDFArray } from 'pdf-lib';
import type { TextElement } from '../../../store/pdf-editor/types/elements';
import { canvasToPdfY } from '../utils/coordinates';
import { hexToRgb } from '../utils/color';
import { sanitizeForWinAnsi } from '../utils/sanitize-text';
import { STANDARD_PDF_FONTS } from '../../../constants/fonts';

function wrapLine(text: string, font: PDFFont, fontSize: number, maxWidth: number, charSpace: number): string[] {
  const measure = (s: string) =>
    font.widthOfTextAtSize(s, fontSize) + charSpace * Math.max(0, s.length - 1);

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

  const tokens = text.split(/( +)/);  // e.g. "  hi world" → ['', '  ', 'hi', ' ', 'world']
  const wrapped: string[] = [];
  let current = '';

  for (let ti = 0; ti < tokens.length; ti++) {
    const token = tokens[ti];
    if (ti % 2 === 1) {
      current += token;
      continue;
    }
    if (token === '') continue;
    const candidate = current + token;
    if (measure(candidate) <= maxWidth) {
      current = candidate;
    } else {
      const flushed = current.trimEnd();
      if (measure(token) <= maxWidth) {
        if (flushed) wrapped.push(flushed);
        current = token;
      } else {
        const broken = breakToken(token, current);
        wrapped.push(...broken.slice(0, -1));
        current = broken[broken.length - 1] ?? '';
      }
    }
  }
  const flushed = current.trimEnd();
  if (flushed) wrapped.push(flushed);
  return wrapped.length > 0 ? wrapped : [text];
}

export async function renderText(page: PDFPage, el: TextElement, font: PDFFont, boldFont: PDFFont): Promise<void> {
  const pageHeight = page.getHeight();
  const { r, g, b } = hexToRgb(el.fontColor);
  const color = rgb(r, g, b);
  const lineHeightPx = el.fontSize * el.lineHeight;
  const innerW = el.width - el.padding * 2;
  const usedFont = Number(el.fontWeight) >= 700 ? boldFont : font;
  const charSpace = el.letterSpacing || 0;

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

  const applyTransform = (s: string): string => {
    if (!el.textTransform || el.textTransform === 'none') return s;
    if (el.textTransform === 'uppercase') return s.toUpperCase();
    if (el.textTransform === 'lowercase') return s.toLowerCase();
    if (el.textTransform === 'capitalize') return s.replace(/\b\w/g, c => c.toUpperCase());
    return s;
  };

  const safeContent = STANDARD_PDF_FONTS.has(el.fontFamily)
    ? sanitizeForWinAnsi(el.content)
    : el.content;

  const visualLines: string[] = [];
  for (const contentLine of safeContent.split('\n')) {
    const transformed = applyTransform(contentLine);
    const wrapped = wrapLine(transformed, usedFont, el.fontSize, innerW, charSpace);
    visualLines.push(...wrapped);
  }

  visualLines.forEach((line, i) => {
    const textY = canvasToPdfY(
      el.position.y + el.padding + i * lineHeightPx,
      el.fontSize,
      pageHeight
    );
    let x = el.position.x + el.padding;
    if (el.textAlign === 'center') {
      const textWidth = usedFont.widthOfTextAtSize(line, el.fontSize);
      x = el.position.x + el.padding + (innerW - Math.min(textWidth, innerW)) / 2;
    } else if (el.textAlign === 'right') {
      const textWidth = usedFont.widthOfTextAtSize(line, el.fontSize);
      x = el.position.x + el.width - el.padding - textWidth;
    }
    page.drawText(line, { x, y: textY, size: el.fontSize, font: usedFont, color, opacity: el.opacity });

    const spacingExtra = charSpace * Math.max(0, line.length - 1);

    if (el.underline) {
      const textWidth = usedFont.widthOfTextAtSize(line, el.fontSize) + spacingExtra;
      page.drawLine({ start: { x, y: textY - 2 }, end: { x: x + textWidth, y: textY - 2 }, thickness: 1, color });
    }
    if (el.strikethrough) {
      const textWidth = usedFont.widthOfTextAtSize(line, el.fontSize) + spacingExtra;
      const midY = textY + el.fontSize * 0.35;
      page.drawLine({ start: { x, y: midY }, end: { x: x + textWidth, y: midY }, thickness: 1, color });
    }
  });

  if (el.url?.trim()) {
    const pdfY = canvasToPdfY(el.position.y, el.height, page.getHeight());
    const { context } = page.doc;
    const linkAnnot = context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: context.obj([el.position.x, pdfY, el.position.x + el.width, pdfY + el.height]),
      Border: context.obj([0, 0, 0]),
      A: context.obj({
        S: 'URI',
        URI: PDFString.of(el.url),
      }),
    });
    const linkRef = context.register(linkAnnot);
    const annots = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
    if (annots) {
      annots.push(linkRef);
    } else {
      page.node.set(PDFName.of('Annots'), context.obj([linkRef]));
    }
  }
}
