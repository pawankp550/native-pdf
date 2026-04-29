import React from 'react';
import { useAppDispatch } from '@/store/hooks';
import { updateElement } from '@/store/pdf-editor/slice';
import type { RectangleElement } from '@/store/pdf-editor/types/elements';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { NumberInput } from './NumberInput';
import { ColorPicker } from './ColorPicker';

interface Props { element: RectangleElement }

export const RectangleProperties = React.memo(({ element: el }: Props) => {
    const dispatch = useAppDispatch();
    const update = (changes: Partial<RectangleElement>) => dispatch(updateElement({ id: el.id, changes: changes as Partial<typeof el> }));

    return (
        <AccordionItem value="style">
            <AccordionTrigger>Rectangle Style</AccordionTrigger>
            <AccordionContent className='overflow-auto'>
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                        <Label>Transparent Fill</Label>
                        <Switch checked={el.transparent} onCheckedChange={v => update({ transparent: v })} />
                    </div>
                    {!el.transparent && (
                        <>
                            <ColorPicker label="Fill Color" value={el.fillColor} onChange={v => update({ fillColor: v })} />
                            <div>
                                <Label>Fill Opacity</Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <Slider min={0} max={1} step={0.01} value={[el.fillOpacity]} onValueChange={([v]) => update({ fillOpacity: v })} className="flex-1" />
                                    <span className="text-xs w-8 text-right">{Math.round(el.fillOpacity * 100)}%</span>
                                </div>
                            </div>
                        </>
                    )}
                    <ColorPicker label="Border Color" value={el.strokeColor} onChange={v => update({ strokeColor: v })} />
                    <NumberInput label="Border Width" value={el.strokeWidth} min={0} max={20} onChange={v => update({ strokeWidth: v })} />
                    <NumberInput label="Corner Radius" value={el.cornerRadius} min={0} max={200} onChange={v => update({ cornerRadius: v })} />
                </div>
            </AccordionContent>
        </AccordionItem>
    );
});
RectangleProperties.displayName = 'RectangleProperties';
