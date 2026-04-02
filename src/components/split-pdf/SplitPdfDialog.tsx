import React, { useState, useCallback, useRef } from 'react';
import { nanoid } from '@reduxjs/toolkit';
import { FilePlus2, Scissors, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { splitPdf, getPageCount } from '@/utils/split-pdf';
import type { SplitMode, SplitRange } from '@/utils/split-pdf';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

const MODE_OPTIONS: { value: SplitMode; label: string; desc: string }[] = [
  { value: 'ranges',    label: 'Custom Ranges', desc: 'Define specific page ranges, each saved as a separate PDF' },
  { value: 'every-n',  label: 'Every N Pages',  desc: 'Split into equal chunks of N pages' },
  { value: 'each-page', label: 'Each Page',     desc: 'Every page becomes its own PDF, bundled in a zip' },
];

export const SplitPdfDialog = ({ open, onClose }: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const [mode, setMode] = useState<SplitMode>('ranges');
  const [everyN, setEveryN] = useState(1);
  const [ranges, setRanges] = useState<SplitRange[]>([
    { id: nanoid(), from: 1, to: 1, name: '' },
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFile = useCallback(async (f: File) => {
    if (!f.name.endsWith('.pdf') && f.type !== 'application/pdf') {
      toast.error('Only PDF files are accepted');
      return;
    }
    setLoading(true);
    try {
      const count = await getPageCount(f);
      setFile(f);
      setPageCount(count);
      setRanges([{ id: nanoid(), from: 1, to: count, name: '' }]);
    } catch {
      toast.error('Failed to read PDF');
    } finally {
      setLoading(false);
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

  const addRange = () => setRanges(prev => [...prev, { id: nanoid(), from: 1, to: pageCount, name: '' }]);
  const removeRange = (id: string) => setRanges(prev => prev.filter(r => r.id !== id));
  const updateRange = (id: string, changes: Partial<SplitRange>) =>
    setRanges(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r));

  const previewParts = (): number => {
    if (!pageCount) return 0;
    if (mode === 'ranges') return ranges.length;
    if (mode === 'every-n') return Math.ceil(pageCount / Math.max(1, everyN));
    return pageCount;
  };

  const handleSplit = async () => {
    if (!file) return;
    setSplitting(true);
    try {
      await splitPdf(file, mode, ranges, everyN);
      toast.success(previewParts() === 1 ? 'PDF downloaded' : `Split into ${previewParts()} files — downloaded as zip`);
    } catch (err) {
      console.error(err);
      toast.error('Split failed');
    } finally {
      setSplitting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
      setFile(null);
      setPageCount(0);
      setRanges([{ id: nanoid(), from: 1, to: 1, name: '' }]);
      setMode('ranges');
      setEveryN(1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Split PDF</DialogTitle>
        </DialogHeader>

        {/* Drop zone */}
        {!file ? (
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-accent/40 transition-colors"
          >
            <FilePlus2 size={24} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">Drop a PDF here or click to browse</p>
            {loading && <p className="text-xs text-primary mt-2">Reading file…</p>}
          </div>
        ) : (
          <div className="flex items-center justify-between p-2 rounded border bg-card text-sm">
            <span className="font-medium truncate flex-1 mr-2">{file.name}</span>
            <span className="text-xs text-muted-foreground shrink-0">{pageCount} pages</span>
            <button
              className="ml-3 text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => { setFile(null); setPageCount(0); }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleFileInput} />

        {file && (
          <>
            {/* Mode selector */}
            <div className="flex flex-col gap-1.5">
              {MODE_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-2 p-2.5 rounded border cursor-pointer transition-colors ${mode === opt.value ? 'border-primary bg-primary/5' : 'hover:bg-accent/40'}`}
                >
                  <input
                    type="radio"
                    className="mt-0.5 accent-primary"
                    checked={mode === opt.value}
                    onChange={() => setMode(opt.value)}
                  />
                  <div>
                    <p className="text-xs font-semibold">{opt.label}</p>
                    <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* Mode-specific controls */}
            {mode === 'every-n' && (
              <div className="flex items-center gap-3">
                <Label className="text-xs whitespace-nowrap">Pages per chunk</Label>
                <Input
                  type="number"
                  min={1}
                  max={pageCount}
                  value={everyN}
                  onChange={e => setEveryN(Math.max(1, Number(e.target.value)))}
                  className="h-7 w-20 text-xs"
                />
                <span className="text-xs text-muted-foreground">→ {previewParts()} file{previewParts() !== 1 ? 's' : ''}</span>
              </div>
            )}

            {mode === 'ranges' && (
              <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
                {ranges.map((r, i) => (
                  <div key={r.id} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Input
                        type="number" min={1} max={pageCount} value={r.from}
                        onChange={e => updateRange(r.id, { from: Number(e.target.value) })}
                        className="h-6 w-14 text-xs px-1"
                      />
                      <span className="text-xs text-muted-foreground">–</span>
                      <Input
                        type="number" min={1} max={pageCount} value={r.to}
                        onChange={e => updateRange(r.id, { to: Number(e.target.value) })}
                        className="h-6 w-14 text-xs px-1"
                      />
                    </div>
                    <Input
                      placeholder={`part${i + 1}`}
                      value={r.name}
                      onChange={e => updateRange(r.id, { name: e.target.value })}
                      className="h-6 text-xs flex-1 min-w-0"
                    />
                    <button
                      onClick={() => removeRange(r.id)}
                      disabled={ranges.length === 1}
                      className="text-muted-foreground hover:text-destructive disabled:opacity-30 shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addRange} className="h-7 text-xs w-full">
                  <Plus size={12} className="mr-1" /> Add range
                </Button>
              </div>
            )}

            {mode === 'each-page' && (
              <p className="text-xs text-muted-foreground">
                Will produce <span className="font-semibold text-foreground">{pageCount} PDF files</span> bundled into a single zip.
              </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                {previewParts()} output file{previewParts() !== 1 ? 's' : ''}
                {previewParts() > 1 ? ' → zip' : ''}
              </span>
              <Button size="sm" onClick={handleSplit} disabled={splitting}>
                <Scissors size={13} className="mr-1" />
                {splitting ? 'Splitting…' : 'Split & Download'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
