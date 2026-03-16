import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addPage, removePage, duplicatePage, reorderPages, setCurrentPage } from '@/store/pdf-editor/slice';
import { selectSortedPages, selectCurrentPageId } from '@/store/pdf-editor/selectors';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, MoreHorizontal, Trash2, Copy, ArrowUp, ArrowDown } from 'lucide-react';

const PAGE_PRESETS = [
    { label: 'A4 Portrait', width: 794, height: 1123 },
    { label: 'A4 Landscape', width: 1123, height: 794 },
    { label: 'Letter Portrait', width: 816, height: 1056 },
    { label: 'Letter Landscape', width: 1056, height: 816 },
    { label: 'Legal Portrait', width: 816, height: 1344 },
];

interface PageMenuProps {
    anchorEl: HTMLElement;
    totalPages: number;
    onClose: () => void;
    onDuplicate: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onDelete: () => void;
}

const PageContextMenu = ({ anchorEl, totalPages, onClose, onDuplicate, onMoveUp, onMoveDown, onDelete }: PageMenuProps) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const rect = anchorEl.getBoundingClientRect();
    const menuWidth = 144;
    const estimatedHeight = totalPages > 1 ? 140 : 110;

    const left = Math.min(rect.left, window.innerWidth - menuWidth - 8);
    const top = rect.top - estimatedHeight - 4;

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node) && !anchorEl.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [anchorEl, onClose]);

    return ReactDOM.createPortal(
        <div
            ref={menuRef}
            className="fixed z-[9999] w-36 bg-popover border rounded shadow-lg text-xs"
            style={{ left, top }}
        >
            <button className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-accent text-left" onClick={onDuplicate}>
                <Copy size={11} /> Duplicate
            </button>
            <button className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-accent text-left" onClick={onMoveUp}>
                <ArrowUp size={11} /> Move Up
            </button>
            <button className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-accent text-left" onClick={onMoveDown}>
                <ArrowDown size={11} /> Move Down
            </button>
            {totalPages > 1 && (
                <button className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-accent text-left text-destructive" onClick={onDelete}>
                    <Trash2 size={11} /> Delete
                </button>
            )}
        </div>,
        document.body
    );
};

export const PageStrip = React.memo(() => {
    const dispatch = useAppDispatch();
    const pages = useAppSelector(selectSortedPages);
    const currentPageId = useAppSelector(selectCurrentPageId);
    const [addOpen, setAddOpen] = useState(false);
    const [menuState, setMenuState] = useState<{ pageId: string; anchorEl: HTMLElement } | null>(null);
    const [selectedPreset, setSelectedPreset] = useState(0);

    const handleAddPage = () => {
        const preset = PAGE_PRESETS[selectedPreset] ?? PAGE_PRESETS[0];
        dispatch(addPage({ name: `Page ${pages.length + 1}`, width: preset.width, height: preset.height, backgroundColor: '#ffffff' }));
        setAddOpen(false);
    };

    const menuPage = menuState ? pages.find(p => p.id === menuState.pageId) : null;

    return (
        <footer className="h-[72px] border-t bg-background flex items-center px-3 gap-2 shrink-0 overflow-x-auto">
            {pages.map((page, idx) => (
                <div
                    key={page.id}
                    className={`group relative flex-shrink-0 flex flex-col items-center justify-center w-14 h-[52px] rounded border-2 cursor-pointer transition-colors ${page.id === currentPageId ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground bg-card'
                        }`}
                    onClick={() => dispatch(setCurrentPage(page.id))}
                >
                    <div className="w-8 h-10 bg-white border border-gray-200 rounded-sm shadow-sm flex items-center justify-center">
                        <span className="text-[8px] text-gray-400">{idx + 1}</span>
                    </div>
                    <button
                        className="absolute top-0.5 right-0.5 opacity-0 hover:opacity-100 group-hover:opacity-100 p-0.5 rounded hover:bg-muted"
                        style={{ opacity: menuState?.pageId === page.id ? 1 : undefined }}
                        onClick={e => {
                            e.stopPropagation();
                            setMenuState(menuState?.pageId === page.id ? null : { pageId: page.id, anchorEl: e.currentTarget });
                        }}
                    >
                        <MoreHorizontal size={10} />
                    </button>
                </div>
            ))}

            {menuState && menuPage && (
                <PageContextMenu
                    anchorEl={menuState.anchorEl}
                    totalPages={pages.length}
                    onClose={() => setMenuState(null)}
                    onDuplicate={() => { dispatch(duplicatePage(menuPage.id)); setMenuState(null); }}
                    onMoveUp={() => { dispatch(reorderPages({ pageId: menuPage.id, direction: 'up' })); setMenuState(null); }}
                    onMoveDown={() => { dispatch(reorderPages({ pageId: menuPage.id, direction: 'down' })); setMenuState(null); }}
                    onDelete={() => { dispatch(removePage(menuPage.id)); setMenuState(null); }}
                />
            )}

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
        </footer>
    );
});
PageStrip.displayName = 'PageStrip';
