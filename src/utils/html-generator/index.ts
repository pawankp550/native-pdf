import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import type { Page, BasePdfState } from '../../store/pdf-editor/types/state';
import type {
  CanvasElement, TextElement, HeadingElement, LineElement, RectangleElement,
  CircleElement, CheckboxElement, TableElement, SignatureElement, SignaturePadElement,
  ImageElement, PageNumberElement, QrCodeElement, DateElement, LinkElement,
  BarcodeElement, RadioElement,
} from '../../store/pdf-editor/types/elements';
import { formatDate, parseIsoDate } from '../date-format';

export async function generateHtml(
  pages: Page[],
  elements: Record<string, CanvasElement>,
  basePdf?: BasePdfState | null,
): Promise<string> {
  const sorted = [...pages].sort((a, b) => a.order - b.order);
  const totalPages = sorted.length;

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
      } catch { /* skip */ }
    }),
  );

  const barcodeEls = Object.values(elements).filter(
    (e): e is BarcodeElement => e.type === 'barcode' && !!e.value.trim(),
  );
  const barcodeDataUrls = new Map<string, string>();
  for (const el of barcodeEls) {
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, el.value, {
        format: el.format,
        lineColor: el.lineColor,
        background: el.background,
        displayValue: el.displayValue,
        fontSize: el.fontSize,
        margin: el.margin,
        width: 2,
        height: el.height - (el.displayValue ? el.fontSize + el.margin * 2 + 4 : el.margin * 2),
      });
      const out = document.createElement('canvas');
      out.width = Math.round(el.width);
      out.height = Math.round(el.height);
      out.getContext('2d')!.drawImage(canvas, 0, 0, out.width, out.height);
      barcodeDataUrls.set(el.id, out.toDataURL('image/png'));
    } catch { /* skip */ }
  }

  const pagesHtml = sorted.map((page, pageIdx) => {
    const pageEls = Object.values(elements)
      .filter(e => e.pageId === page.id && e.visible !== false)
      .sort((a, b) => a.zIndex - b.zIndex);

    const bgImage = basePdf?.pageImages?.[pageIdx]
      ? `background-image:url('${basePdf.pageImages[pageIdx]}');background-size:100% 100%;background-repeat:no-repeat;`
      : '';

    const elementsHtml = pageEls
      .map(el => renderElement(el, pageIdx + 1, totalPages, qrDataUrls, barcodeDataUrls))
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

function renderElement(
  el: CanvasElement,
  pageNumber: number,
  totalPages: number,
  qrDataUrls: Map<string, string>,
  barcodeDataUrls: Map<string, string>,
): string {
  if (el.visible === false) return '';
  const base = baseStyle(el);
  switch (el.type) {
    case 'text':          return renderText(el, base);
    case 'heading':       return renderHeading(el, base);
    case 'line':          return renderLine(el, base);
    case 'rectangle':     return renderRectangle(el, base);
    case 'circle':        return renderCircle(el, base);
    case 'checkbox':      return renderCheckbox(el, base);
    case 'table':         return renderTable(el, base);
    case 'signature':     return renderSignature(el, base);
    case 'signature-pad': return renderSignaturePad(el, base);
    case 'image':         return renderImage(el, base);
    case 'page-number':   return renderPageNumber(el, base, pageNumber, totalPages);
    case 'qr-code':       return renderQrCode(el, base, qrDataUrls);
    case 'date':          return renderDate(el, base);
    case 'link':          return renderLink(el, base);
    case 'barcode':       return renderBarcode(el, base, barcodeDataUrls);
    case 'radio':         return renderRadio(el as RadioElement, base);
    default:              return '';
  }
}

function baseStyle(el: CanvasElement): string {
  const rot = el.rotate ? `transform:rotate(${el.rotate}deg);transform-origin:center center;` : '';
  const op = el.opacity != null && el.opacity !== 1 ? `opacity:${el.opacity};` : '';
  return `left:${el.position.x}px;top:${el.position.y}px;width:${el.width}px;height:${el.height}px;${rot}${op}`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/\n/g, '<br/>');
}

function renderText(el: TextElement, base: string): string {
  const hasLink = !!el.url?.trim();
  const td = [(el.underline || hasLink) ? 'underline' : '', el.strikethrough ? 'line-through' : ''].filter(Boolean).join(' ') || 'none';
  const ls = el.letterSpacing ? `letter-spacing:${el.letterSpacing}px;` : '';
  const tt = el.textTransform && el.textTransform !== 'none' ? `text-transform:${el.textTransform};` : '';
  const color = hasLink ? '#2563eb' : el.fontColor;
  const style = `${base}font-size:${el.fontSize}px;font-family:${el.fontFamily},Helvetica,sans-serif;font-weight:${el.fontWeight};font-style:${el.fontStyle};color:${color};text-align:${el.textAlign};line-height:${el.lineHeight};text-decoration:${td};${ls}${tt}background:${el.backgroundColor};padding:${el.padding}px;white-space:pre-wrap;word-break:break-word;`;
  if (hasLink) return `<a class="el" href="${el.url}" target="_blank" rel="noopener noreferrer" style="${style}">${esc(el.content)}</a>`;
  return `<div class="el" style="${style}">${esc(el.content)}</div>`;
}

function renderHeading(el: HeadingElement, base: string): string {
  const td = el.underline ? 'underline' : 'none';
  const va = el.verticalAlign === 'middle' ? 'center' : el.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start';
  const style = `${base}display:flex;align-items:${va};font-size:${el.fontSize}px;font-family:${el.fontFamily},Helvetica,sans-serif;font-weight:bold;color:${el.fontColor};text-align:${el.textAlign};text-decoration:${td};background:${el.backgroundColor};padding:${el.padding}px;white-space:pre-wrap;word-break:break-word;`;
  return `<div class="el" style="${style}"><h${el.level} style="margin:0;font:inherit;width:100%;">${esc(el.content)}</h${el.level}></div>`;
}

function renderLine(el: LineElement, base: string): string {
  const dashStyle = el.dashArray.length ? 'dashed' : 'solid';
  return `<div class="el" style="${base}border-top:${el.strokeWidth}px ${dashStyle} ${el.strokeColor};height:${el.strokeWidth}px;"></div>`;
}

function renderRectangle(el: RectangleElement, base: string): string {
  const fill = el.transparent ? 'transparent' : `${el.fillColor}${opacityToHex(el.fillOpacity)}`;
  return `<div class="el" style="${base}background:${fill};border:${el.strokeWidth}px solid ${el.strokeColor};border-radius:${el.cornerRadius}px;"></div>`;
}

function renderCircle(el: CircleElement, base: string): string {
  const fill = el.transparent ? 'transparent' : `${el.fillColor}${opacityToHex(el.fillOpacity)}`;
  return `<div class="el" style="${base}background:${fill};border:${el.strokeWidth}px solid ${el.strokeColor};border-radius:50%;"></div>`;
}

function renderCheckbox(el: CheckboxElement, base: string): string {
  const style = `${base}background:${el.fillColor};border:${el.strokeWidth}px solid ${el.strokeColor};border-radius:${el.cornerRadius}px;display:flex;align-items:center;justify-content:center;`;
  let inner = '';
  if (el.checked) {
    if (el.checkStyle === 'filled') inner = `<div style="width:60%;height:60%;background:${el.checkColor};border-radius:2px;"></div>`;
    else if (el.checkStyle === 'cross') inner = `<span style="color:${el.checkColor};font-size:${el.width * 0.6}px;line-height:1;font-weight:bold;">✕</span>`;
    else inner = `<span style="color:${el.checkColor};font-size:${el.width * 0.65}px;line-height:1;font-weight:bold;">✓</span>`;
  }
  return `<div class="el" style="${style}">${inner}</div>`;
}

function renderTable(el: TableElement, base: string): string {
  const hs = el.headerStyle;
  const bs = el.bodyStyle;
  const thStyle = `background:${hs.bg};color:${hs.textColor};font-size:${hs.fontSize}px;font-weight:${hs.fontWeight};text-align:${hs.textAlign};border:${el.borderWidth}px solid ${el.borderColor};padding:4px 6px;`;
  const tdStyleBase = `background:${bs.bg};color:${bs.textColor};font-size:${bs.fontSize}px;font-weight:${bs.fontWeight};text-align:${bs.textAlign};border:${el.borderWidth}px solid ${el.borderColor};padding:4px 6px;vertical-align:${bs.verticalAlign};`;
  const colDefs = el.columns.map(c => `<col style="width:${c.width}px;">`).join('');
  const header = el.showHeader ? `<thead><tr>${el.columns.map(c => `<th style="${thStyle}">${esc(c.label)}</th>`).join('')}</tr></thead>` : '';
  const bodyRows = (el.data ?? []).map((row, ri) => {
    const h = el.rowHeights[ri] ?? 28;
    return `<tr style="height:${h}px;">${row.slice(0, el.columns.length).map(cell => `<td style="${tdStyleBase}">${esc(cell ?? '')}</td>`).join('')}</tr>`;
  }).join('');
  return `<table class="el" style="${base}border-collapse:collapse;"><colgroup>${colDefs}</colgroup>${header}<tbody>${bodyRows}</tbody></table>`;
}

function renderSignature(el: SignatureElement, base: string): string {
  const style = `${base}display:flex;flex-direction:column;justify-content:flex-end;padding:4px 6px;`;
  return `<div class="el" style="${style}"><div style="height:${el.lineWidth}px;background:${el.lineColor};margin-bottom:4px;"></div><span style="font-size:${el.labelFontSize}px;color:${el.lineColor};">${esc(el.label)}</span></div>`;
}

function renderSignaturePad(el: SignaturePadElement, base: string): string {
  const style = `${base}background:${el.backgroundColor};border:${el.borderWidth}px solid ${el.borderColor};`;
  if (el.dataUrl) return `<div class="el" style="${style}"><img src="${el.dataUrl}" style="width:100%;height:100%;object-fit:contain;" /></div>`;
  return `<div class="el" style="${style};display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:11px;">Signature</div>`;
}

function renderImage(el: ImageElement, base: string): string {
  if (!el.src) return `<div class="el" style="${base}background:#f3f4f6;border:2px dashed #d1d5db;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:11px;">Image</div>`;
  return `<div class="el" style="${base}"><img src="${el.src}" style="width:100%;height:100%;object-fit:${el.objectFit};" /></div>`;
}

function renderPageNumber(el: PageNumberElement, base: string, pageNumber: number, totalPages: number): string {
  const text = (el.format ?? 'Page {n} of {total}').replace(/\{n\}/g, String(pageNumber)).replace(/\{total\}/g, String(totalPages));
  const style = `${base}font-size:${el.fontSize}px;font-family:${el.fontFamily},Helvetica,sans-serif;font-weight:${el.fontWeight};color:${el.fontColor};text-align:${el.textAlign};background:${el.backgroundColor};padding:${el.padding}px;display:flex;align-items:center;`;
  return `<div class="el" style="${style}"><span style="width:100%">${esc(text)}</span></div>`;
}

function renderQrCode(el: QrCodeElement, base: string, qrDataUrls: Map<string, string>): string {
  const style = `${base}background:${el.bgColor};display:flex;align-items:center;justify-content:center;`;
  const dataUrl = qrDataUrls.get(el.id);
  if (!dataUrl) return `<div class="el" style="${style};color:#9ca3af;font-size:11px;">QR Code</div>`;
  return `<div class="el" style="${style}"><img src="${dataUrl}" style="max-width:100%;max-height:100%;" /></div>`;
}

function renderLink(el: LinkElement, base: string): string {
  const label = el.label || el.url;
  const style = `${base}font-size:${el.fontSize}px;font-family:${el.fontFamily},Helvetica,sans-serif;color:${el.fontColor};text-align:${el.textAlign};text-decoration:underline;padding:${el.padding}px;display:flex;align-items:center;cursor:pointer;`;
  const href = el.url?.trim() ? ` href="${el.url.trim()}" target="_blank" rel="noopener noreferrer"` : '';
  return `<a class="el"${href} style="${style}">${esc(label)}</a>`;
}

function renderDate(el: DateElement, base: string): string {
  const d = el.dateSource === 'fixed' && el.fixedDate ? parseIsoDate(el.fixedDate) : new Date();
  const text = el.format ? formatDate(d, el.format) : d.toLocaleDateString();
  const style = `${base}font-size:${el.fontSize}px;font-family:${el.fontFamily},Helvetica,sans-serif;font-weight:${el.fontWeight};color:${el.fontColor};text-align:${el.textAlign};background:${el.backgroundColor};padding:${el.padding}px;display:flex;align-items:center;`;
  return `<div class="el" style="${style}"><span style="width:100%">${esc(text)}</span></div>`;
}

function renderRadio(el: RadioElement, base: string): string {
  const circleSize = el.height;
  const innerSize = circleSize * 0.44;
  const flexDir = el.labelPosition === 'left' ? 'row-reverse' : 'row';
  const dotHtml = el.checked ? `<div style="width:${innerSize}px;height:${innerSize}px;border-radius:50%;background:${el.checkColor};"></div>` : '';
  const circleHtml = `<div style="width:${circleSize}px;height:${circleSize}px;border-radius:50%;border:${el.strokeWidth}px solid ${el.strokeColor};background:${el.fillColor};flex-shrink:0;display:flex;align-items:center;justify-content:center;box-sizing:border-box;">${dotHtml}</div>`;
  const labelHtml = el.label ? `<span style="font-size:${el.labelFontSize}px;color:${el.labelColor};line-height:1.2;">${esc(el.label)}</span>` : '';
  return `<div class="el" style="${base}display:flex;flex-direction:${flexDir};align-items:center;gap:6px;">${circleHtml}${labelHtml}</div>`;
}

function renderBarcode(el: BarcodeElement, base: string, barcodeDataUrls: Map<string, string>): string {
  const style = `${base}background:${el.background};display:flex;align-items:center;justify-content:center;`;
  const dataUrl = barcodeDataUrls.get(el.id);
  if (!dataUrl) return `<div class="el" style="${style};color:#9ca3af;font-size:11px;border:2px dashed #d1d5db;">Barcode</div>`;
  return `<div class="el" style="${style}"><img src="${dataUrl}" style="width:100%;height:100%;" /></div>`;
}

function opacityToHex(opacity: number): string {
  if (opacity >= 1) return '';
  return Math.round(opacity * 255).toString(16).padStart(2, '0');
}
