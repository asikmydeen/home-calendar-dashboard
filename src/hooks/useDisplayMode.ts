'use client';

import { useState, useEffect, useCallback } from 'react';

export type Orientation = 'portrait' | 'landscape';

export interface DisplayDimensions {
    width: number;
    height: number;
}

// Canvas constants for fixed-size layout
export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;

/**
 * Hook for detecting and managing display orientation and dimensions.
 * Useful for wall-mounted displays that need to adapt to screen orientation.
 */
export function useDisplayMode() {
    const [orientation, setOrientation] = useState<Orientation>('landscape');
    const [dimensions, setDimensions] = useState<DisplayDimensions>({
        width: typeof window !== 'undefined' ? window.innerWidth : 1920,
        height: typeof window !== 'undefined' ? window.innerHeight : 1080,
    });

    useEffect(() => {
        // Initialize on mount
        const updateDimensions = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            setDimensions({ width, height });
            setOrientation(width > height ? 'landscape' : 'portrait');
        };

        // Set initial values
        updateDimensions();

        // Listen for resize events
        window.addEventListener('resize', updateDimensions);

        // Also listen for orientation change on mobile devices
        window.addEventListener('orientationchange', () => {
            // Small delay to allow browser to update dimensions
            setTimeout(updateDimensions, 100);
        });

        return () => {
            window.removeEventListener('resize', updateDimensions);
            window.removeEventListener('orientationchange', updateDimensions);
        };
    }, []);

    /**
     * Calculate optimal row height to fill the viewport
     * @param totalRows - Maximum number of rows to display
     * @param headerHeight - Height reserved for header/toolbar (default 100px)
     */
    const calculateRowHeight = useCallback((totalRows: number, headerHeight: number = 100, verticalMargin: number = 16) => {
        const availableHeight = dimensions.height - headerHeight;
        // Subtract total separate space (totalRows - 1 gaps) from available height
        const totalMarginSpace = Math.max(0, totalRows - 1) * verticalMargin;
        return Math.floor((availableHeight - totalMarginSpace) / totalRows);
    }, [dimensions.height]);

    /**
     * Calculate scale factor for fixed canvas to fit viewport
     * @returns Scale factor to apply to canvas (via CSS transform: scale())
     */
    const calculateCanvasScale = useCallback(() => {
        const scaleX = dimensions.width / CANVAS_WIDTH;
        const scaleY = dimensions.height / CANVAS_HEIGHT;
        // Use minimum to ensure entire canvas fits (may have letterboxing)
        return Math.min(scaleX, scaleY);
    }, [dimensions.width, dimensions.height]);

    /**
     * Get the current breakpoint based on width
     */
    const getCurrentBreakpoint = useCallback(() => {
        const width = dimensions.width;
        if (width >= 1200) return 'lg';
        if (width >= 996) return 'md';
        if (width >= 768) return 'sm';
        if (width >= 480) return 'xs';
        return 'xxs';
    }, [dimensions.width]);

    return {
        orientation,
        dimensions,
        calculateRowHeight,
        calculateCanvasScale,
        getCurrentBreakpoint,
        isPortrait: orientation === 'portrait',
        isLandscape: orientation === 'landscape',
    };
}
