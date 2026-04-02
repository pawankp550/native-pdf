export interface DragState {
  type: 'move' | 'resize' | 'rotate';
  elementId: string;
  startX: number;
  startY: number;
  startElX: number;
  startElY: number;
  startElW?: number;
  startElH?: number;
  direction?: string;
  startAngle?: number;
  startRotate?: number;
  elCenterX?: number;
  elCenterY?: number;
}

export interface RubberBand {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}
