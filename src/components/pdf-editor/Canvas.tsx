import React, { useRef, useState, useCallback, useEffect } from 'react';
import { nanoid } from '@reduxjs/toolkit';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  addElement, addPageNumberToAllPages,
  updateElement, deleteSelectedElements, duplicateSelectedElements,
  moveElement, resizeElement, rotateElement,
  setSelectedElements, clearSelection,
  undo, redo,
} from '@/store/pdf-editor/slice';
import {
  selectCurrentPage, selectCurrentPageElements,
  selectSelectedElementIds, selectZoom, selectShowGrid, selectBasePdf, selectSortedPages,
} from '@/store/pdf-editor/selectors';
import type { CanvasElement, ElementType, PageNumberElement, DateElement, HeadingElement, SignaturePadElement, LinkElement, ImageElement, BarcodeElement, RadioElement } from '@/store/pdf-editor/types/elements';
import { todayIso } from '@/utils/date-format';
import { ElementRenderer } from './elements/ElementRenderer';
import { ElementHandles } from './elements/ElementHandles';
import { EyeOff, Lock } from 'lucide-react';

function createDefaultElement(type: ElementType, x: number, y: number, pageId: string): CanvasElement {
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
  }
}

interface DragState {
  type: 'move' | 'resize' | 'rotate';
  elementId: string;
  startX: number;
  startY: number;
  startElX: number;
  startElY: number;
  startElW?: number;
  startElH?: number;
  direction?: string;
  startAngle?: number;
  startRotate?: number;
  elCenterX?: number;
  elCenterY?: number;
}

