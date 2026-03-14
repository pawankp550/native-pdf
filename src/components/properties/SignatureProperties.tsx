import React from 'react';
import { useAppDispatch } from '@/store/hooks';
import { updateElement } from '@/store/pdf-editor/slice';
import type { SignatureElement } from '@/store/pdf-editor/types/elements';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { NumberInput } from './NumberInput';
import { ColorPicker } from './ColorPicker';

interface Props { element: SignatureElement }

export const SignatureProperties = React.memo(({ element: el }: Props) => {
    const dispatch = useAppDispatch();
    const update = (changes: Partial<SignatureElement>) => dispatch(updateElement({ id: el.id, changes: changes as Partial<typeof el> }));

    const styles: { value: SignatureElement['style']; label: string; desc: string }[] = [
        { value: 'line-only', label: 'Line Only', desc: 'Underline with label' },
        { value: 'box', label: 'Box', desc: 'Bordered box' },
        { value: 'formal', label: 'Formal', desc: 'Signature/Name/Date' },
    ];

    return (
        <AccordionItem value="style">
            <AccordionTrigger>Signature Style</AccordionTrigger>
            <AccordionContent>
                <div className="space-y-2.5">
                    <div>
                        <Label>Label</Label>
                        <Input className="mt-0.5 h-7 text-xs" value={el.label} onChange={e => update({ label: e.target.value })} />
                    </div>
                    <div>
                        <Label>Style</Label>
                        <div className="flex flex-col gap-1 mt-1">
                            {styles.map(s => (
                                <button
                                    key={s.value}
                                    className={`text-left px-3 py-2 border rounded text-xs transition-colors ${el.style === s.value ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'}`}
                                    onClick={() => update({ style: s.value })}
                                >
                                    <span className="font-medium">{s.label}</span> — <span className="text-muted-foreground">{s.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <Label>Show Date</Label>
                        <Switch checked={el.showDate} onCheckedChange={v => update({ showDate: v })} />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label>Show Printed Name</Label>
                        <Switch checked={el.showPrintedName} onCheckedChange={v => update({ showPrintedName: v })} />
                    </div>
                    <ColorPicker label="Line Color" value={el.lineColor} onChange={v => update({ lineColor: v })} />
                    <NumberInput label="Font Size" value={el.labelFontSize} min={6} max={24} onChange={v => update({ labelFontSize: v })} />
                    <NumberInput label="Line Width" value={el.lineWidth} min={0.5} max={5} step={0.5} onChange={v => update({ lineWidth: v })} />
                </div>
            </AccordionContent>
        </AccordionItem>
    );
});
SignatureProperties.displayName = 'SignatureProperties';
