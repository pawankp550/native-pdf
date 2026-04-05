import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setZoom, setShowGrid, undo, redo } from '@/store/pdf-editor/slice';
import { selectZoom, selectShowGrid, selectCanUndo, selectCanRedo, selectPages, selectElements, selectBasePdf, selectWatermark, selectHeader, selectFooter } from '@/store/pdf-editor/selectors';
import { Button } from '@/components/ui/button';
import { generatePdf } from '@/utils/pdf-generator';
import { generateHtml } from '@/utils/html-generator';
import { Undo2, Redo2, ZoomIn, ZoomOut, Grid3x3, Eye, FileCode } from 'lucide-react';
import { toast } from 'sonner';

const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

export const ToolbarCenter = React.memo(() => {
  const dispatch = useAppDispatch();
  const zoom = useAppSelector(selectZoom);
  const showGrid = useAppSelector(selectShowGrid);
  const canUndo = useAppSelector(selectCanUndo);
  const canRedo = useAppSelector(selectCanRedo);
  const pages = useAppSelector(selectPages);
  const elements = useAppSelector(selectElements);
  const basePdf = useAppSelector(selectBasePdf);
  const watermark = useAppSelector(selectWatermark);
  const header = useAppSelector(selectHeader);
  const footer = useAppSelector(selectFooter);

  const [previewing, setPreviewing] = useState(false);
  const [previewingHtml, setPreviewingHtml] = useState(false);

  const handlePreviewHtml = async () => {
    setPreviewingHtml(true);
    try {
      const html = await generateHtml(pages, elements, basePdf, watermark, header, footer);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const tab = window.open(url, '_blank');
      if (tab) tab.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
      toast.success('HTML preview opened');
    } catch (err) {
      console.error(err);
      toast.error('HTML preview failed');
    } finally {
      setPreviewingHtml(false);
    }
  };

  const handlePreviewPdf = async () => {
    setPreviewing(true);
    try {
      const bytes = await generatePdf(pages, elements, basePdf, watermark, header, footer);
      const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const tab = window.open(url, '_blank');
      if (tab) tab.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
      toast.success('PDF preview opened');
    } catch (err) {
      console.error(err);
      toast.error('PDF preview failed');
    } finally {
      setPreviewing(false);
    }
  };

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" disabled={!canUndo} onClick={() => dispatch(undo())} title="Undo (Ctrl+Z)">
        <Undo2 size={15} />
      </Button>
      <Button variant="ghost" size="icon" disabled={!canRedo} onClick={() => dispatch(redo())} title="Redo (Ctrl+Y)">
        <Redo2 size={15} />
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      <Button variant="ghost" size="icon" onClick={() => dispatch(setZoom(zoom - 0.1))} title="Zoom out">
        <ZoomOut size={15} />
      </Button>
      <select
        className="h-7 text-xs border rounded px-1 bg-background text-foreground"
        value={zoomPercent}
        onChange={e => dispatch(setZoom(Number(e.target.value) / 100))}
      >
        {ZOOM_PRESETS.map(z => (
          <option key={z} value={Math.round(z * 100)}>{Math.round(z * 100)}%</option>
        ))}
      </select>
      <Button variant="ghost" size="icon" onClick={() => dispatch(setZoom(zoom + 0.1))} title="Zoom in">
        <ZoomIn size={15} />
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      <Button
        variant={showGrid ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => dispatch(setShowGrid(!showGrid))}
        title="Toggle grid"
      >
        <Grid3x3 size={15} />
      </Button>

      <Button variant="ghost" size="icon" onClick={handlePreviewHtml} disabled={previewingHtml} title="Preview as HTML (fast)" className="hidden lg:inline-flex">
        <FileCode size={15} />
      </Button>
      <Button variant="ghost" size="icon" onClick={handlePreviewPdf} disabled={previewing} title="Preview as PDF">
        <Eye size={15} />
      </Button>
    </div>
  );
});
ToolbarCenter.displayName = 'ToolbarCenter';
