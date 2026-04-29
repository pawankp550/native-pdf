import React from 'react';
import { useAppDispatch } from '@/store/hooks';
import { updateElement, reorderElements, alignElements } from '@/store/pdf-editor/slice';
import type { CanvasElement } from '@/store/pdf-editor/types/elements';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { NumberInput } from './NumberInput';
import { AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical, AlignEndVertical, BringToFront, SendToBack, ArrowUp, ArrowDown } from 'lucide-react';

interface Props {
    elements: CanvasElement[];
    selectedIds: string[];
}

export const CommonProperties = React.memo(({ elements, selectedIds }: Props) => {
    const dispatch = useAppDispatch();
    const el = elements[0];
    if (!el) return null;
    const multi = elements.length > 1;

    const update = (changes: Partial<CanvasElement>) => {
        for (const e of elements) {
            dispatch(updateElement({ id: e.id, changes }));
        }
    };

    return (
        <Accordion type="multiple" defaultValue={['layout', 'arrange']} className="w-full">
            {/* Layout */}
            <AccordionItem value="layout">
                <AccordionTrigger>Layout</AccordionTrigger>
                <AccordionContent className='overflow-auto'>
                    <div className="space-y-2">
                        {!multi && (
                            <>
                                <div>
                                    <Label>Name</Label>
                                    <Input
                                        className="mt-0.5 h-7 text-xs"
                                        value={el.name}
                                        onChange={e => update({ name: e.target.value } as Partial<CanvasElement>)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <NumberInput label="X" value={Math.round(el.position.x)} onChange={v => update({ position: { x: v, y: el.position.y } } as Partial<CanvasElement>)} />
                                    <NumberInput label="Y" value={Math.round(el.position.y)} onChange={v => update({ position: { x: el.position.x, y: v } } as Partial<CanvasElement>)} />
                                </div>
                            </>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                            <NumberInput label="W" value={Math.round(el.width)} min={1} onChange={v => update({ width: v } as Partial<CanvasElement>)} />
                            <NumberInput label="H" value={Math.round(el.height)} min={1} onChange={v => update({ height: v } as Partial<CanvasElement>)} />
                        </div>
                        {!multi && (
                            <NumberInput label="Rotation" value={el.rotate} suffix="°" onChange={v => update({ rotate: v } as Partial<CanvasElement>)} />
                        )}
                        <div>
                            <Label>Opacity</Label>
                            <div className="flex items-center gap-2 mt-1">
                                <Slider
                                    min={0} max={1} step={0.01} value={[el.opacity]}
                                    onValueChange={([v]) => update({ opacity: v } as Partial<CanvasElement>)}
                                    className="flex-1"
                                />
                                <span className="text-xs w-8 text-right">{Math.round(el.opacity * 100)}%</span>
                            </div>
                        </div>
                        {!multi && (
                            <div className="flex items-center justify-between">
                                <Label>Locked</Label>
                                <Switch checked={el.locked} onCheckedChange={v => update({ locked: v } as Partial<CanvasElement>)} />
                            </div>
                        )}
                        {!multi && (
                            <div className="flex items-center justify-between">
                                <Label>Visible</Label>
                                <Switch checked={el.visible} onCheckedChange={v => update({ visible: v } as Partial<CanvasElement>)} />
                            </div>
                        )}
                    </div>
                </AccordionContent>
            </AccordionItem>

            {/* Arrange */}
            <AccordionItem value="arrange">
                <AccordionTrigger>Arrange</AccordionTrigger>
                <AccordionContent className='overflow-auto'>
                    <div className="space-y-2">
                        {!multi && (
                            <div className="grid grid-cols-4 gap-1">
                                <Button variant="outline" size="sm" onClick={() => dispatch(reorderElements({ id: el.id, direction: 'front' }))} title="Bring to Front"><BringToFront size={12} /></Button>
                                <Button variant="outline" size="sm" onClick={() => dispatch(reorderElements({ id: el.id, direction: 'forward' }))} title="Bring Forward"><ArrowUp size={12} /></Button>
                                <Button variant="outline" size="sm" onClick={() => dispatch(reorderElements({ id: el.id, direction: 'backward' }))} title="Send Backward"><ArrowDown size={12} /></Button>
                                <Button variant="outline" size="sm" onClick={() => dispatch(reorderElements({ id: el.id, direction: 'back' }))} title="Send to Back"><SendToBack size={12} /></Button>
                            </div>
                        )}
                        {multi && (
                            <>
                                <p className="text-[10px] text-muted-foreground">Align selected elements</p>
                                <div className="grid grid-cols-3 gap-1">
                                    <Button variant="outline" size="sm" onClick={() => dispatch(alignElements({ ids: selectedIds, alignment: 'left' }))} title="Align Left"><AlignLeft size={12} /></Button>
                                    <Button variant="outline" size="sm" onClick={() => dispatch(alignElements({ ids: selectedIds, alignment: 'center' }))} title="Align Center"><AlignCenter size={12} /></Button>
                                    <Button variant="outline" size="sm" onClick={() => dispatch(alignElements({ ids: selectedIds, alignment: 'right' }))} title="Align Right"><AlignRight size={12} /></Button>
                                    <Button variant="outline" size="sm" onClick={() => dispatch(alignElements({ ids: selectedIds, alignment: 'top' }))} title="Align Top"><AlignStartVertical size={12} /></Button>
                                    <Button variant="outline" size="sm" onClick={() => dispatch(alignElements({ ids: selectedIds, alignment: 'middle' }))} title="Align Middle"><AlignCenterVertical size={12} /></Button>
                                    <Button variant="outline" size="sm" onClick={() => dispatch(alignElements({ ids: selectedIds, alignment: 'bottom' }))} title="Align Bottom"><AlignEndVertical size={12} /></Button>
                                </div>
                            </>
                        )}
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
});
CommonProperties.displayName = 'CommonProperties';
