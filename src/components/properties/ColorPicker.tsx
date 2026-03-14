import React, { useState, useRef, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';

interface Props {
    value: string;
    onChange: (color: string) => void;
    label?: string;
}

export const ColorPicker = React.memo(({ value, onChange, label }: Props) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div className="relative" ref={ref}>
            {label && <label className="text-[10px] text-muted-foreground block mb-0.5">{label}</label>}
            <button
                type="button"
                className="flex items-center gap-1.5 h-7 w-full border border-input rounded px-2 bg-background hover:bg-accent text-xs"
                onClick={() => setOpen(o => !o)}
            >
                <span className="w-4 h-4 rounded border border-border flex-shrink-0" style={{ backgroundColor: value }} />
                <span className="font-mono">{value}</span>
            </button>
            {open && (
                <div className="absolute z-50 top-full mt-1 left-0 bg-popover border rounded shadow-lg p-2">
                    <HexColorPicker color={value} onChange={onChange} />
                    <input
                        className="mt-2 w-full text-xs border rounded px-2 h-6 font-mono bg-background"
                        value={value}
                        onChange={e => onChange(e.target.value)}
                    />
                </div>
            )}
        </div>
    );
});
ColorPicker.displayName = 'ColorPicker';
