import React, { useState, useCallback, useRef } from 'react';
import { nanoid } from '@reduxjs/toolkit';
import { FilePlus2, Merge, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MergeFileRow } from './MergeFileRow';
import { getPageCount, mergePdfs } from '@/utils/merge-pdf';
import type { MergeEntry } from '@/utils/merge-pdf';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const MergePdfDialog = ({ open, onClose }: Props) => {
  const [entries, setEntries] = useState<MergeEntry[]>([]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [merging, setMerging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragOverIndex = useRef<number | null>(null);

  const addFiles = useCallback(async (files: File[]) => {
    const pdfs = files.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (!pdfs.length) { toast.error('Only PDF files are accepted'); return; }
    setLoading(true);
    try {
      const newEntries = await Promise.all(
        pdfs.map(async file => {
          const pageCount = await getPageCount(file);
          return { id: nanoid(), file, pageCount, fromPage: 1, toPage: pageCount } satisfies MergeEntry;
        })
      );
      setEntries(prev => [...prev, ...newEntries]);
    } catch {
      toast.error('Failed to read one or more PDF files');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = '';
  }, [addFiles]);

  const handleRemove = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const handleChangeRange = useCallback((id: string, from: number, to: number) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, fromPage: from, toPage: to } : e));
  }, []);

  const handleDragStart = useCallback((index: number) => {
    setDraggingIndex(index);
    dragOverIndex.current = index;
  }, []);

  const handleDragOver = useCallback((index: number) => {
    dragOverIndex.current = index;
    setDropTargetIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    const from = draggingIndex;
    const to = dragOverIndex.current;
    if (from !== null && to !== null && from !== to) {
      setEntries(prev => {
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
    }
    setDraggingIndex(null);
    setDropTargetIndex(null);
    dragOverIndex.current = null;
  }, [draggingIndex]);

  const handleMerge = async () => {
    if (entries.length < 2) { toast.error('Add at least 2 PDF files'); return; }
    setMerging(true);
    try {
      const bytes = await mergePdfs(entries);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'merged.pdf';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF merged and downloaded');
    } catch (err) {
      console.error(err);
      toast.error('Merge failed');
    } finally {
      setMerging(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) { onClose(); setEntries([]); }
  };

  const totalPages = entries.reduce((sum, e) => {
    const from = Math.max(1, Math.min(e.fromPage, e.pageCount));
    const to = Math.max(from, Math.min(e.toPage, e.pageCount));
    return sum + (to - from + 1);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Merge PDFs</DialogTitle>
        </DialogHeader>

        {/* Drop zone — full when empty, compact strip when files exist */}
        {entries.length === 0 ? (
          <div
            onDragOver={e => { e.preventDefault(); setIsDragActive(true); }}
            onDragLeave={() => setIsDragActive(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-accent/60' : 'hover:border-primary hover:bg-accent/40'
            }`}
          >
            <FilePlus2 size={24} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">Drop PDF files here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">Multiple files · drag to reorder · set page range per file</p>
            {loading && <p className="text-xs text-primary mt-2">Reading files…</p>}
          </div>
        ) : (
          <div
            onDragOver={e => { e.preventDefault(); setIsDragActive(true); }}
            onDragLeave={() => setIsDragActive(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-2 px-3 py-2 rounded-md border border-dashed cursor-pointer text-xs transition-colors ${
              isDragActive ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
            }`}
          >
            <Plus size={13} />
            <span>{loading ? 'Reading files…' : 'Add more PDF files'}</span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          className="hidden"
          onChange={handleFileInput}
        />

        {/* File list */}
        {entries.length > 0 && (
          <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
            {entries.map((entry, index) => (
              <MergeFileRow
                key={entry.id}
                entry={entry}
                index={index}
                draggingIndex={draggingIndex}
                isDragOver={dropTargetIndex === index}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onRemove={handleRemove}
                onChangeRange={handleChangeRange}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">
            {entries.length > 0
              ? `${entries.length} file${entries.length !== 1 ? 's' : ''} · ${totalPages} page${totalPages !== 1 ? 's' : ''} in output`
              : 'No files added'}
          </span>
          <div className="flex gap-2">
            {entries.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setEntries([])}>
                Clear all
              </Button>
            )}
            <Button size="sm" onClick={handleMerge} disabled={merging || entries.length < 2}>
              <Merge size={13} className="mr-1" />
              {merging ? 'Merging…' : 'Merge & Download'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
