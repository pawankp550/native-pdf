import React from 'react';
import { useAppDispatch } from '@/store/hooks';
import { updateElement } from '@/store/pdf-editor/slice';
import type { QrCodeElement } from '@/store/pdf-editor/types/elements';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { NumberInput } from '@/components/properties/NumberInput';
import { ColorPicker } from '@/components/properties/ColorPicker';

interface Props {
    element: QrCodeElement;
}

export const QrCodeProperties = React.memo(({ element: el }: Props) => {
    const dispatch = useAppDispatch();

    const update = (changes: Partial<QrCodeElement>) =>
        dispatch(updateElement({ id: el.id, changes: changes as never }));

    return (
        <AccordionItem value="style">
            <AccordionTrigger className="text-xs font-medium py-2">QR Code</AccordionTrigger>
            <AccordionContent className="space-y-3 pb-3">
                <div>
                    <Label>URL / Text</Label>
                    <Input
                        className="mt-0.5 h-7 text-xs"
                        placeholder="https://example.com"
                        value={el.data}
                        onChange={e => update({ data: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <ColorPicker label="Foreground" value={el.fgColor} onChange={v => update({ fgColor: v })} />
                    <ColorPicker label="Background" value={el.bgColor} onChange={v => update({ bgColor: v })} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label>Error Level</Label>
                        <Select
                            value={el.errorLevel}
                            onValueChange={v => update({ errorLevel: v as QrCodeElement['errorLevel'] })}
                        >
                            <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="L">L – Low (7%)</SelectItem>
                                <SelectItem value="M">M – Medium (15%)</SelectItem>
                                <SelectItem value="Q">Q – Quartile (25%)</SelectItem>
                                <SelectItem value="H">H – High (30%)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <NumberInput label="Margin (cells)" value={el.margin} min={0} max={10} onChange={v => update({ margin: v })} />
                </div>
            </AccordionContent>
        </AccordionItem>
    );
});
QrCodeProperties.displayName = 'QrCodeProperties';
