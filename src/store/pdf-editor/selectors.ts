import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';

const selectState = (state: RootState) => state.pdfEditor;

export const selectPages = (state: RootState) => state.pdfEditor.pages;
export const selectCurrentPageId = (state: RootState) => state.pdfEditor.currentPageId;
export const selectElements = (state: RootState) => state.pdfEditor.elements;
export const selectSelectedElementIds = (state: RootState) => state.pdfEditor.selectedElementIds;
export const selectZoom = (state: RootState) => state.pdfEditor.zoom;
export const selectTemplateName = (state: RootState) => state.pdfEditor.templateName;
export const selectIsDirty = (state: RootState) => state.pdfEditor.isDirty;
export const selectShowGrid = (state: RootState) => state.pdfEditor.showGrid;
export const selectCanUndo = (state: RootState) => state.pdfEditor.history.past.length > 0;
export const selectCanRedo = (state: RootState) => state.pdfEditor.history.future.length > 0;
export const selectBasePdf = (state: RootState) => state.pdfEditor.basePdf;
export const selectWatermark = (state: RootState) => state.pdfEditor.watermark;
export const selectHeader = (state: RootState) => state.pdfEditor.header;
export const selectFooter = (state: RootState) => state.pdfEditor.footer;

export const selectCurrentPage = createSelector(
  selectPages,
  selectCurrentPageId,
  (pages, id) => pages.find(p => p.id === id)
);

export const selectCurrentPageElements = createSelector(
  selectElements,
  selectCurrentPageId,
  (elements, pageId) =>
    Object.values(elements)
      .filter(e => e.pageId === pageId)
      .sort((a, b) => a.zIndex - b.zIndex)
);

export const selectSelectedElements = createSelector(
  selectElements,
  selectSelectedElementIds,
  (elements, ids) => ids.map(id => elements[id]).filter(Boolean)
);

export const selectElementById = (id: string) =>
  createSelector(selectElements, elements => elements[id]);

export const selectSortedPages = createSelector(
  selectPages,
  pages => [...pages].sort((a, b) => a.order - b.order)
);

export { selectState };
