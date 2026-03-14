import React from 'react';
import { useAppDispatch } from '@/store/hooks';
import { updateElement } from '@/store/pdf-editor/slice';
import type { PageNumberElement } from '@/store/pdf-editor/types/elements';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { NumberInput } from './NumberInput';
import { ColorPicker } from './ColorPicker';

interface Props {
    element: PageNumberElement;
}

const PRESETS = [
    { label: 'Page {n} of {total}', value: 'Page {n} of {total}' },
    { label: '{n} / {total}', value: '{n} / {total}' },
    { label: 'Page {n}', value: 'Page {n}' },
    { label: '- {n} -', value: '- {n} -' },
    { label: '{n}', value: '{n}' },
];

export const PageNumberProperties = React.memo(({ element: el }: Props) => {
    const dispatch = useAppDispatch();
    const update = (changes: Partial<PageNumberElement>) =>
        dispatch(updateElement({ id: el.id, changes: changes as never }));

    return (
        <AccordionItem value="style">
            <AccordionTrigger className="text-xs font-medium py-2">Page Number</AccordionTrigger>
            <AccordionContent className="space-y-3 pb-3">
                {/* Format presets */}
                <div>
                    <Label>Format Preset</Label>
                    <Select value={PRESETS.find(p => p.value === el.format)?.value ?? '__custom__'}
                        onValueChange={v => { if (v !== '__custom__') update({ format: v }); }}>
                        <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {PRESETS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                            <SelectItem value="__custom__">Custom…</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Custom format */}
                <div>
                    <Label>Format String</Label>
                    <Input
                        value={el.format}
                        onChange={e => update({ format: e.target.value })}
                        className="mt-0.5 h-7 text-xs"
                        placeholder="Page {n} of {total}"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                        Use <code className="bg-muted px-0.5 rounded">{'{n}'}</code> for page number,{' '}
                        <code className="bg-muted px-0.5 rounded">{'{total}'}</code> for total pages.
                    </p>
                </div>

                {/* Font */}
                <div className="grid grid-cols-2 gap-2">
                    <NumberInput label="Font Size" value={el.fontSize} min={6} max={48} onChange={v => update({ fontSize: v })} />
                    <div>
                        <Label>Weight</Label>
                        <Select value={el.fontWeight} onValueChange={v => update({ fontWeight: v as 'normal' | 'bold' })}>
                            <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="bold">Bold</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div>
                    <Label>Font Family</Label>
                    <Select value={el.fontFamily} onValueChange={v => update({ fontFamily: v as PageNumberElement['fontFamily'] })}>
                        <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Helvetica">Helvetica</SelectItem>
                            <SelectItem value="Times">Times</SelectItem>
                            <SelectItem value="Courier">Courier</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <ColorPicker label="Text Color" value={el.fontColor} onChange={v => update({ fontColor: v })} />
                <ColorPicker label="Background" value={el.backgroundColor === 'transparent' ? '#ffffff' : el.backgroundColor}
                    onChange={v => update({ backgroundColor: v })} />

                {/* Alignment */}
                <div>
                    <Label>Text Align</Label>
                    <Select value={el.textAlign} onValueChange={v => update({ textAlign: v as 'left' | 'center' | 'right' })}>
                        <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="left">Left</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <NumberInput label="Padding" value={el.padding} min={0} max={20} onChange={v => update({ padding: v })} />
            </AccordionContent>
        </AccordionItem>
    );
});
PageNumberProperties.displayName = 'PageNumberProperties';
