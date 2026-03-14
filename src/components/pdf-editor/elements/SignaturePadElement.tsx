import React, { useRef, useEffect, useCallback } from 'react';
import { PenLine } from 'lucide-react';
import { useAppDispatch } from '@/store/hooks';
import { updateElement } from '@/store/pdf-editor/slice';
import type { SignaturePadElement as SignaturePadElementType } from '@/store/pdf-editor/types/elements';

interface Props {
    element: SignaturePadElementType;
    isEditing?: boolean;
}

export const SignaturePadElement = React.memo(({ element: el, isEditing = false }: Props) => {
    const dispatch = useAppDispatch();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);

    // When entering edit mode, paint the existing dataUrl onto the canvas
    useEffect(() => {
        if (!isEditing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (el.dataUrl) {
            const img = new Image();
            img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            img.src = el.dataUrl;
        }
    }, [isEditing, el.dataUrl]);

    const getPos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        // Scale from client pixels to canvas buffer pixels (handles zoom)
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        e.stopPropagation();
        if (!isEditing) return;
        isDrawing.current = true;
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    }, [isEditing, getPos]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        e.stopPropagation();
        if (!isEditing || !isDrawing.current) return;
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        const pos = getPos(e);
        ctx.lineWidth = el.penWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = el.penColor;
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    }, [isEditing, el.penColor, el.penWidth, getPos]);

    const commitDrawing = useCallback(() => {
        if (!isDrawing.current) return;
        isDrawing.current = false;
        const dataUrl = canvasRef.current?.toDataURL('image/png') ?? '';
        dispatch(updateElement({ id: el.id, changes: { dataUrl } as Partial<SignaturePadElementType> }));
    }, [dispatch, el.id]);

    const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        e.stopPropagation();
        commitDrawing();
    }, [commitDrawing]);

    const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        e.stopPropagation();
        commitDrawing();
    }, [commitDrawing]);

    const borderStyle = el.borderWidth > 0 ? `${el.borderWidth}px solid ${el.borderColor}` : 'none';
    const bgColor = el.backgroundColor === 'transparent' ? undefined : el.backgroundColor;

    if (!isEditing) {
        return (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    border: borderStyle,
                    boxSizing: 'border-box',
                    backgroundColor: bgColor,
                    position: 'relative',
                    overflow: 'hidden',
                    pointerEvents: 'none',
                    userSelect: 'none',
                }}
            >
                {el.dataUrl ? (
                    <img
                        src={el.dataUrl}
                        alt="Signature"
                        draggable={false}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                    />
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#9ca3af' }}>
                        <PenLine size={18} />
                        <span style={{ fontSize: 10 }}>Double-click to sign</span>
                    </div>
                )}
            </div>
        );
    }

    return (
        <canvas
            ref={canvasRef}
            width={el.width}
            height={el.height}
            style={{
                display: 'block',
                width: '100%',
                height: '100%',
                border: borderStyle || '1px dashed #3b82f6',
                boxSizing: 'border-box',
                backgroundColor: bgColor ?? '#ffffff',
                cursor: 'crosshair',
                touchAction: 'none',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
        />
    );
});
SignaturePadElement.displayName = 'SignaturePadElement';
