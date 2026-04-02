import React from 'react';
import { GripVertical, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { MergeEntry } from '@/utils/merge-pdf';

interface Props {
  entry: MergeEntry;
  index: number;
  draggingIndex: number | null;
  isDragOver: boolean;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragEnd: () => void;
  onRemove: (id: string) => void;
  onChangeRange: (id: string, from: number, to: number) => void;
}

export const MergeFileRow = React.memo(({
  entry, index, draggingIndex, isDragOver,
  onDragStart, onDragOver, onDragEnd,
  onRemove, onChangeRange,
}: Props) => {
  const from = Math.max(1, Math.min(entry.fromPage, entry.pageCount));
  const to = Math.max(from, Math.min(entry.toPage, entry.pageCount));
  const pageCount = to - from + 1;

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={e => { e.preventDefault(); onDragOver(index); }}
      onDragEnd={onDragEnd}
      style={{ opacity: draggingIndex === index ? 0.35 : 1 }}
      className={`flex items-center gap-2 p-2 rounded border bg-card select-none transition-colors ${
        isDragOver && draggingIndex !== index ? 'border-primary bg-primary/5' : 'border-border'
      }`}
    >
      <span className="text-[10px] text-muted-foreground font-mono w-4 text-center shrink-0">
        {index + 1}
      </span>

      <GripVertical size={14} className="text-muted-foreground cursor-grab shrink-0" />

      <span className="flex-1 text-xs font-medium truncate min-w-0" title={entry.file.name}>
        {entry.file.name}
      </span>

      <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
        {entry.pageCount}p
      </span>

      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[10px] text-muted-foreground">pp.</span>
        <Input
          type="number"
          min={1}
          max={entry.pageCount}
          value={entry.fromPage}
          onChange={e => onChangeRange(entry.id, Number(e.target.value), entry.toPage)}
          onBlur={e => onChangeRange(entry.id, Math.max(1, Math.min(Number(e.target.value), entry.pageCount)), entry.toPage)}
          className="h-6 w-12 text-xs px-1"
        />
        <span className="text-xs text-muted-foreground">–</span>
        <Input
          type="number"
          min={1}
          max={entry.pageCount}
          value={entry.toPage}
          onChange={e => onChangeRange(entry.id, entry.fromPage, Number(e.target.value))}
          onBlur={e => onChangeRange(entry.id, entry.fromPage, Math.max(entry.fromPage, Math.min(Number(e.target.value), entry.pageCount)))}
          className="h-6 w-12 text-xs px-1"
        />
        <span className="text-[10px] text-muted-foreground w-10 shrink-0">
          {pageCount === entry.pageCount ? 'all' : `${pageCount}p`}
        </span>
      </div>

      <button
        onClick={() => onRemove(entry.id)}
        className="shrink-0 text-muted-foreground hover:text-destructive"
        title="Remove"
      >
        <X size={13} />
      </button>
    </div>
  );
});
MergeFileRow.displayName = 'MergeFileRow';
