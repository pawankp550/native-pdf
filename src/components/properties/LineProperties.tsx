import React from 'react';
import { useAppDispatch } from '@/store/hooks';
import { updateElement } from '@/store/pdf-editor/slice';
import type { LineElement } from '@/store/pdf-editor/types/elements';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { NumberInput } from './NumberInput';
import { ColorPicker } from './ColorPicker';

interface Props { element: LineElement }

export const LineProperties = React.memo(({ element: el }: Props) => {
    const dispatch = useAppDispatch();
    const update = (changes: Partial<LineElement>) => dispatch(updateElement({ id: el.id, changes: changes as Partial<typeof el> }));

    const dashPresets: { label: string; value: number[] }[] = [
        { label: 'Solid', value: [] },
        { label: 'Dashed', value: [5, 5] },
        { label: 'Dotted', value: [2, 5] },
    ];
    const currentDash = JSON.stringify(el.dashArray);

    return (
        <AccordionItem value="style">
            <AccordionTrigger>Line Style</AccordionTrigger>
            <AccordionContent className='overflow-auto'>
                <div className="space-y-2.5">
                    <ColorPicker label="Color" value={el.strokeColor} onChange={v => update({ strokeColor: v })} />
                    <NumberInput label="Stroke Width" value={el.strokeWidth} min={1} max={20} onChange={v => update({ strokeWidth: v })} />
                    <div>
                        <Label>Dash Style</Label>
                        <Select value={currentDash} onValueChange={v => update({ dashArray: JSON.parse(v) })}>
                            <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {dashPresets.map(p => <SelectItem key={p.label} value={JSON.stringify(p.value)}>{p.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Line Cap</Label>
                        <Select value={el.lineCap} onValueChange={v => update({ lineCap: v as LineElement['lineCap'] })}>
                            <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="butt">Butt</SelectItem>
                                <SelectItem value="round">Round</SelectItem>
                                <SelectItem value="square">Square</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </AccordionContent>
        </AccordionItem>
    );
});
LineProperties.displayName = 'LineProperties';
