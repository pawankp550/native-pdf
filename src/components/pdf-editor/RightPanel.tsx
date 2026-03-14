import React from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updatePage } from '@/store/pdf-editor/slice';
import { selectCurrentPage, selectSelectedElements, selectSelectedElementIds } from '@/store/pdf-editor/selectors';
import { Accordion } from '@/components/ui/accordion';
import { CommonProperties } from '@/components/properties/CommonProperties';
import { TextProperties } from '@/components/properties/TextProperties';
import { LineProperties } from '@/components/properties/LineProperties';
import { RectangleProperties } from '@/components/properties/RectangleProperties';
import { CircleProperties } from '@/components/properties/CircleProperties';
import { CheckboxProperties } from '@/components/properties/CheckboxProperties';
import { SignatureProperties } from '@/components/properties/SignatureProperties';
import { SignaturePadProperties } from '@/components/properties/SignaturePadProperties';
import { TableProperties } from '@/components/properties/TableProperties';
import { ImageProperties } from '@/components/properties/ImageProperties';
import { PageNumberProperties } from '@/components/properties/PageNumberProperties';
import { QrCodeProperties } from '@/components/properties/QrCodeProperties';
import { DateProperties } from '@/components/properties/DateProperties';
import { HeadingProperties } from '@/components/properties/HeadingProperties';
import { ColorPicker } from '@/components/properties/ColorPicker';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { NumberInput } from '@/components/properties/NumberInput';
import type { CanvasElement } from '@/store/pdf-editor/types/elements';

const PAGE_PRESETS = [
    { label: 'A4 Portrait', width: 794, height: 1123 },
    { label: 'A4 Landscape', width: 1123, height: 794 },
    { label: 'Letter Portrait', width: 816, height: 1056 },
    { label: 'Letter Landscape', width: 1056, height: 816 },
    { label: 'Legal Portrait', width: 816, height: 1344 },
    { label: 'Custom', width: 0, height: 0 },
];

function StylePanel({ element }: { element: CanvasElement }) {
    switch (element.type) {
        case 'text': return <TextProperties element={element} />;
        case 'line': return <LineProperties element={element} />;
        case 'rectangle': return <RectangleProperties element={element} />;
        case 'circle': return <CircleProperties element={element} />;
        case 'checkbox': return <CheckboxProperties element={element} />;
        case 'table': return <TableProperties element={element} />;
        case 'signature': return <SignatureProperties element={element} />;
        case 'signature-pad': return <SignaturePadProperties element={element} />;
        case 'image': return <ImageProperties element={element} />;
        case 'page-number': return <PageNumberProperties element={element} />;
        case 'qr-code': return <QrCodeProperties element={element} />;
        case 'date': return <DateProperties element={element} />;
        case 'heading': return <HeadingProperties element={element} />;
        default: return null;
    }
}

export const RightPanel = React.memo(() => {
    const dispatch = useAppDispatch();
    const selectedElements = useAppSelector(selectSelectedElements);
    const selectedIds = useAppSelector(selectSelectedElementIds);
    const currentPage = useAppSelector(selectCurrentPage);

    // No selection: show page properties
    if (selectedElements.length === 0) {
        if (!currentPage) return null;
        const currentPreset = PAGE_PRESETS.findIndex(p => p.width === currentPage.width && p.height === currentPage.height);
        const selectedPreset = currentPreset >= 0 ? currentPreset : PAGE_PRESETS.length - 1;

        return (
            <aside className="w-[280px] border-l bg-background flex flex-col shrink-0 overflow-y-auto">
                <div className="p-3 border-b">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Page Settings</p>
                </div>
                <div className="p-3 space-y-3">
                    <div>
                        <Label>Page Size</Label>
                        <Select
                            value={String(selectedPreset)}
                            onValueChange={v => {
                                const preset = PAGE_PRESETS[Number(v)];
                                if (preset && preset.width > 0) {
                                    dispatch(updatePage({ id: currentPage.id, changes: { width: preset.width, height: preset.height } }));
                                }
                            }}
                        >
                            <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {PAGE_PRESETS.map((p, i) => <SelectItem key={p.label} value={String(i)}>{p.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <NumberInput label="Width (px)" value={currentPage.width} min={100} onChange={v => dispatch(updatePage({ id: currentPage.id, changes: { width: v } }))} />
                        <NumberInput label="Height (px)" value={currentPage.height} min={100} onChange={v => dispatch(updatePage({ id: currentPage.id, changes: { height: v } }))} />
                    </div>
                    <ColorPicker label="Background Color" value={currentPage.backgroundColor} onChange={v => dispatch(updatePage({ id: currentPage.id, changes: { backgroundColor: v } }))} />
                </div>
            </aside>
        );
    }

    const firstEl = selectedElements[0];
    const allSameType = selectedElements.every(e => e.type === firstEl.type);

    return (
        <aside className="w-[280px] border-l bg-background flex flex-col shrink-0 overflow-y-auto">
            <div className="p-3 border-b">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {selectedElements.length === 1 ? firstEl.type.charAt(0).toUpperCase() + firstEl.type.slice(1) : `${selectedElements.length} elements`} Properties
                </p>
            </div>
            <div className="p-3">
                <Accordion type="multiple" defaultValue={['layout', 'arrange', 'style']}>
                    <CommonProperties elements={selectedElements} selectedIds={selectedIds} />
                    {allSameType && selectedElements.length === 1 && <StylePanel element={firstEl} />}
                </Accordion>
            </div>
        </aside>
    );
});
RightPanel.displayName = 'RightPanel';
