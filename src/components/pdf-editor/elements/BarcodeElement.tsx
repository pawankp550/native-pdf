import React, { useRef, useEffect, useState } from 'react';
import JsBarcode from 'jsbarcode';
import type { BarcodeElement as BarcodeElementType } from '@/store/pdf-editor/types/elements';

interface Props { element: BarcodeElementType }

export const BarcodeElement = React.memo(({ element: el }: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!el.value.trim()) { setInvalid(false); return; }
    if (!svgRef.current) return;
    try {
      JsBarcode(svgRef.current, el.value, {
        format: el.format,
        lineColor: el.lineColor,
        background: el.background,
        displayValue: el.displayValue,
        fontSize: el.fontSize,
        margin: el.margin,
        width: 1.5,
        height: Math.max(10, el.height - (el.displayValue ? el.fontSize + el.margin * 2 + 4 : el.margin * 2)),
      });
      setInvalid(false);
    } catch {
      setInvalid(true);
    }
  }, [el.value, el.format, el.lineColor, el.background, el.displayValue, el.fontSize, el.margin, el.height]);

  if (!el.value.trim() || invalid) {
    return (
      <div style={{
        width: '100%', height: '100%',
        background: el.background,
        border: '2px dashed #d1d5db',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#9ca3af', fontSize: 11,
      }}>
        {invalid ? 'Invalid value' : 'Barcode'}
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
});
BarcodeElement.displayName = 'BarcodeElement';
