import React, { useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { QrCode } from 'lucide-react';
import type { QrCodeElement as QrCodeElementType } from '@/store/pdf-editor/types/elements';

interface Props {
  element: QrCodeElementType;
}

export const QrCodeElement = React.memo(({ element: el }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const size = Math.min(el.width, el.height);

  useEffect(() => {
    if (!canvasRef.current || !el.data) return;
    QRCode.toCanvas(canvasRef.current, el.data, {
      width: Math.min(el.width, el.height),
      margin: el.margin,
      errorCorrectionLevel: el.errorLevel,
      color: { dark: el.fgColor, light: el.bgColor },
    }).catch(() => {/* invalid data — silently ignore */});
  }, [el.data, el.width, el.height, el.fgColor, el.bgColor, el.errorLevel, el.margin]);

  if (!el.data) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f3f4f6',
          border: '2px dashed #d1d5db',
          borderRadius: 4,
          color: '#9ca3af',
          gap: 4,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <QrCode size={24} />
        <span style={{ fontSize: 10 }}>Enter URL in panel</span>
      </div>
    );
  }

  // Wrap in a centring container so the canvas pixel dimensions are not distorted
  // by CSS stretching when the element box is not square.
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        userSelect: 'none',
        backgroundColor: el.bgColor,
      }}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ display: 'block', maxWidth: '100%', maxHeight: '100%' }}
      />
    </div>
  );
});
QrCodeElement.displayName = 'QrCodeElement';
