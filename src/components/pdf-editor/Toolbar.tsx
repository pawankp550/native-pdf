import React, { useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setZoom, setTemplateName, setShowGrid, undo, redo, markSaved, loadTemplateState } from '@/store/pdf-editor/slice';
import { selectZoom, selectTemplateName, selectIsDirty, selectShowGrid, selectCanUndo, selectCanRedo, selectPages, selectElements } from '@/store/pdf-editor/selectors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generatePdf } from '@/utils/pdf-generator';
import {
    Undo2, Redo2, ZoomIn, ZoomOut, Grid3x3, Eye, Download, Upload, FileDown, Moon, Sun, Circle
} from 'lucide-react';
import type { Page } from '@/store/pdf-editor/types/state';
import type { CanvasElement } from '@/store/pdf-editor/types/elements';
import { toast } from 'sonner';

interface TemplateFile {
    version: string;
    templateName: string;
    savedAt: string;
    pages: Page[];
    elements: Record<string, CanvasElement>;
}

interface ToolbarProps {
    darkMode: boolean;
    onToggleDark: () => void;
}

const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

export const Toolbar = React.memo(({ darkMode, onToggleDark }: ToolbarProps) => {
    const dispatch = useAppDispatch();
    const zoom = useAppSelector(selectZoom);
    const templateName = useAppSelector(selectTemplateName);
    const isDirty = useAppSelector(selectIsDirty);
    const showGrid = useAppSelector(selectShowGrid);
    const canUndo = useAppSelector(selectCanUndo);
    const canRedo = useAppSelector(selectCanRedo);
    const pages = useAppSelector(selectPages);
    const elements = useAppSelector(selectElements);

    const loadRef = useRef<HTMLInputElement>(null);
    const [editingName, setEditingName] = useState(false);
    const [nameValue, setNameValue] = useState(templateName);
    const [exporting, setExporting] = useState(false);
    const [previewing, setPreviewing] = useState(false);

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

    const handleExportPdf = async () => {
        setExporting(true);
        try {
            const bytes = await generatePdf(pages, elements);
            const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${templateName.replace(/\s+/g, '-')}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('PDF exported');
        } catch (err) {
            console.error(err);
            toast.error('PDF export failed');
        } finally {
            setExporting(false);
        }
    };

    const handlePreviewPdf = async () => {
        setPreviewing(true);
        try {
            const bytes = await generatePdf(pages, elements);
            const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const tab = window.open(url, '_blank');
            // Revoke the object URL once the new tab has loaded it
            if (tab) {
                tab.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
            }
            toast.success('Preview opened in new tab');
        } catch (err) {
            console.error(err);
            toast.error('Preview failed');
        } finally {
            setPreviewing(false);
        }
    };

    const zoomPercent = Math.round(zoom * 100);

    return (
        <header className="h-12 border-b bg-background flex items-center px-3 gap-2 shrink-0 z-10">
            {/* Left */}
            <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-primary text-sm whitespace-nowrap">PDF Editor</span>
                <span className="text-muted-foreground">/</span>
                {editingName ? (
                    <Input
                        value={nameValue}
                        autoFocus
                        className="h-6 w-40 text-sm"
                        onChange={e => setNameValue(e.target.value)}
                        onBlur={() => {
                            dispatch(setTemplateName(nameValue));
                            setEditingName(false);
                        }}
                        onKeyDown={e => {
                            if (e.key === 'Enter') { dispatch(setTemplateName(nameValue)); setEditingName(false); }
                            if (e.key === 'Escape') { setNameValue(templateName); setEditingName(false); }
                        }}
                    />
                ) : (
                    <button
                        className="text-sm font-medium hover:text-primary truncate max-w-[160px]"
                        onClick={() => { setNameValue(templateName); setEditingName(true); }}
                    >
                        {templateName}
                    </button>
                )}
                {isDirty && (
                    <span title="Unsaved changes">
                        <Circle size={6} className="fill-orange-400 text-orange-400" />
                    </span>
                )}
            </div>

            <div className="flex-1" />

            {/* Center */}
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

                <Button variant="ghost" size="icon" onClick={handlePreviewPdf} disabled={previewing} title="Preview PDF in new tab">
                    <Eye size={15} />
                </Button>
            </div>

            <div className="flex-1" />

            {/* Right */}
            <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="icon" onClick={onToggleDark} title="Toggle dark mode">
                    {darkMode ? <Sun size={15} /> : <Moon size={15} />}
                </Button>
                <Button variant="outline" size="sm" onClick={handleSaveTemplate} title="Save template as JSON">
                    <Download size={13} className="mr-1" /> Save
                </Button>
                <Button variant="outline" size="sm" onClick={() => loadRef.current?.click()} title="Load template from JSON">
                    <Upload size={13} className="mr-1" /> Load
                </Button>
                <input ref={loadRef} type="file" accept=".json" className="hidden" onChange={handleLoadTemplate} />
                <Button size="sm" onClick={handleExportPdf} disabled={exporting} title="Export as PDF">
                    <FileDown size={13} className="mr-1" /> {exporting ? 'Exporting…' : 'Export PDF'}
                </Button>
            </div>
        </header>
    );
});
Toolbar.displayName = 'Toolbar';
