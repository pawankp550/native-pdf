import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { AppDispatch } from '@/store';
import {
  moveElement, resizeElement, rotateElement, setSelectedElements,
} from '@/store/pdf-editor/slice';
import type { CanvasElement } from '@/store/pdf-editor/types/elements';
import type { DragState } from './types';
import { computeSnap } from './snap';

interface Params {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  dispatch: AppDispatch;
  elements: CanvasElement[];
  editingId: string | null;
  selectedIds: string[];
  page?: { width: number; height: number } | null;
}

interface Result {
  guideLines: { xs: number[]; ys: number[] };
  dragTooltip: { x: number; y: number; label: string } | null;
  getCanvasPos: (e: React.MouseEvent | MouseEvent) => { x: number; y: number };
  handleElementMouseDown: (e: React.MouseEvent, el: CanvasElement) => void;
  handleResizeMouseDown: (e: React.MouseEvent, el: CanvasElement, direction: string) => void;
  handleRotateMouseDown: (e: React.MouseEvent, el: CanvasElement) => void;
}

export function useCanvasDrag({ canvasRef, zoom, dispatch, elements, editingId, selectedIds, page }: Params): Result {
  const dragState = useRef<DragState | null>(null);
  const elementsRef = useRef(elements);
  const pageRef = useRef(page);
  useEffect(() => { elementsRef.current = elements; }, [elements]);
  useEffect(() => { pageRef.current = page; }, [page]);

  const [guideLines, setGuideLines] = useState<{ xs: number[]; ys: number[] }>({ xs: [], ys: [] });
  const [dragTooltip, setDragTooltip] = useState<{ x: number; y: number; label: string } | null>(null);

  const getCanvasPos = useCallback((e: React.MouseEvent | MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    };
  }, [canvasRef, zoom]);

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
        const rawX = Math.round(ds.startElX + dx);
        const rawY = Math.round(ds.startElY + dy);
        const { x: newX, y: newY, xs, ys } = computeSnap(ds.elementId, rawX, rawY, elementsRef.current, pageRef.current ?? undefined);
        dispatch(moveElement({ id: ds.elementId, x: newX, y: newY }));
        setGuideLines({ xs, ys });
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
      setGuideLines({ xs: [], ys: [] });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [zoom, dispatch, canvasRef]);

  return { guideLines, dragTooltip, getCanvasPos, handleElementMouseDown, handleResizeMouseDown, handleRotateMouseDown };
}
