import React from 'react';
import { useAppDispatch } from '@/store/hooks';
import { updateElement } from '@/store/pdf-editor/slice';
import type { CheckboxElement } from '@/store/pdf-editor/types/elements';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { NumberInput } from './NumberInput';
import { ColorPicker } from './ColorPicker';

interface Props { element: CheckboxElement }

const CheckPreview = ({ style, checkColor }: { style: CheckboxElement['checkStyle']; checkColor: string }) => (
    <svg viewBox="0 0 12 12" width={16} height={16}>
        {style === 'check' && <polyline points="1,6 4,10 11,2" fill="none" stroke={checkColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
        {style === 'cross' && <>
            <line x1="1" y1="1" x2="11" y2="11" stroke={checkColor} strokeWidth="2" strokeLinecap="round" />
            <line x1="11" y1="1" x2="1" y2="11" stroke={checkColor} strokeWidth="2" strokeLinecap="round" />
        </>}
        {style === 'filled' && <rect x="0" y="0" width="12" height="12" fill={checkColor} />}
    </svg>
);

export const CheckboxProperties = React.memo(({ element: el }: Props) => {
    const dispatch = useAppDispatch();
    const update = (changes: Partial<CheckboxElement>) => dispatch(updateElement({ id: el.id, changes: changes as Partial<typeof el> }));

    return (
        <AccordionItem value="style">
            <AccordionTrigger>Checkbox Style</AccordionTrigger>
            <AccordionContent>
                <div className="space-y-2.5">
                    {/* Checked toggle with big preview */}
                    <div>
                        <Label>Checked</Label>
                        <div
                            className="mt-1 flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-accent"
                            onClick={() => update({ checked: !el.checked })}
                        >
                            <div
                                style={{ width: 28, height: 28, backgroundColor: el.fillColor, border: `${el.strokeWidth}px solid ${el.strokeColor}`, borderRadius: el.cornerRadius, position: 'relative', flexShrink: 0 }}
                            >
                                {el.checked && (
                                    <svg viewBox="0 0 12 12" style={{ position: 'absolute', inset: 2, width: 'calc(100% - 4px)', height: 'calc(100% - 4px)' }}>
                                        {el.checkStyle === 'check' && <polyline points="1,6 4,10 11,2" fill="none" stroke={el.checkColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
                                        {el.checkStyle === 'cross' && <>
                                            <line x1="1" y1="1" x2="11" y2="11" stroke={el.checkColor} strokeWidth="2" strokeLinecap="round" />
                                            <line x1="11" y1="1" x2="1" y2="11" stroke={el.checkColor} strokeWidth="2" strokeLinecap="round" />
                                        </>}
                                        {el.checkStyle === 'filled' && <rect x="0" y="0" width="12" height="12" fill={el.checkColor} />}
                                    </svg>
                                )}
                            </div>
                            <span className="text-sm">{el.checked ? 'Checked' : 'Unchecked'}</span>
                            <Switch checked={el.checked} onCheckedChange={v => update({ checked: v })} className="ml-auto" />
                        </div>
                    </div>

                    {/* Check style selector */}
                    <div>
                        <Label>Check Style</Label>
                        <div className="flex gap-2 mt-1">
                            {(['check', 'cross', 'filled'] as const).map(s => (
                                <button
                                    key={s}
                                    className={`flex-1 flex flex-col items-center gap-1 py-2 border rounded text-xs transition-colors ${el.checkStyle === s ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'}`}
                                    onClick={() => update({ checkStyle: s })}
                                >
                                    <CheckPreview style={s} checkColor={el.checkColor} />
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <ColorPicker label="Box Color" value={el.fillColor} onChange={v => update({ fillColor: v })} />
                    <ColorPicker label="Check Color" value={el.checkColor} onChange={v => update({ checkColor: v })} />
                    <ColorPicker label="Border Color" value={el.strokeColor} onChange={v => update({ strokeColor: v })} />
                    <NumberInput label="Border Width" value={el.strokeWidth} min={0} max={10} step={0.5} onChange={v => update({ strokeWidth: v })} />
                    <NumberInput label="Corner Radius" value={el.cornerRadius} min={0} max={20} onChange={v => update({ cornerRadius: v })} />
                </div>
            </AccordionContent>
        </AccordionItem>
    );
});
CheckboxProperties.displayName = 'CheckboxProperties';
