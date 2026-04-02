import { nanoid } from '@reduxjs/toolkit';
import type {
  CanvasElement, ElementType,
  DateElement, HeadingElement, SignaturePadElement,
  LinkElement, BarcodeElement, RadioElement, BulletListElement,
} from '@/store/pdf-editor/types/elements';
import { todayIso } from '@/utils/date-format';

export function createDefaultElement(type: ElementType, x: number, y: number, pageId: string): CanvasElement {
  const base = {
    id: nanoid(),
    name: type.charAt(0).toUpperCase() + type.slice(1),
    pageId,
    position: { x, y },
    rotate: 0,
    opacity: 1,
    zIndex: 0,
    locked: false,
    visible: true,
  };

  switch (type) {
    case 'text':
      return { ...base, type: 'text', width: 200, height: 40, content: 'Text', fontSize: 14, fontFamily: 'Helvetica', fontWeight: '400', fontStyle: 'normal', fontColor: '#000000', textAlign: 'left', lineHeight: 1.4, letterSpacing: 0, textTransform: 'none', underline: false, strikethrough: false, backgroundColor: 'transparent', padding: 4, url: '' };
    case 'line':
      return { ...base, type: 'line', width: 150, height: 4, strokeColor: '#000000', strokeWidth: 2, dashArray: [], lineCap: 'butt' };
    case 'rectangle':
      return { ...base, type: 'rectangle', width: 120, height: 80, fillColor: '#e5e7eb', fillOpacity: 1, strokeColor: '#6b7280', strokeWidth: 1, cornerRadius: 0, transparent: true };
    case 'circle':
      return { ...base, type: 'circle', width: 80, height: 80, fillColor: '#e5e7eb', fillOpacity: 1, strokeColor: '#6b7280', strokeWidth: 1, transparent: true };
    case 'checkbox':
      return { ...base, type: 'checkbox', width: 20, height: 20, checked: false, checkStyle: 'check', fillColor: '#ffffff', checkColor: '#000000', strokeColor: '#000000', strokeWidth: 1.5, cornerRadius: 2 };
    case 'table':
      return {
        ...base, type: 'table', width: 301, height: 120,
        columns: [{ id: nanoid(), label: 'Column 1', width: 100 }, { id: nanoid(), label: 'Column 2', width: 100 }, { id: nanoid(), label: 'Column 3', width: 100 }],
        rowHeights: [28, 24, 24],
        headerStyle: { bg: '#f3f4f6', textColor: '#111827', fontSize: 12, fontWeight: 'bold', borderColor: '#d1d5db', textAlign: 'left', verticalAlign: 'middle' },
        bodyStyle: { bg: '#ffffff', textColor: '#374151', fontSize: 11, fontWeight: 'normal', borderColor: '#d1d5db', textAlign: 'left', verticalAlign: 'middle' },
        data: [['', '', ''], ['', '', '']],
        showHeader: true,
        repeatHeaderOnPageBreak: true,
        borderWidth: 1,
        borderColor: '#d1d5db',
      };
    case 'signature':
      return { ...base, type: 'signature', width: 200, height: 60, label: 'Signature', showDate: true, showPrintedName: true, lineColor: '#000000', labelFontSize: 10, lineWidth: 1, style: 'line-only' };
    case 'image':
      return { ...base, type: 'image', width: 200, height: 150, src: '', objectFit: 'contain' };
    case 'page-number':
      return { ...base, type: 'page-number', width: 160, height: 28, format: 'Page {n} of {total}', fontSize: 11, fontFamily: 'Helvetica', fontWeight: 'normal', fontColor: '#374151', textAlign: 'center', backgroundColor: 'transparent', padding: 4 };
    case 'qr-code':
      return { ...base, type: 'qr-code', width: 120, height: 120, data: '', fgColor: '#000000', bgColor: '#ffffff', errorLevel: 'M', margin: 4 };
    case 'date':
      return {
        ...base, type: 'date', width: 180, height: 28,
        dateSource: 'today', fixedDate: todayIso(),
        format: 'MMMM DD, YYYY',
        fontSize: 12, fontFamily: 'Helvetica', fontWeight: 'normal',
        fontColor: '#111827', textAlign: 'left',
        backgroundColor: 'transparent', padding: 4,
      } satisfies DateElement;
    case 'heading':
      return {
        ...base, type: 'heading', width: 300, height: 44,
        level: 1, content: 'Heading',
        fontSize: 32, fontFamily: 'Helvetica',
        fontColor: '#111827', textAlign: 'left', verticalAlign: 'top',
        backgroundColor: 'transparent', padding: 4, underline: false,
      } satisfies HeadingElement;
    case 'signature-pad':
      return {
        ...base, type: 'signature-pad', width: 240, height: 100,
        dataUrl: '', penColor: '#000000', penWidth: 2,
        backgroundColor: '#ffffff', borderColor: '#d1d5db', borderWidth: 1,
      } satisfies SignaturePadElement;
    case 'link':
      return {
        ...base, type: 'link', width: 160, height: 28,
        label: 'Link', url: '',
        fontSize: 13, fontFamily: 'Helvetica',
        fontColor: '#2563eb', textAlign: 'left', padding: 4,
      } satisfies LinkElement;
    case 'barcode':
      return {
        ...base, type: 'barcode', width: 200, height: 80,
        value: '123456789', format: 'CODE128',
        displayValue: true, lineColor: '#000000',
        background: '#ffffff', fontSize: 12, margin: 4,
      } satisfies BarcodeElement;
    case 'radio':
      return {
        ...base, type: 'radio', width: 160, height: 20,
        checked: false, label: 'Option',
        labelPosition: 'right', labelFontSize: 13,
        labelColor: '#111827', fillColor: '#ffffff',
        strokeColor: '#6b7280', strokeWidth: 1.5, checkColor: '#2563eb',
      } satisfies RadioElement;
    case 'bullet-list':
      return {
        ...base, type: 'bullet-list', width: 200, height: 120,
        items: ['Item 1', 'Item 2', 'Item 3'],
        bulletStyle: 'disc',
        fontSize: 13, fontFamily: 'Helvetica',
        fontColor: '#111827', fontWeight: 'normal',
        lineHeight: 1.4, indentSize: 20,
        bulletColor: '#111827', backgroundColor: 'transparent',
        padding: 4, gap: 4,
      } satisfies BulletListElement;
  }
}
