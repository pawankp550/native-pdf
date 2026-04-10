import React, { useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { markSaved, loadTemplateState, setBasePdf, clearBasePdf, setShowSupportPrompt } from '@/store/pdf-editor/slice';
import { selectTemplateName, selectPages, selectElements, selectBasePdf, selectWatermark, selectHeader, selectFooter } from '@/store/pdf-editor/selectors';
import { renderPdfToImages } from '@/services/pdf-renderer';
import { Button } from '@/components/ui/button';
import { generatePdf } from '@/utils/pdf-generator';
import { OcrImportDialog } from '@/components/pdf-editor/OcrImportDialog';
import { WatermarkDialog } from '@/components/pdf-editor/WatermarkDialog';
import { HeaderFooterDialog } from '@/components/pdf-editor/HeaderFooterDialog';
import { PdfToolsDropdown } from './PdfToolsDropdown';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Moon, Sun, FileText, X, ScanText, Download, Upload, FileDown, Stamp, Rows3, MoreHorizontal } from 'lucide-react';
import type { Page } from '@/store/pdf-editor/types/state';
import type { CanvasElement } from '@/store/pdf-editor/types/elements';
import type { EditorAction } from '@/App';
import { toast } from 'sonner';

interface TemplateFile {
  version: string;
  templateName: string;
  savedAt: string;
  pages: Page[];
  elements: Record<string, CanvasElement>;
}

interface Props {
  darkMode: boolean;
  onToggleDark: () => void;
  initialAction?: EditorAction;
}

