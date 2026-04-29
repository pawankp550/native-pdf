import React from 'react';
import { useAppDispatch } from '@/store/hooks';
import { updateElement } from '@/store/pdf-editor/slice';
import type { SignaturePadElement } from '@/store/pdf-editor/types/elements';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Eraser } from 'lucide-react';
import { NumberInput } from './NumberInput';
import { ColorPicker } from './ColorPicker';

interface Props { element: SignaturePadElement }

export const SignaturePadProperties = React.memo(({ element: el }: Props) => {
    const dispatch = useAppDispatch();
    const update = (changes: Partial<SignaturePadElement>) =>
        dispatch(updateElement({ id: el.id, changes: changes as Partial<typeof el> }));

    return (
        <AccordionItem value="style">
            <AccordionTrigger>Signature Pad</AccordionTrigger>
            <AccordionContent className='overflow-auto'>
                <div className="space-y-2.5">
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 text-xs"
                        onClick={() => update({ dataUrl: '' })}
                    >
                        <Eraser size={13} />
                        Clear Signature
                    </Button>
                    <ColorPicker label="Pen Color" value={el.penColor} onChange={v => update({ penColor: v })} />
                    <NumberInput label="Pen Width" value={el.penWidth} min={1} max={20} onChange={v => update({ penWidth: v })} />
                    <ColorPicker label="Background" value={el.backgroundColor} onChange={v => update({ backgroundColor: v })} />
                    <ColorPicker label="Border Color" value={el.borderColor} onChange={v => update({ borderColor: v })} />
                    <NumberInput label="Border Width" value={el.borderWidth} min={0} max={10} onChange={v => update({ borderWidth: v })} />
                </div>
            </AccordionContent>
        </AccordionItem>
    );
});
SignaturePadProperties.displayName = 'SignaturePadProperties';
