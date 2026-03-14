import React from 'react';

interface Props {
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
    step?: number;
    label?: string;
    suffix?: string;
    className?: string;
}

export const NumberInput = React.memo(({ value, onChange, min, max, step = 1, label, suffix, className }: Props) => {
    const clamp = (v: number) => {
        if (min !== undefined && v < min) return min;
        if (max !== undefined && v > max) return max;
        return v;
    };

    return (
        <div className={className}>
            {label && <label className="text-[10px] text-muted-foreground block mb-0.5">{label}</label>}
            <div className="flex h-7 border border-input rounded overflow-hidden bg-background">
                <button
                    type="button"
                    className="px-1.5 text-muted-foreground hover:bg-accent text-xs border-r border-input"
                    onMouseDown={e => { e.preventDefault(); onChange(clamp(value - step)); }}
                >−</button>
                <input
                    type="number"
                    className="flex-1 min-w-0 text-center text-xs bg-transparent outline-none px-1"
                    value={value}
                    min={min}
                    max={max}
                    step={step}
                    onChange={e => onChange(clamp(Number(e.target.value)))}
                />
                {suffix && <span className="flex items-center pr-1.5 text-xs text-muted-foreground">{suffix}</span>}
                <button
                    type="button"
                    className="px-1.5 text-muted-foreground hover:bg-accent text-xs border-l border-input"
                    onMouseDown={e => { e.preventDefault(); onChange(clamp(value + step)); }}
                >+</button>
            </div>
        </div>
    );
});
NumberInput.displayName = 'NumberInput';