export const ToolbarRight = React.memo(({ darkMode, onToggleDark, initialAction }: Props) => {
  const dispatch = useAppDispatch();
  const templateName = useAppSelector(selectTemplateName);
  const pages = useAppSelector(selectPages);
  const elements = useAppSelector(selectElements);
  const basePdf = useAppSelector(selectBasePdf);
  const watermark = useAppSelector(selectWatermark);
  const header = useAppSelector(selectHeader);
  const footer = useAppSelector(selectFooter);

  const loadRef = useRef<HTMLInputElement>(null);
  const basePdfRef = useRef<HTMLInputElement>(null);

  const [loadingBasePdf, setLoadingBasePdf] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [watermarkOpen, setWatermarkOpen] = useState(false);
  const [headerFooterOpen, setHeaderFooterOpen] = useState(false);

  const handleSaveTemplate = () => {
    const data: TemplateFile = {
      version: '1.0',
      templateName,
      savedAt: new Date().toISOString(),
      pages,
      elements,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${templateName.replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    dispatch(markSaved());
    toast.success('Template saved');
    dispatch(setShowSupportPrompt(true));
  };

  const handleLoadTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string) as TemplateFile;
        if (!data.version) throw new Error('Invalid template file');
        dispatch(loadTemplateState({ pages: data.pages, elements: data.elements, templateName: data.templateName }));
        toast.success('Template loaded');
      } catch {
        toast.error('Failed to load template');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleBasePdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadingBasePdf(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = ev => resolve(ev.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { pageImages, pageDimensions, pageCount } = await renderPdfToImages(dataUrl);
      dispatch(setBasePdf({ fileName: file.name, data: dataUrl, pageImages, pageDimensions, pageCount, syncPages: true }));
      toast.success(`Base PDF loaded: ${pageCount} page${pageCount > 1 ? 's' : ''}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load base PDF');
    } finally {
      setLoadingBasePdf(false);
      e.target.value = '';
    }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const bytes = await generatePdf(pages, elements, basePdf, watermark, header, footer);
      const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${templateName.replace(/\s+/g, '-')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF exported');
      dispatch(setShowSupportPrompt(true));
    } catch (err) {
      console.error(err);
      toast.error('PDF export failed');
    } finally {
      setExporting(false);
    }
  };

  const hasHeaderFooter = !!(header || footer);

  return (
    <div className="flex items-center gap-1.5">
      <Button variant="ghost" size="icon" onClick={onToggleDark} title="Toggle dark mode">
        {darkMode ? <Sun size={15} /> : <Moon size={15} />}
      </Button>

      <div className="w-px h-5 bg-border" />

      {/* Base PDF — always visible; chip shows filename, button collapses to icon on tablet */}
      {basePdf ? (
        <div className="flex items-center gap-1 px-2 h-7 border rounded text-xs bg-primary/10 border-primary/30 max-w-[140px]">
          <FileText size={12} className="shrink-0 text-primary" />
          <span className="truncate text-primary font-medium" title={basePdf.fileName}>{basePdf.fileName}</span>
          <button className="shrink-0 ml-0.5 hover:text-destructive" title="Remove base PDF" onClick={() => dispatch(clearBasePdf())}>
            <X size={11} />
          </button>
        </div>
      ) : (
        <Button variant="outline" size="sm" disabled={loadingBasePdf} onClick={() => basePdfRef.current?.click()} title="Import a PDF to edit">
          <FileText size={13} className="lg:mr-1" />
          <span className="hidden lg:inline">{loadingBasePdf ? 'Loading…' : 'Import PDF to Edit'}</span>
        </Button>
      )}
      <input ref={basePdfRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleBasePdfChange} />

      {/* OCR — desktop only; available in More menu on tablet */}
      {basePdf && (
        <Button variant="outline" size="sm" onClick={() => setOcrOpen(true)} title="Extract text from the base PDF" className="hidden lg:inline-flex">
          <ScanText size={13} className="mr-1" /> Extract Text
        </Button>
      )}
      <OcrImportDialog open={ocrOpen} onClose={() => setOcrOpen(false)} />

      {/* Watermark — desktop only */}
      <Button
        variant={watermark ? 'secondary' : 'outline'}
        size="sm"
        onClick={() => setWatermarkOpen(true)}
        title="Add watermark to all pages"
        className="hidden lg:inline-flex"
      >
        <Stamp size={13} className="mr-1" /> Watermark
      </Button>
      <WatermarkDialog open={watermarkOpen} onClose={() => setWatermarkOpen(false)} />

      {/* Header & Footer — desktop only */}
      <Button
        variant={hasHeaderFooter ? 'secondary' : 'outline'}
        size="sm"
        onClick={() => setHeaderFooterOpen(true)}
        title="Configure header and footer"
        className="hidden lg:inline-flex"
      >
        <Rows3 size={13} className="mr-1" /> Header &amp; Footer
      </Button>
      <HeaderFooterDialog open={headerFooterOpen} onClose={() => setHeaderFooterOpen(false)} />

      {/* PDF tools — always visible */}
      <PdfToolsDropdown initialAction={initialAction} />

      {/* Save / Load Template — desktop only */}
      <Button variant="outline" size="sm" onClick={handleSaveTemplate} title="Save template as JSON" className="hidden lg:inline-flex">
        <Download size={13} className="mr-1" /> Save Template
      </Button>
      <Button variant="outline" size="sm" onClick={() => loadRef.current?.click()} title="Load template from JSON" className="hidden lg:inline-flex">
        <Upload size={13} className="mr-1" /> Load Template
      </Button>
      <input ref={loadRef} type="file" accept=".json" className="hidden" onChange={handleLoadTemplate} />

      {/* Export — always visible; label hidden on tablet */}
      <Button size="sm" onClick={handleExportPdf} disabled={exporting} title="Export as PDF">
        <FileDown size={13} className="lg:mr-1" />
        <span className="hidden lg:inline">{exporting ? 'Exporting…' : 'Export PDF'}</span>
      </Button>

      {/* More menu — tablet only, hidden on desktop */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="lg:hidden" title="More options">
            <MoreHorizontal size={15} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {basePdf && (
            <DropdownMenuItem onClick={() => setOcrOpen(true)}>
              <ScanText size={13} className="mr-2" /> Extract Text
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setWatermarkOpen(true)}>
            <Stamp size={13} className="mr-2" /> Watermark
            {watermark && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setHeaderFooterOpen(true)}>
            <Rows3 size={13} className="mr-2" /> Header &amp; Footer
            {hasHeaderFooter && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSaveTemplate}>
            <Download size={13} className="mr-2" /> Save Template
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => loadRef.current?.click()}>
            <Upload size={13} className="mr-2" /> Load Template
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});
ToolbarRight.displayName = 'ToolbarRight';
