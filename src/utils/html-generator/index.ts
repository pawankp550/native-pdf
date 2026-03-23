import QRCode from 'qrcode';
import type { Page, BasePdfState } from '../../store/pdf-editor/types/state';
import type {
  CanvasElement,
  TextElement,
  HeadingElement,
  LineElement,
  RectangleElement,
  CircleElement,
  CheckboxElement,
  TableElement,
  SignatureElement,
  SignaturePadElement,
  ImageElement,
  PageNumberElement,
  QrCodeElement,
  DateElement,
  LinkElement,
} from '../../store/pdf-editor/types/elements';
import { formatDate, parseIsoDate } from '../date-format';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generateHtml(
  pages: Page[],
  elements: Record<string, CanvasElement>,
  basePdf?: BasePdfState | null,
): Promise<string> {
  const sorted = [...pages].sort((a, b) => a.order - b.order);
  const totalPages = sorted.length;

  // Pre-generate QR code data URLs (async, so collect first)
  const qrEls = Object.values(elements).filter(
    (e): e is QrCodeElement => e.type === 'qr-code' && !!e.data,
  );
  const qrDataUrls = new Map<string, string>();
  await Promise.all(
    qrEls.map(async el => {
      try {
        const url = await QRCode.toDataURL(el.data, {
          width: Math.min(el.width, el.height, 300),
          margin: el.margin,
          errorCorrectionLevel: el.errorLevel,
          color: { dark: el.fgColor, light: el.bgColor },
        });
        qrDataUrls.set(el.id, url);
      } catch {
        // silently skip invalid QR data
      }
    }),
  );

  const pagesHtml = sorted.map((page, pageIdx) => {
    const pageEls = Object.values(elements)
      .filter(e => e.pageId === page.id && e.visible !== false)
      .sort((a, b) => a.zIndex - b.zIndex);

    const bgImage =
      basePdf?.pageImages?.[pageIdx]
        ? `background-image:url('${basePdf.pageImages[pageIdx]}');background-size:100% 100%;background-repeat:no-repeat;`
        : '';

    const elementsHtml = pageEls
      .map(el => renderElement(el, pageIdx + 1, totalPages, qrDataUrls))
      .join('\n    ');

    return `
  <div class="page" style="width:${page.width}px;height:${page.height}px;background-color:${page.backgroundColor};${bgImage}">
    ${elementsHtml}
  </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Preview</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{background:#e5e7eb;padding:32px;font-family:Helvetica,Arial,sans-serif;}
    .page{position:relative;margin:0 auto 32px;box-shadow:0 4px 20px rgba(0,0,0,.18);overflow:hidden;}
    .el{position:absolute;overflow:hidden;}
  </style>
</head>
<body>
${pagesHtml}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Per-element renderer
// ---------------------------------------------------------------------------

function renderElement(
  el: CanvasElement,
  pageNumber: number,
  totalPages: number,
  qrDataUrls: Map<string, string>,
): string {
  if (el.visible === false) return '';

  const base = baseStyle(el);

  switch (el.type) {
    case 'text':     return renderText(el, base);
    case 'heading':  return renderHeading(el, base);
    case 'line':     return renderLine(el, base);
    case 'rectangle': return renderRectangle(el, base);
    case 'circle':   return renderCircle(el, base);
    case 'checkbox': return renderCheckbox(el, base);
    case 'table':    return renderTable(el, base);
    case 'signature': return renderSignature(el, base);
    case 'signature-pad': return renderSignaturePad(el, base);
    case 'image':    return renderImage(el, base);
    case 'page-number': return renderPageNumber(el, base, pageNumber, totalPages);
    case 'qr-code':  return renderQrCode(el, base, qrDataUrls);
    case 'date':     return renderDate(el, base);
    case 'link':     return renderLink(el, base);
    default:         return '';
  }
}

function baseStyle(el: CanvasElement): string {
  const rot = el.rotate ? `transform:rotate(${el.rotate}deg);transform-origin:center center;` : '';
  const op = el.opacity != null && el.opacity !== 1 ? `opacity:${el.opacity};` : '';
  return `left:${el.position.x}px;top:${el.position.y}px;width:${el.width}px;height:${el.height}px;${rot}${op}`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br/>');
}

// ---------------------------------------------------------------------------
// Element renderers
// ---------------------------------------------------------------------------

function renderText(el: TextElement, base: string): string {
  const hasLink = !!el.url?.trim();
  const td = [
    (el.underline || hasLink) ? 'underline' : '',
    el.strikethrough ? 'line-through' : '',
  ].filter(Boolean).join(' ') || 'none';
  const ls = el.letterSpacing ? `letter-spacing:${el.letterSpacing}px;` : '';
  const tt = el.textTransform && el.textTransform !== 'none' ? `text-transform:${el.textTransform};` : '';
  const color = hasLink ? '#2563eb' : el.fontColor;
  const cursor = hasLink ? 'cursor:pointer;' : '';
  const style = `${base}
    font-size:${el.fontSize}px;
    font-family:${el.fontFamily},Helvetica,sans-serif;
    font-weight:${el.fontWeight};
    font-style:${el.fontStyle};
    color:${color};
    text-align:${el.textAlign};
    line-height:${el.lineHeight};
    text-decoration:${td};${ls}${tt}${cursor}
    background:${el.backgroundColor};
    padding:${el.padding}px;
    white-space:pre-wrap;word-break:break-word;`;
  if (hasLink) {
    return `<a class="el" href="${el.url}" target="_blank" rel="noopener noreferrer" style="${style}">${esc(el.content)}</a>`;
  }
  return `<div class="el" style="${style}">${esc(el.content)}</div>`;
}

function renderHeading(el: HeadingElement, base: string): string {
  const td = el.underline ? 'underline' : 'none';
  const va = el.verticalAlign === 'middle' ? 'center' : el.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start';
  const style = `${base}
    display:flex;align-items:${va};
    font-size:${el.fontSize}px;
    font-family:${el.fontFamily},Helvetica,sans-serif;
    font-weight:bold;
    color:${el.fontColor};
    text-align:${el.textAlign};
    text-decoration:${td};
    background:${el.backgroundColor};
    padding:${el.padding}px;
    white-space:pre-wrap;word-break:break-word;`;
  const tag = `h${el.level}` as const;
  return `<div class="el" style="${style}"><${tag} style="margin:0;font:inherit;width:100%;">${esc(el.content)}</${tag}></div>`;
}

function renderLine(el: LineElement, base: string): string {
  const dashStyle = el.dashArray.length ? 'dashed' : 'solid';
  const style = `${base}
    border-top:${el.strokeWidth}px ${dashStyle} ${el.strokeColor};
    height:${el.strokeWidth}px;`;
  return `<div class="el" style="${style}"></div>`;
}

function renderRectangle(el: RectangleElement, base: string): string {
  const fill = el.transparent ? 'transparent' : `${el.fillColor}${opacityToHex(el.fillOpacity)}`;
  const style = `${base}
    background:${fill};
    border:${el.strokeWidth}px solid ${el.strokeColor};
    border-radius:${el.cornerRadius}px;`;
  return `<div class="el" style="${style}"></div>`;
}

function renderCircle(el: CircleElement, base: string): string {
  const fill = el.transparent ? 'transparent' : `${el.fillColor}${opacityToHex(el.fillOpacity)}`;
  const style = `${base}
    background:${fill};
    border:${el.strokeWidth}px solid ${el.strokeColor};
    border-radius:50%;`;
  return `<div class="el" style="${style}"></div>`;
}

function renderCheckbox(el: CheckboxElement, base: string): string {
  const style = `${base}
    background:${el.fillColor};
    border:${el.strokeWidth}px solid ${el.strokeColor};
    border-radius:${el.cornerRadius}px;
    display:flex;align-items:center;justify-content:center;`;

  let inner = '';
  if (el.checked) {
    if (el.checkStyle === 'filled') {
      inner = `<div style="width:60%;height:60%;background:${el.checkColor};border-radius:2px;"></div>`;
    } else if (el.checkStyle === 'cross') {
      inner = `<span style="color:${el.checkColor};font-size:${el.width * 0.6}px;line-height:1;font-weight:bold;">✕</span>`;
    } else {
      inner = `<span style="color:${el.checkColor};font-size:${el.width * 0.65}px;line-height:1;font-weight:bold;">✓</span>`;
    }
  }
  return `<div class="el" style="${style}">${inner}</div>`;
}

function renderTable(el: TableElement, base: string): string {
  const colCount = el.columns.length;
  const hs = el.headerStyle;
  const bs = el.bodyStyle;

  const thStyle = `background:${hs.bg};color:${hs.textColor};font-size:${hs.fontSize}px;font-weight:${hs.fontWeight};text-align:${hs.textAlign};border:${el.borderWidth}px solid ${el.borderColor};padding:4px 6px;`;
  const tdStyleBase = `background:${bs.bg};color:${bs.textColor};font-size:${bs.fontSize}px;font-weight:${bs.fontWeight};text-align:${bs.textAlign};border:${el.borderWidth}px solid ${el.borderColor};padding:4px 6px;vertical-align:${bs.verticalAlign};`;

  const colDefs = el.columns.map(c => `<col style="width:${c.width}px;">`).join('');

  const header = el.showHeader
    ? `<thead><tr>${el.columns.map(c => `<th style="${thStyle}">${esc(c.label)}</th>`).join('')}</tr></thead>`
    : '';

  const bodyRows = (el.data ?? []).map((row, ri) => {
    const h = el.rowHeights[ri] ?? 28;
    return `<tr style="height:${h}px;">${row.slice(0, colCount).map(cell => `<td style="${tdStyleBase}">${esc(cell ?? '')}</td>`).join('')}</tr>`;
  }).join('');

  const tableStyle = `${base}border-collapse:collapse;`;
  return `<table class="el" style="${tableStyle}"><colgroup>${colDefs}</colgroup>${header}<tbody>${bodyRows}</tbody></table>`;
}

function renderSignature(el: SignatureElement, base: string): string {
  const style = `${base}
    display:flex;flex-direction:column;justify-content:flex-end;padding:4px 6px;`;
  const lineStyle = `height:${el.lineWidth}px;background:${el.lineColor};margin-bottom:4px;`;
  const labelStyle = `font-size:${el.labelFontSize}px;color:${el.lineColor};`;
  return `<div class="el" style="${style}">
    <div style="${lineStyle}"></div>
    <span style="${labelStyle}">${esc(el.label)}</span>
  </div>`;
}

function renderSignaturePad(el: SignaturePadElement, base: string): string {
  const style = `${base}
    background:${el.backgroundColor};
    border:${el.borderWidth}px solid ${el.borderColor};`;
  if (el.dataUrl) {
    return `<div class="el" style="${style}"><img src="${el.dataUrl}" style="width:100%;height:100%;object-fit:contain;" /></div>`;
  }
  return `<div class="el" style="${style};display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:11px;">Signature</div>`;
}

function renderImage(el: ImageElement, base: string): string {
  if (!el.src) {
    return `<div class="el" style="${base}background:#f3f4f6;border:2px dashed #d1d5db;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:11px;">Image</div>`;
  }
  return `<div class="el" style="${base}"><img src="${el.src}" style="width:100%;height:100%;object-fit:${el.objectFit};" /></div>`;
}

function renderPageNumber(el: PageNumberElement, base: string, pageNumber: number, totalPages: number): string {
  const text = (el.format ?? 'Page {n} of {total}')
    .replace(/\{n\}/g, String(pageNumber))
    .replace(/\{total\}/g, String(totalPages));
  const style = `${base}
    font-size:${el.fontSize}px;
    font-family:${el.fontFamily},Helvetica,sans-serif;
    font-weight:${el.fontWeight};
    color:${el.fontColor};
    text-align:${el.textAlign};
    background:${el.backgroundColor};
    padding:${el.padding}px;
    display:flex;align-items:center;`;
  return `<div class="el" style="${style}"><span style="width:100%">${esc(text)}</span></div>`;
}

function renderQrCode(el: QrCodeElement, base: string, qrDataUrls: Map<string, string>): string {
  const style = `${base}background:${el.bgColor};display:flex;align-items:center;justify-content:center;`;
  const dataUrl = qrDataUrls.get(el.id);
  if (!dataUrl) {
    return `<div class="el" style="${style};color:#9ca3af;font-size:11px;">QR Code</div>`;
  }
  return `<div class="el" style="${style}"><img src="${dataUrl}" style="max-width:100%;max-height:100%;" /></div>`;
}

function renderLink(el: LinkElement, base: string): string {
  const label = el.label || el.url;
  const style = `${base}
    font-size:${el.fontSize}px;
    font-family:${el.fontFamily},Helvetica,sans-serif;
    color:${el.fontColor};
    text-align:${el.textAlign};
    text-decoration:underline;
    padding:${el.padding}px;
    display:flex;align-items:center;cursor:pointer;`;
  const href = el.url?.trim() ? ` href="${el.url.trim()}" target="_blank" rel="noopener noreferrer"` : '';
  return `<a class="el"${href} style="${style}">${esc(label)}</a>`;
}

function renderDate(el: DateElement, base: string): string {
  const d = el.dateSource === 'fixed' && el.fixedDate
    ? parseIsoDate(el.fixedDate)
    : new Date();
  const text = el.format ? formatDate(d, el.format) : d.toLocaleDateString();
  const style = `${base}
    font-size:${el.fontSize}px;
    font-family:${el.fontFamily},Helvetica,sans-serif;
    font-weight:${el.fontWeight};
    color:${el.fontColor};
    text-align:${el.textAlign};
    background:${el.backgroundColor};
    padding:${el.padding}px;
    display:flex;align-items:center;`;
  return `<div class="el" style="${style}"><span style="width:100%">${esc(text)}</span></div>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function opacityToHex(opacity: number): string {
  if (opacity >= 1) return '';
  const hex = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return hex;
}
