import React, { useState, useCallback, useRef } from 'react';
import { FilePlus2, CheckSquare, Square, Scissors, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { renderPdfToImages } from '@/services/pdf-renderer';
import { extractPages } from '@/utils/extract-pages';
import { DialogBanner } from '@/components/Ads/DialogBanner';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface PageThumb {
  pageNumber: number; // 1-based
  dataUrl: string;
}

/** Parse a range string like "1-3, 5, 8-10" → Set of page numbers */
function parseRangeInput(input: string, maxPage: number): Set<number> {
  const result = new Set<number>();
  for (const part of input.split(',')) {
    const trimmed = part.trim();
    const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const from = Math.max(1, parseInt(rangeMatch[1]));
      const to = Math.min(maxPage, parseInt(rangeMatch[2]));
      for (let i = from; i <= to; i++) result.add(i);
    } else if (/^\d+$/.test(trimmed)) {
      const n = parseInt(trimmed);
      if (n >= 1 && n <= maxPage) result.add(n);
    }
  }
  return result;
}

export const ExtractPagesDialog = ({ open, onClose }: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [thumbs, setThumbs] = useState<PageThumb[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loadingThumbs, setLoadingThumbs] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [rangeInput, setRangeInput] = useState('');
  const lastClickedPage = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFile = useCallback(async (f: File) => {
    if (!f.name.endsWith('.pdf') && f.type !== 'application/pdf') {
      toast.error('Only PDF files are accepted');
      return;
    }
    setLoadingThumbs(true);
    setThumbs([]);
    setSelected(new Set());
    setRangeInput('');
    setFile(f);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });
      const { pageImages } = await renderPdfToImages(dataUrl);
      setThumbs(pageImages.map((img, i) => ({ pageNumber: i + 1, dataUrl: img })));
    } catch {
      toast.error('Failed to render PDF pages');
      setFile(null);
    } finally {
      setLoadingThumbs(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f) loadFile(f);
  }, [loadFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) loadFile(f);
    e.target.value = '';
  }, [loadFile]);

  /** Click: normal toggle. Shift+click: range select from last clicked. */
  const togglePage = (n: number, shiftKey: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (shiftKey && lastClickedPage.current !== null) {
        const from = Math.min(lastClickedPage.current, n);
        const to = Math.max(lastClickedPage.current, n);
        const adding = !prev.has(n);
        for (let i = from; i <= to; i++) {
          adding ? next.add(i) : next.delete(i);
        }
      } else {
        next.has(n) ? next.delete(n) : next.add(n);
      }
      return next;
    });
    lastClickedPage.current = n;
  };

  const selectAll = () => { setSelected(new Set(thumbs.map(t => t.pageNumber))); lastClickedPage.current = null; };
  const deselectAll = () => { setSelected(new Set()); lastClickedPage.current = null; };
  const invertSelection = () => {
    setSelected(new Set(thumbs.map(t => t.pageNumber).filter(n => !selected.has(n))));
    lastClickedPage.current = null;
  };

  const applyRangeInput = () => {
    const parsed = parseRangeInput(rangeInput, thumbs.length);
    if (parsed.size === 0) { toast.error('No valid pages in range'); return; }
    setSelected(parsed);
    lastClickedPage.current = null;
  };

  const handleExtract = async () => {
    if (!file || selected.size === 0) return;
    setExtracting(true);
    try {
      const sorted = [...selected].sort((a, b) => a - b);
      const bytes = await extractPages(file, sorted);
      const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.replace(/\.pdf$/i, '')}_extracted.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Extracted ${selected.size} page${selected.size !== 1 ? 's' : ''}`);
    } catch (err) {
      console.error(err);
      toast.error('Extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
      setFile(null);
      setThumbs([]);
      setSelected(new Set());
      setRangeInput('');
    }
  };

  const allSelected = thumbs.length > 0 && selected.size === thumbs.length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Extract Pages</DialogTitle>
        </DialogHeader>

        {/* Drop zone */}
        {!file && !loadingThumbs && (
          <div
            onDragOver={e => { e.preventDefault(); setIsDragActive(true); }}
            onDragLeave={() => setIsDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-accent/60' : 'hover:border-primary hover:bg-accent/40'
            }`}
          >
            <FilePlus2 size={28} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">Drop a PDF here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">Select individual pages to extract into a new PDF</p>
          </div>
        )}

        {loadingThumbs && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Rendering pages…</p>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleFileInput} />

        {/* Toolbar */}
        {thumbs.length > 0 && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="text-xs font-medium truncate text-muted-foreground">{file?.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">· {thumbs.length}p</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={allSelected ? deselectAll : selectAll}>
                {allSelected ? <Square size={12} className="mr-1" /> : <CheckSquare size={12} className="mr-1" />}
                {allSelected ? 'None' : 'All'}
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={invertSelection} title="Invert selection">
                <RotateCcw size={12} className="mr-1" /> Invert
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => { setFile(null); setThumbs([]); setSelected(new Set()); setRangeInput(''); }}>
                Change
              </Button>
            </div>
          </div>
        )}

        {/* Range quick-select input */}
        {thumbs.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <Input
              value={rangeInput}
              onChange={e => setRangeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyRangeInput()}
              placeholder={`e.g. 1-3, 5, 8-10 (max ${thumbs.length})`}
              className="h-7 text-xs flex-1"
            />
            <Button variant="outline" size="sm" className="h-7 text-xs shrink-0" onClick={applyRangeInput}>
              Select
            </Button>
          </div>
        )}

        {/* Page thumbnail grid */}
        {thumbs.length > 0 && (
          <div className="overflow-y-auto flex-1 pr-1">
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6">
              {thumbs.map(({ pageNumber, dataUrl }) => {
                const isSelected = selected.has(pageNumber);
                return (
                  <div
                    key={pageNumber}
                    onClick={e => togglePage(pageNumber, e.shiftKey)}
                    className={`relative cursor-pointer rounded-md overflow-hidden border-2 transition-all select-none ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <img
                      src={dataUrl}
                      alt={`Page ${pageNumber}`}
                      className="w-full h-auto block"
                      draggable={false}
                    />
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                    <div className={`absolute bottom-0 inset-x-0 text-center py-0.5 text-[10px] font-medium ${isSelected ? 'bg-primary text-white' : 'bg-black/40 text-white'}`}>
                      {pageNumber}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        {thumbs.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t shrink-0">
            <span className="text-xs text-muted-foreground">
              {selected.size > 0
                ? `${selected.size} of ${thumbs.length} page${selected.size !== 1 ? 's' : ''} selected`
                : 'Click pages to select · Shift+click for range'}
            </span>
            <Button
              size="sm"
              onClick={handleExtract}
              disabled={extracting || selected.size === 0}
            >
              <Scissors size={13} className="mr-1" />
              {extracting ? 'Extracting…' : `Extract ${selected.size > 0 ? selected.size : ''} Page${selected.size !== 1 ? 's' : ''}`}
            </Button>
          </div>
        )}

        <DialogBanner />
      </DialogContent>
    </Dialog>
  );
};
