import React, { useState, useCallback, useRef } from 'react';
import { FilePlus2, CheckSquare, Square, Scissors } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { renderPdfToImages } from '@/services/pdf-renderer';
import { extractPages } from '@/utils/extract-pages';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface PageThumb {
  pageNumber: number; // 1-based
  dataUrl: string;
}

export const ExtractPagesDialog = ({ open, onClose }: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [thumbs, setThumbs] = useState<PageThumb[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loadingThumbs, setLoadingThumbs] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFile = useCallback(async (f: File) => {
    if (!f.name.endsWith('.pdf') && f.type !== 'application/pdf') {
      toast.error('Only PDF files are accepted');
      return;
    }
    setLoadingThumbs(true);
    setThumbs([]);
    setSelected(new Set());
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
    const f = e.dataTransfer.files[0];
    if (f) loadFile(f);
  }, [loadFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) loadFile(f);
    e.target.value = '';
  }, [loadFile]);

  const togglePage = (n: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(thumbs.map(t => t.pageNumber)));
  const deselectAll = () => setSelected(new Set());

  const handleExtract = async () => {
    if (!file || selected.size === 0) return;
    setExtracting(true);
    try {
      const sorted = [...selected].sort((a, b) => a - b);
      const bytes = await extractPages(file, sorted);
      const blob = new Blob([bytes], { type: 'application/pdf' });
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
    }
  };

  const allSelected = thumbs.length > 0 && selected.size === thumbs.length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Extract Pages</DialogTitle>
        </DialogHeader>

        {/* Drop zone — shown when no file loaded */}
        {!file && !loadingThumbs && (
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:border-primary hover:bg-accent/40 transition-colors"
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

        {/* Toolbar: file name + select actions */}
        {thumbs.length > 0 && (
          <div className="flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-medium truncate text-muted-foreground">{file?.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">· {thumbs.length} pages</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={allSelected ? deselectAll : selectAll}>
                {allSelected ? <Square size={12} className="mr-1" /> : <CheckSquare size={12} className="mr-1" />}
                {allSelected ? 'Deselect all' : 'Select all'}
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setFile(null); setThumbs([]); setSelected(new Set()); }}>
                Change file
              </Button>
            </div>
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
                    onClick={() => togglePage(pageNumber)}
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
                    {/* Overlay checkmark when selected */}
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                    {/* Page number badge */}
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
                : 'Click pages to select'}
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
      </DialogContent>
    </Dialog>
  );
};
