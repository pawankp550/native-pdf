import React, { useRef, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  addElement, addPageNumberToAllPages,
  updateElement, clearSelection, setSelectedElements,
} from '@/store/pdf-editor/slice';
import {
  selectCurrentPage, selectCurrentPageElements,
  selectSelectedElementIds, selectZoom, selectShowGrid, selectBasePdf, selectSortedPages,
} from '@/store/pdf-editor/selectors';
import type { CanvasElement, ElementType, ImageElement, PageNumberElement } from '@/store/pdf-editor/types/elements';
import { ElementRenderer } from './elements/ElementRenderer';
import { ElementHandles } from './elements/ElementHandles';
import { EyeOff, Lock } from 'lucide-react';
import { createDefaultElement } from './canvas/createDefaultElement';
import { useCanvasDrag } from './canvas/useCanvasDrag';
import { useCanvasKeyboard } from './canvas/useCanvasKeyboard';
import { useCanvasPaste } from './canvas/useCanvasPaste';
import type { RubberBand } from './canvas/types';

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
  const lastDragOverPos = useRef<{ clientX: number; clientY: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rubberBand, setRubberBand] = useState<RubberBand | null>(null);

  const { guideLines, dragTooltip, getCanvasPos, handleElementMouseDown, handleResizeMouseDown, handleRotateMouseDown } =
    useCanvasDrag({ canvasRef, zoom, dispatch, elements, editingId, selectedIds, page: currentPage });

  const handleEscape = useCallback(() => setEditingId(null), []);
  useCanvasKeyboard({ selectedIds, elements, dispatch, onEscape: handleEscape });
  useCanvasPaste({ currentPage, elements, dispatch, editingId });

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

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (editingId) {
      (document.activeElement as HTMLElement | null)?.blur();
      if (elements.find(el => el.id === editingId)?.type === 'signature-pad') setEditingId(null);
      return;
    }
    const pos = getCanvasPos(e);
    if (!e.shiftKey) dispatch(clearSelection());
    setRubberBand({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y });

    const onMove = (me: MouseEvent) => {
      const left = canvasRef.current?.getBoundingClientRect().left ?? 0;
      const top = canvasRef.current?.getBoundingClientRect().top ?? 0;
      const p = { x: (me.clientX - left) / zoom, y: (me.clientY - top) / zoom };
      setRubberBand(rb => rb ? { ...rb, currentX: p.x, currentY: p.y } : null);
    };
    const onUp = () => {
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
              <img src={img} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', pointerEvents: 'none', userSelect: 'none', zIndex: -1 }} />
            ) : null;
          })()}

          {elements.map(el => {
            const isSelected = selectedIds.includes(el.id);
            const isEditing = editingId === el.id;
            return (
              <div
                key={el.id}
                style={{ position: 'absolute', left: el.position.x, top: el.position.y, width: el.width, height: el.height, transform: `rotate(${el.rotate}deg)`, opacity: el.visible ? el.opacity : 0.3, zIndex: el.zIndex, cursor: el.locked ? 'not-allowed' : 'move', outline: isSelected ? '2px solid #3b82f6' : 'none', outlineOffset: '1px' }}
                onMouseDown={e => handleElementMouseDown(e, el)}
                onDoubleClick={e => handleElementDoubleClick(e, el)}
              >
                <ElementRenderer element={el} isEditing={isEditing}
                  onCommitText={text => { dispatch(updateElement({ id: el.id, changes: { content: text } as Partial<typeof el> })); setEditingId(null); }}
                  onCommitTable={(data, columns, width) => { dispatch(updateElement({ id: el.id, changes: { data, columns, width } as Partial<typeof el> })); setEditingId(null); }}
                />
                {el.locked && <div style={{ position: 'absolute', top: -8, right: -8, background: '#6b7280', borderRadius: 3, padding: '1px 3px', zIndex: 10 }}><Lock size={8} color="white" /></div>}
                {!el.visible && <div style={{ position: 'absolute', top: -8, left: -8, background: '#6b7280', borderRadius: 3, padding: '1px 3px', zIndex: 10 }}><EyeOff size={8} color="white" /></div>}
                {isSelected && !el.locked && <ElementHandles onMouseDown={(e, dir) => handleResizeMouseDown(e, el, dir)} onRotateMouseDown={e => handleRotateMouseDown(e, el)} />}
              </div>
            );
          })}

          {(guideLines.xs.length > 0 || guideLines.ys.length > 0) && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9990, overflow: 'hidden' }}>
              {guideLines.xs.map(x => <div key={`gx-${x}`} style={{ position: 'absolute', left: x, top: 0, width: 1, height: '100%', background: 'rgba(99,179,237,0.75)' }} />)}
              {guideLines.ys.map(y => <div key={`gy-${y}`} style={{ position: 'absolute', left: 0, top: y, width: '100%', height: 1, background: 'rgba(99,179,237,0.75)' }} />)}
            </div>
          )}

          {rubberBand && (
            <div style={{ position: 'absolute', left: Math.min(rubberBand.startX, rubberBand.currentX), top: Math.min(rubberBand.startY, rubberBand.currentY), width: Math.abs(rubberBand.currentX - rubberBand.startX), height: Math.abs(rubberBand.currentY - rubberBand.startY), border: '1px dashed #3b82f6', background: 'rgba(59,130,246,0.08)', pointerEvents: 'none', zIndex: 9999 }} />
          )}
        </div>
      </div>

      {dragTooltip && (
        <div style={{ position: 'fixed', left: dragTooltip.x, top: dragTooltip.y, background: '#1e293b', color: 'white', fontSize: 11, padding: '2px 6px', borderRadius: 4, pointerEvents: 'none', zIndex: 9999 }}>
          {dragTooltip.label}
        </div>
      )}
    </div>
  );
});
Canvas.displayName = 'Canvas';
