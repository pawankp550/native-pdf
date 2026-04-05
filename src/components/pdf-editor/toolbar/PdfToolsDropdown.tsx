import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { MergePdfDialog } from '@/components/merge-pdf/MergePdfDialog';
import { SplitPdfDialog } from '@/components/split-pdf/SplitPdfDialog';
import { ExtractPagesDialog } from '@/components/extract-pages/ExtractPagesDialog';
import { Merge, Scissors, FileOutput, ChevronDown } from 'lucide-react';
import type { EditorAction } from '@/App';

interface Props {
  initialAction?: EditorAction;
}

export const PdfToolsDropdown = ({ initialAction }: Props) => {
  const [mergeOpen, setMergeOpen] = useState(initialAction === 'merge');
  const [splitOpen, setSplitOpen] = useState(initialAction === 'split');
  const [extractOpen, setExtractOpen] = useState(initialAction === 'extract');

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="text-foreground" style={{ border: '1.5px solid transparent', backgroundImage: 'linear-gradient(hsl(var(--background)), hsl(var(--background))), linear-gradient(to right, #f43f5e, #7c3aed)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
            PDF Tools <ChevronDown size={13} className="ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => setMergeOpen(true)}>
            <Merge size={13} className="text-blue-500 shrink-0" /> Merge PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSplitOpen(true)}>
            <Scissors size={13} className="text-emerald-500 shrink-0" /> Split PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setExtractOpen(true)}>
            <FileOutput size={13} className="text-rose-500 shrink-0" /> Extract Pages
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <MergePdfDialog open={mergeOpen} onClose={() => setMergeOpen(false)} />
      <SplitPdfDialog open={splitOpen} onClose={() => setSplitOpen(false)} />
      <ExtractPagesDialog open={extractOpen} onClose={() => setExtractOpen(false)} />
    </>
  );
};
