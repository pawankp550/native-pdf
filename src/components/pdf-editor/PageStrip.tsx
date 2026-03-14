import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addPage, removePage, duplicatePage, reorderPages, updatePage, setCurrentPage } from '@/store/pdf-editor/slice';
import { selectSortedPages, selectCurrentPageId } from '@/store/pdf-editor/selectors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, MoreHorizontal, Trash2, Copy, ArrowUp, ArrowDown, Pencil } from 'lucide-react';

const PAGE_PRESETS = [
    { label: 'A4 Portrait', width: 794, height: 1123 },
    { label: 'A4 Landscape', width: 1123, height: 794 },
    { label: 'Letter Portrait', width: 816, height: 1056 },
    { label: 'Letter Landscape', width: 1056, height: 816 },
    { label: 'Legal Portrait', width: 816, height: 1344 },
];

export const PageStrip = React.memo(() => {
    const dispatch = useAppDispatch();
    const pages = useAppSelector(selectSortedPages);
    const currentPageId = useAppSelector(selectCurrentPageId);
    const [addOpen, setAddOpen] = useState(false);
    const [menuPageId, setMenuPageId] = useState<string | null>(null);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [selectedPreset, setSelectedPreset] = useState(0);

    const handleAddPage = () => {
        const preset = PAGE_PRESETS[selectedPreset] ?? PAGE_PRESETS[0];
        dispatch(addPage({ name: `Page ${pages.length + 1}`, width: preset.width, height: preset.height, backgroundColor: '#ffffff' }));
        setAddOpen(false);
    };

    return (
        <footer className="h-[72px] border-t bg-background flex items-center px-3 gap-2 shrink-0 overflow-x-auto">
            {pages.map((page, idx) => (
                <div
                    key={page.id}
                    className={`relative flex-shrink-0 flex flex-col items-center justify-center w-14 h-[52px] rounded border-2 cursor-pointer transition-colors ${page.id === currentPageId ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground bg-card'
                        }`}
                    onClick={() => dispatch(setCurrentPage(page.id))}
                >
                    <div className="w-8 h-10 bg-white border border-gray-200 rounded-sm shadow-sm flex items-center justify-center">
                        <span className="text-[8px] text-gray-400">{idx + 1}</span>
                    </div>
                    <button
                        className="absolute top-0.5 right-0.5 opacity-0 hover:opacity-100 group-hover:opacity-100 p-0.5 rounded hover:bg-muted"
                        onClick={e => { e.stopPropagation(); setMenuPageId(menuPageId === page.id ? null : page.id); }}
                        style={{ opacity: menuPageId === page.id ? 1 : undefined }}
                    >
                        <MoreHorizontal size={10} />
                    </button>

                    {/* Context menu */}
                    {menuPageId === page.id && (
                        <div
                            className="absolute bottom-full mb-1 left-0 z-50 w-36 bg-popover border rounded shadow-lg text-xs"
                            onMouseLeave={() => setMenuPageId(null)}
                        >
                            <button className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-accent text-left" onClick={e => {
                                e.stopPropagation();
                                setRenameValue(page.name); setRenamingId(page.id); setMenuPageId(null);
                            }}>
                                <Pencil size={11} /> Rename
                            </button>
                            <button className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-accent text-left" onClick={e => {
                                e.stopPropagation(); dispatch(duplicatePage(page.id)); setMenuPageId(null);
                            }}>
                                <Copy size={11} /> Duplicate
                            </button>
                            <button className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-accent text-left" onClick={e => {
                                e.stopPropagation(); dispatch(reorderPages({ pageId: page.id, direction: 'up' })); setMenuPageId(null);
                            }}>
                                <ArrowUp size={11} /> Move Up
                            </button>
                            <button className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-accent text-left" onClick={e => {
                                e.stopPropagation(); dispatch(reorderPages({ pageId: page.id, direction: 'down' })); setMenuPageId(null);
                            }}>
                                <ArrowDown size={11} /> Move Down
                            </button>
                            {pages.length > 1 && (
                                <button className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-accent text-left text-destructive" onClick={e => {
                                    e.stopPropagation(); dispatch(removePage(page.id)); setMenuPageId(null);
                                }}>
                                    <Trash2 size={11} /> Delete
                                </button>
                            )}
                        </div>
                    )}
                </div>
            ))}

            <Button variant="ghost" size="icon" className="flex-shrink-0 h-[52px] w-10" onClick={() => setAddOpen(true)} title="Add page">
                <Plus size={16} />
            </Button>

            {/* Add Page Dialog */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Add New Page</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-1.5">
                            {PAGE_PRESETS.map((preset, i) => (
                                <button
                                    key={preset.label}
                                    className={`text-left px-3 py-2 rounded border text-sm transition-colors ${i === selectedPreset ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'}`}
                                    onClick={() => setSelectedPreset(i)}
                                >
                                    {preset.label} <span className="text-muted-foreground text-xs">({preset.width}×{preset.height}px)</span>
                                </button>
                            ))}
                        </div>
                        <Button className="w-full" onClick={handleAddPage}>Add Page</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Rename Dialog */}
            <Dialog open={!!renamingId} onOpenChange={open => { if (!open) setRenamingId(null); }}>
                <DialogContent className="max-w-xs">
                    <DialogHeader><DialogTitle>Rename Page</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                        <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} autoFocus onKeyDown={e => {
                            if (e.key === 'Enter') { if (renamingId) dispatch(updatePage({ id: renamingId, changes: { name: renameValue } })); setRenamingId(null); }
                        }} />
                        <Button className="w-full" onClick={() => {
                            if (renamingId) dispatch(updatePage({ id: renamingId, changes: { name: renameValue } }));
                            setRenamingId(null);
                        }}>Rename</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </footer>
    );
});
PageStrip.displayName = 'PageStrip';
