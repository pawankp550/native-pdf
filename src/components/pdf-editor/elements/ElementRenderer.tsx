import React from 'react';
import type { CanvasElement, TableColumn } from '@/store/pdf-editor/types/elements';
import { TextElement } from './TextElement';
import { LineElement } from './LineElement';
import { RectangleElement } from './RectangleElement';
import { CircleElement } from './CircleElement';
import { CheckboxElement } from './CheckboxElement';
import { TableElement } from './TableElement';
import { SignatureElement } from './SignatureElement';
import { SignaturePadElement } from './SignaturePadElement';
import { ImageElement } from './ImageElement';
import { PageNumberElement } from './PageNumberElement';
import { QrCodeElement } from './QrCodeElement';
import { DateElement } from './DateElement';
import { HeadingElement } from './HeadingElement';

interface Props {
  element: CanvasElement;
  isEditing?: boolean;
  onCommitText?: (text: string) => void;
  onCommitTable?: (data: string[][], columns: TableColumn[]) => void;
}

export const ElementRenderer = React.memo(({ element, isEditing = false, onCommitText, onCommitTable }: Props) => {
  switch (element.type) {
    case 'text':
      return <TextElement element={element} isEditing={isEditing} onCommitText={onCommitText ?? (() => {})} />;
    case 'line':
      return <LineElement element={element} />;
    case 'rectangle':
      return <RectangleElement element={element} />;
    case 'circle':
      return <CircleElement element={element} />;
    case 'checkbox':
      return <CheckboxElement element={element} />;
    case 'table':
      return <TableElement element={element} isEditing={isEditing} onCommitTable={onCommitTable ?? (() => {})} />;
    case 'signature':
      return <SignatureElement element={element} />;
    case 'signature-pad':
      return <SignaturePadElement element={element} isEditing={isEditing} />;
    case 'image':
      return <ImageElement element={element} />;
    case 'page-number':
      return <PageNumberElement element={element} />;
    case 'qr-code':
      return <QrCodeElement element={element} />;
    case 'date':
      return <DateElement element={element} />;
    case 'heading':
      return <HeadingElement element={element} isEditing={isEditing} onCommitText={onCommitText ?? (() => {})} />;
    default:
      return null;
  }
});
ElementRenderer.displayName = 'ElementRenderer';
