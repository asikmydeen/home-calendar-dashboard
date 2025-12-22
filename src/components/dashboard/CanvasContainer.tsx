'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useDisplayMode } from '@/hooks/useDisplayMode';

// Fixed canvas dimensions (reference resolution)
export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;

interface CanvasContainerProps {
    children: React.ReactNode;
    isEditMode?: boolean;
}

/**
 * CanvasContainer - Fixed-size canvas that scales to fit any viewport
 * 
 * This component creates a 1920x1080 canvas that contains all dashboard widgets.
 * The canvas scales proportionally to fit the viewport while maintaining aspect ratio.
 * 
 * Similar to Mango Display's approach - design once, display everywhere.
 */
export default function CanvasContainer({ children, isEditMode = false }: CanvasContainerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const { dimensions } = useDisplayMode();

    useEffect(() => {
        const calculateScale = () => {
            const { width: viewportWidth, height: viewportHeight } = dimensions;

            // Calculate scale factors for both dimensions
            const scaleX = viewportWidth / CANVAS_WIDTH;
            const scaleY = viewportHeight / CANVAS_HEIGHT;

            // In edit mode: use min to fit entirely (may have letterboxing)
            // In display mode: use min to prevent cropping (same behavior for now)
            // We want the entire canvas visible at all times
            const newScale = Math.min(scaleX, scaleY);

            setScale(newScale);
        };

        calculateScale();
    }, [dimensions, isEditMode]);

    return (
        <div
            ref={containerRef}
            className="canvas-wrapper"
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
            }}
        >
            <div
                className="canvas-container"
                style={{
                    width: CANVAS_WIDTH,
                    height: CANVAS_HEIGHT,
                    transform: `scale(${scale})`,
                    transformOrigin: 'center center',
                    position: 'relative',
                }}
            >
                {children}
            </div>
        </div>
    );
}
