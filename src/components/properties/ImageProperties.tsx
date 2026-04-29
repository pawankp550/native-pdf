import React, { useRef } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { updateElement } from '@/store/pdf-editor/slice';
import type { ImageElement } from '@/store/pdf-editor/types/elements';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ImageIcon, Trash2 } from 'lucide-react';

interface Props {
    element: ImageElement;
}

export const ImageProperties = React.memo(({ element: el }: Props) => {
    const dispatch = useAppDispatch();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const update = (changes: Partial<ImageElement>) =>
        dispatch(updateElement({ id: el.id, changes: changes as never }));

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = evt => {
            const src = evt.target?.result as string;
            if (src) update({ src });
        };
        reader.readAsDataURL(file);
        // reset so same file can be re-selected
        e.target.value = '';
    };

    return (
        <AccordionItem value="style">
            <AccordionTrigger className="text-xs font-medium py-2">Image</AccordionTrigger>
            <AccordionContent className="space-y-3 pb-3 overflow-auto">
                {/* Preview thumbnail */}
                {el.src && (
                    <div className="w-full rounded overflow-hidden border" style={{ height: 80 }}>
                        <img
                            src={el.src}
                            alt="preview"
                            className="w-full h-full"
                            style={{ objectFit: 'contain' }}
                        />
                    </div>
                )}

                {/* Choose / replace image */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={handleFileChange}
                />
                <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-7 text-xs gap-1.5"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <ImageIcon size={12} />
                    {el.src ? 'Replace Image' : 'Choose Image'}
                </Button>

                {el.src && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-7 text-xs gap-1.5 text-destructive hover:text-destructive"
                        onClick={() => update({ src: '' })}
                    >
                        <Trash2 size={12} />
                        Remove Image
                    </Button>
                )}

                {/* Object fit */}
                <div>
                    <Label>Fit</Label>
                    <Select
                        value={el.objectFit}
                        onValueChange={v => update({ objectFit: v as ImageElement['objectFit'] })}
                    >
                        <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="contain">Contain (fit inside)</SelectItem>
                            <SelectItem value="cover">Cover (fill, crop)</SelectItem>
                            <SelectItem value="fill">Stretch (fill exactly)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </AccordionContent>
        </AccordionItem>
    );
});
ImageProperties.displayName = 'ImageProperties';
