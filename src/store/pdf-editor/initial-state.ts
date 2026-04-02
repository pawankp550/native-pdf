import { nanoid } from '@reduxjs/toolkit';
import type { PdfEditorState } from './types/state';

const firstPageId = nanoid();

export const initialState: PdfEditorState = {
  basePdf: null,
  watermark: null,
  header: null,
  footer: null,
  pages: [
    {
      id: firstPageId,
      name: 'Page 1',
      width: 794,
      height: 1123,
      order: 0,
      backgroundColor: '#ffffff',
    },
  ],
  currentPageId: firstPageId,
  elements: {},
  selectedElementIds: [],
  zoom: 1,
  templateName: 'Untitled Template',
  isDirty: false,
  showGrid: false,
  history: {
    past: [],
    future: [],
  },
};
