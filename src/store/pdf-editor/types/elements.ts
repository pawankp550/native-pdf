export type ElementType =
    | 'text'
    | 'line'
    | 'rectangle'
    | 'circle'
    | 'checkbox'
    | 'table'
    | 'signature'
    | 'signature-pad'
    | 'image'
    | 'page-number'
    | 'qr-code'
    | 'date'
    | 'heading';

export interface BaseElement {
    id: string;
    name: string;
    type: ElementType;
    pageId: string;
    position: { x: number; y: number };
    width: number;
    height: number;
    rotate: number;
    opacity: number;
    zIndex: number;
    locked: boolean;
    visible: boolean;
}

export interface TextElement extends BaseElement {
    type: 'text';
    content: string;
    fontSize: number;
    fontFamily: 'Helvetica' | 'Times' | 'Courier';
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
    fontColor: string;
    textAlign: 'left' | 'center' | 'right';
    lineHeight: number;
    underline: boolean;
    strikethrough: boolean;
    backgroundColor: string;
    padding: number;
}

export interface LineElement extends BaseElement {
    type: 'line';
    strokeColor: string;
    strokeWidth: number;
    dashArray: number[];
    lineCap: 'butt' | 'round' | 'square';
}

export interface RectangleElement extends BaseElement {
    type: 'rectangle';
    fillColor: string;
    fillOpacity: number;
    strokeColor: string;
    strokeWidth: number;
    cornerRadius: number;
    transparent: boolean;
}

export interface CircleElement extends BaseElement {
    type: 'circle';
    fillColor: string;
    fillOpacity: number;
    strokeColor: string;
    strokeWidth: number;
    transparent: boolean;
}

export interface CheckboxElement extends BaseElement {
    type: 'checkbox';
    checked: boolean;
    checkStyle: 'check' | 'cross' | 'filled';
    fillColor: string;
    checkColor: string;
    strokeColor: string;
    strokeWidth: number;
    cornerRadius: number;
}

export interface TableColumn {
    id: string;
    label: string;
    width: number;
}

export interface CellStyle {
    bg: string;
    textColor: string;
    fontSize: number;
    fontWeight: 'normal' | 'bold';
    borderColor: string;
    textAlign: 'left' | 'center' | 'right';
    verticalAlign: 'top' | 'middle' | 'bottom';
}

export interface TableElement extends BaseElement {
    type: 'table';
    columns: TableColumn[];
    rowHeights: number[];
    headerStyle: CellStyle;
    bodyStyle: CellStyle;
    data: string[][];
    showHeader: boolean;
    repeatHeaderOnPageBreak: boolean;
    borderWidth: number;
    borderColor: string;
}

export interface SignatureElement extends BaseElement {
    type: 'signature';
    label: string;
    showDate: boolean;
    showPrintedName: boolean;
    lineColor: string;
    labelFontSize: number;
    lineWidth: number;
    style: 'line-only' | 'box' | 'formal';
}

export interface SignaturePadElement extends BaseElement {
    type: 'signature-pad';
    dataUrl: string;        // base64 PNG data URL of the drawn signature; empty when blank
    penColor: string;
    penWidth: number;
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
}

export interface ImageElement extends BaseElement {
    type: 'image';
    src: string; // base64 data URL, empty when no image selected
    objectFit: 'fill' | 'contain' | 'cover';
}

export interface PageNumberElement extends BaseElement {
    type: 'page-number';
    format: string;          // e.g. "Page {n} of {total}"  — {n} and {total} are substituted
    fontSize: number;
    fontFamily: 'Helvetica' | 'Times' | 'Courier';
    fontWeight: 'normal' | 'bold';
    fontColor: string;
    textAlign: 'left' | 'center' | 'right';
    backgroundColor: string; // 'transparent' = no fill
    padding: number;
}

export interface QrCodeElement extends BaseElement {
    type: 'qr-code';
    data: string;                        // URL or text to encode
    fgColor: string;                     // module (foreground) color
    bgColor: string;                     // background color
    errorLevel: 'L' | 'M' | 'Q' | 'H'; // error correction level
    margin: number;                      // quiet-zone cells
}


export interface DateElement extends BaseElement {
    type: 'date';
    /** 'today' uses the date at PDF generation / canvas render time; 'fixed' uses fixedDate */
    dateSource: 'today' | 'fixed';
    fixedDate: string;        // ISO date string "YYYY-MM-DD", used when dateSource === 'fixed'
    format: string;           // format string with tokens: YYYY YY MMMM MMM MM M dddd ddd DD D
    fontSize: number;
    fontFamily: 'Helvetica' | 'Times' | 'Courier';
    fontWeight: 'normal' | 'bold';
    fontColor: string;
    textAlign: 'left' | 'center' | 'right';
    backgroundColor: string;  // 'transparent' = no fill
    padding: number;
}

export interface HeadingElement extends BaseElement {
    type: 'heading';
    level: 1 | 2 | 3 | 4 | 5 | 6;
    content: string;
    fontSize: number;           // defaults per level but user-adjustable
    fontFamily: 'Helvetica' | 'Times' | 'Courier';
    fontColor: string;
    textAlign: 'left' | 'center' | 'right';
    verticalAlign: 'top' | 'middle' | 'bottom';
    backgroundColor: string;   // 'transparent' = no fill
    padding: number;
    underline: boolean;
}

export type CanvasElement =
    | TextElement
    | LineElement
    | RectangleElement
    | CircleElement
    | CheckboxElement
    | TableElement
    | SignatureElement
    | SignaturePadElement
    | ImageElement
    | PageNumberElement
    | QrCodeElement
    | DateElement
    | HeadingElement;