interface RubberBand {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export const Canvas = React.memo(() => {
  const dispatch = useAppDispatch();
  const currentPage = useAppSelector(selectCurrentPage);
  const elements = useAppSelector(selectCurrentPageElements);
  const selectedIds = useAppSelector(selectSelectedElementIds);
  const zoom = useAppSelector(selectZoom);
  const showGrid = useAppSelector(selectShowGrid);
  const basePdf = useAppSelector(selectBasePdf);
  const sortedPages = useAppSelector(selectSortedPages);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<DragState | null>(null);
  const lastDragOverPos = useRef<{ clientX: number; clientY: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rubberBand, setRubberBand] = useState<RubberBand | null>(null);
  const [dragTooltip, setDragTooltip] = useState<{ x: number; y: number; label: string } | null>(null);

  const getCanvasPos = useCallback((e: React.MouseEvent | MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    };
  }, [zoom]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!currentPage) return;

    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;

    let type: ElementType;
    let presetSrc: string | undefined;
    try {
      const parsed = JSON.parse(raw) as { type: ElementType; src?: string };
      type = parsed.type;
      presetSrc = parsed.src;
    } catch {
      type = raw as ElementType;
    }

    const native = e.nativeEvent as DragEvent;
    const clientX = native.clientX || lastDragOverPos.current?.clientX || 0;
    const clientY = native.clientY || lastDragOverPos.current?.clientY || 0;

    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = (clientX - rect.left) / zoom;
    const rawY = (clientY - rect.top) / zoom;

    const el = createDefaultElement(type, 0, 0, currentPage.id);
    if (presetSrc && el.type === 'image') (el as ImageElement).src = presetSrc;

    const x = Math.round(Math.max(0, Math.min(currentPage.width - el.width, rawX - el.width / 2)));
    const y = Math.round(Math.max(0, Math.min(currentPage.height - el.height, rawY - el.height / 2)));
    el.position.x = x;
    el.position.y = y;

    const maxZ = elements.length > 0 ? Math.max(...elements.map(ev => ev.zIndex)) + 1 : 0;
    el.zIndex = maxZ;

    if (type === 'page-number') {
      dispatch(addPageNumberToAllPages(el as PageNumberElement));
      dispatch(setSelectedElements([el.id]));
    } else {
      dispatch(addElement(el));
      dispatch(setSelectedElements([el.id]));
    }
  }, [currentPage, elements, zoom, dispatch]);

  const handleElementMouseDown = useCallback((e: React.MouseEvent, el: CanvasElement) => {
    if (el.locked) return;
    e.stopPropagation();
    if (e.button !== 0) return;

    if (editingId) {
      (document.activeElement as HTMLElement | null)?.blur();
      return;
    }

    if (e.shiftKey) {
      const newIds = selectedIds.includes(el.id)
        ? selectedIds.filter(id => id !== el.id)
        : [...selectedIds, el.id];
      dispatch(setSelectedElements(newIds));
    } else if (!selectedIds.includes(el.id)) {
      dispatch(setSelectedElements([el.id]));
    }

    const pos = getCanvasPos(e);
    dragState.current = {
      type: 'move',
      elementId: el.id,
      startX: pos.x,
      startY: pos.y,
      startElX: el.position.x,
      startElY: el.position.y,
    };
  }, [editingId, selectedIds, getCanvasPos, dispatch]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, el: CanvasElement, direction: string) => {
    e.stopPropagation();
    const pos = getCanvasPos(e);
    dragState.current = {
      type: 'resize',
      elementId: el.id,
      startX: pos.x,
      startY: pos.y,
      startElX: el.position.x,
      startElY: el.position.y,
      startElW: el.width,
      startElH: el.height,
      direction,
    };
  }, [getCanvasPos]);

  const handleRotateMouseDown = useCallback((e: React.MouseEvent, el: CanvasElement) => {
    e.stopPropagation();
    const pos = getCanvasPos(e);
    const cx = el.position.x + el.width / 2;
    const cy = el.position.y + el.height / 2;
    const angle = Math.atan2(pos.y - cy, pos.x - cx) * (180 / Math.PI);
    dragState.current = {
      type: 'rotate',
      elementId: el.id,
      startX: pos.x,
      startY: pos.y,
      startElX: el.position.x,
      startElY: el.position.y,
      startAngle: angle,
      startRotate: el.rotate,
      elCenterX: cx,
      elCenterY: cy,
    };
  }, [getCanvasPos]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragState.current) return;
      const ds = dragState.current;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;
      const dx = x - ds.startX;
      const dy = y - ds.startY;

      if (ds.type === 'move') {
        const newX = Math.round(ds.startElX + dx);
        const newY = Math.round(ds.startElY + dy);
        dispatch(moveElement({ id: ds.elementId, x: newX, y: newY }));
        setDragTooltip({ x: e.clientX + 12, y: e.clientY - 24, label: `${newX}, ${newY}` });
      } else if (ds.type === 'resize' && ds.startElW !== undefined && ds.startElH !== undefined) {
        const dir = ds.direction ?? 'se';
        let newX = ds.startElX;
        let newY = ds.startElY;
        let newW = ds.startElW;
        let newH = ds.startElH;

        if (dir.includes('e')) newW = Math.max(10, ds.startElW + dx);
        if (dir.includes('s')) newH = Math.max(10, ds.startElH + dy);
        if (dir.includes('w')) { newW = Math.max(10, ds.startElW - dx); newX = ds.startElX + dx; }
        if (dir.includes('n')) { newH = Math.max(10, ds.startElH - dy); newY = ds.startElY + dy; }

        dispatch(resizeElement({ id: ds.elementId, width: Math.round(newW), height: Math.round(newH), x: Math.round(newX), y: Math.round(newY) }));
        setDragTooltip({ x: e.clientX + 12, y: e.clientY - 24, label: `${Math.round(newW)} × ${Math.round(newH)}` });
      } else if (ds.type === 'rotate' && ds.elCenterX !== undefined && ds.elCenterY !== undefined) {
        const angle = Math.atan2(y - ds.elCenterY, x - ds.elCenterX) * (180 / Math.PI);
        const delta = angle - (ds.startAngle ?? 0);
        const newRotate = Math.round((ds.startRotate ?? 0) + delta);
        dispatch(rotateElement({ id: ds.elementId, rotate: newRotate }));
        setDragTooltip({ x: e.clientX + 12, y: e.clientY - 24, label: `${newRotate}°` });
      }
    };

    const onMouseUp = () => {
      dragState.current = null;
      setDragTooltip(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [zoom, dispatch]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (editingId) {
      (document.activeElement as HTMLElement | null)?.blur();
      if (elements.find(el => el.id === editingId)?.type === 'signature-pad') {
        setEditingId(null);
      }
      return;
    }
    const pos = getCanvasPos(e);
    if (!e.shiftKey) dispatch(clearSelection());
    setRubberBand({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y });

    const onMove = (me: MouseEvent) => {
      const p = { x: (me.clientX - (canvasRef.current?.getBoundingClientRect().left ?? 0)) / zoom, y: (me.clientY - (canvasRef.current?.getBoundingClientRect().top ?? 0)) / zoom };
      setRubberBand(rb => rb ? { ...rb, currentX: p.x, currentY: p.y } : null);
    };
    const onUp = (_me: MouseEvent) => {
      setRubberBand(rb => {
        if (rb) {
          const minX = Math.min(rb.startX, rb.currentX);
          const maxX = Math.max(rb.startX, rb.currentX);
          const minY = Math.min(rb.startY, rb.currentY);
          const maxY = Math.max(rb.startY, rb.currentY);
          if (maxX - minX > 4 || maxY - minY > 4) {
            const inBand = elements
              .filter(el => el.position.x < maxX && el.position.x + el.width > minX && el.position.y < maxY && el.position.y + el.height > minY)
              .map(el => el.id);
            if (inBand.length) dispatch(setSelectedElements(inBand));
          }
        }
        return null;
      });
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [editingId, getCanvasPos, dispatch, elements, zoom]);

  const handleElementDoubleClick = useCallback((e: React.MouseEvent, el: CanvasElement) => {
    if ((el.type === 'text' || el.type === 'table' || el.type === 'heading' || el.type === 'signature-pad') && !el.locked) {
      e.stopPropagation();
      setEditingId(el.id);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) { e.preventDefault(); dispatch(deleteSelectedElements()); }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault(); dispatch(duplicateSelectedElements());
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault(); dispatch(undo());
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault(); dispatch(redo());
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        dispatch(setSelectedElements(elements.map(el => el.id)));
      } else if (e.key === 'Escape') {
        dispatch(clearSelection()); setEditingId(null);
      } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        if (selectedIds.length === 0) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        for (const id of selectedIds) {
          const el = elements.find(e => e.id === id);
          if (!el || el.locked) continue;
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          dispatch(moveElement({ id, x: el.position.x + dx, y: el.position.y + dy }));
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIds, elements, dispatch]);

  if (!currentPage) return null;

  const gridStyle = showGrid ? {
    backgroundImage: `linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)`,
    backgroundSize: '8px 8px',
  } : {};

  return (
    <div className="flex-1 overflow-auto bg-[#f0f0f0] flex items-start justify-center p-8">
      <div
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'top center',
          marginBottom: `${(currentPage.height * zoom) - currentPage.height}px`,
        }}
      >
        <div
          ref={canvasRef}
          style={{
            width: currentPage.width,
            height: currentPage.height,
            backgroundColor: basePdf ? 'transparent' : currentPage.backgroundColor,
            position: 'relative',
            boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
            userSelect: 'none',
            ...gridStyle,
          }}
          onDragOver={e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            lastDragOverPos.current = { clientX: e.clientX, clientY: e.clientY };
          }}
          onDrop={handleDrop}
          onMouseDown={handleCanvasMouseDown}
        >
          {basePdf && (() => {
            const pageIndex = sortedPages.findIndex(p => p.id === currentPage.id);
            const img = basePdf.pageImages[pageIndex];
            return img ? (
              <img
                src={img}
                alt=""
                draggable={false}
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%',
                  objectFit: 'fill',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  zIndex: -1,
                }}
              />
            ) : null;
          })()}
          {elements.map(el => {
            const isSelected = selectedIds.includes(el.id);
            const isEditing = editingId === el.id;

            return (
              <div
                key={el.id}
                style={{
                  position: 'absolute',
                  left: el.position.x,
                  top: el.position.y,
                  width: el.width,
                  height: el.height,
                  transform: `rotate(${el.rotate}deg)`,
                  opacity: el.visible ? el.opacity : 0.3,
                  zIndex: el.zIndex,
                  cursor: el.locked ? 'not-allowed' : 'move',
                  outline: isSelected ? '2px solid #3b82f6' : 'none',
                  outlineOffset: '1px',
                }}
                onMouseDown={e => handleElementMouseDown(e, el)}
                onDoubleClick={e => handleElementDoubleClick(e, el)}
              >
                <ElementRenderer
                  element={el}
                  isEditing={isEditing}
                  onCommitText={text => {
                    dispatch(updateElement({ id: el.id, changes: { content: text } as Partial<typeof el> }));
                    setEditingId(null);
                  }}
                  onCommitTable={(data, columns, width) => {
                    dispatch(updateElement({ id: el.id, changes: { data, columns, width } as Partial<typeof el> }));
                    setEditingId(null);
                  }}
                />

                {el.locked && (
                  <div style={{ position: 'absolute', top: -8, right: -8, background: '#6b7280', borderRadius: 3, padding: '1px 3px', zIndex: 10 }}>
                    <Lock size={8} color="white" />
                  </div>
                )}
                {!el.visible && (
                  <div style={{ position: 'absolute', top: -8, left: -8, background: '#6b7280', borderRadius: 3, padding: '1px 3px', zIndex: 10 }}>
                    <EyeOff size={8} color="white" />
                  </div>
                )}

                {isSelected && !el.locked && (
                  <ElementHandles
                    onMouseDown={(e, dir) => handleResizeMouseDown(e, el, dir)}
                    onRotateMouseDown={e => handleRotateMouseDown(e, el)}
                  />
                )}
              </div>
            );
          })}

          {rubberBand && (
            <div
              style={{
                position: 'absolute',
                left: Math.min(rubberBand.startX, rubberBand.currentX),
                top: Math.min(rubberBand.startY, rubberBand.currentY),
                width: Math.abs(rubberBand.currentX - rubberBand.startX),
                height: Math.abs(rubberBand.currentY - rubberBand.startY),
                border: '1px dashed #3b82f6',
                background: 'rgba(59,130,246,0.08)',
                pointerEvents: 'none',
                zIndex: 9999,
              }}
            />
          )}
        </div>
      </div>

      {dragTooltip && (
        <div
          style={{
            position: 'fixed',
            left: dragTooltip.x,
            top: dragTooltip.y,
            background: '#1e293b',
            color: 'white',
            fontSize: 11,
            padding: '2px 6px',
            borderRadius: 4,
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          {dragTooltip.label}
        </div>
      )}
    </div>
  );
});
Canvas.displayName = 'Canvas';
