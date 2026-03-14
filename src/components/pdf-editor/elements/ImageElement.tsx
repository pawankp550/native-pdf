import React from 'react';
import { ImageIcon } from 'lucide-react';
import type { ImageElement as ImageElementType } from '@/store/pdf-editor/types/elements';

interface Props {
  element: ImageElementType;
}

export const ImageElement = React.memo(({ element: el }: Props) => {
  if (!el.src) {
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
        <ImageIcon size={24} />
        <span style={{ fontSize: 10 }}>Choose image in panel</span>
      </div>
    );
  }

  return (
    <img
      src={el.src}
      alt=""
      draggable={false}
      style={{
        width: '100%',
        height: '100%',
        objectFit: el.objectFit,
        display: 'block',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    />
  );
});
ImageElement.displayName = 'ImageElement';
