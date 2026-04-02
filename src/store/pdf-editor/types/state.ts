import type { CanvasElement } from './elements';

export interface HeaderFooterZone {
  left: string;
  center: string;
  right: string;
}

export interface HeaderFooterSettings {
  enabled: boolean;
  height: number;          // px
  fontSize: number;        // pt
  color: string;           // hex
  backgroundColor: string; // hex or 'transparent'
  showBorder: boolean;
  borderColor: string;     // hex
  zones: HeaderFooterZone;
}

export interface WatermarkSettings {
  enabled: boolean;
  text: string;
  fontSize: number;
  color: string;   // hex e.g. "#ff0000"
  opacity: number; // 0–1
  rotation: number; // degrees
}

export interface BasePdfState {
  fileName: string;
  /** base64 data URL of the raw PDF bytes — used by the generator to embed pages */
  data: string;
  /** PNG data URLs rendered from each page — used as canvas backgrounds */
  pageImages: string[];
  pageDimensions: { width: number; height: number }[];
  pageCount: number;
}

export interface Page {
  id: string;
  name: string;
  width: number;
  height: number;
  order: number;
  backgroundColor: string;
}

export interface PdfEditorSnapshot {
  pages: Page[];
  elements: Record<string, CanvasElement>;
}

export interface PdfEditorState {
  basePdf: BasePdfState | null;
  watermark: WatermarkSettings | null;
  header: HeaderFooterSettings | null;
  footer: HeaderFooterSettings | null;
  pages: Page[];
  currentPageId: string;
  elements: Record<string, CanvasElement>;
  selectedElementIds: string[];
  zoom: number;
  templateName: string;
  isDirty: boolean;
  showGrid: boolean;
  history: {
    past: PdfEditorSnapshot[];
    future: PdfEditorSnapshot[];
  };
}
