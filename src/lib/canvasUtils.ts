/**
 * Utilities for converting between grid positions and pixel positions
 * in the fixed canvas system.
 */

// Canvas and grid constants
export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;
export const GRID_COLS = 12;
export const GRID_ROWS = 8;
export const MARGIN = 16;

// Calculate cell dimensions
export const CELL_WIDTH = (CANVAS_WIDTH - (GRID_COLS + 1) * MARGIN) / GRID_COLS;
export const CELL_HEIGHT = (CANVAS_HEIGHT - (GRID_ROWS + 1) * MARGIN) / GRID_ROWS;

/**
 * Convert grid position to pixel position
 */
export function gridToPixel(gridX: number, gridY: number, gridW: number, gridH: number) {
    return {
        x: gridX * (CELL_WIDTH + MARGIN) + MARGIN,
        y: gridY * (CELL_HEIGHT + MARGIN) + MARGIN,
        w: gridW * CELL_WIDTH + (gridW - 1) * MARGIN,
        h: gridH * CELL_HEIGHT + (gridH - 1) * MARGIN,
    };
}

/**
 * Convert pixel position to grid position
 */
export function pixelToGrid(x: number, y: number, w: number, h: number) {
    return {
        x: Math.round((x - MARGIN) / (CELL_WIDTH + MARGIN)),
        y: Math.round((y - MARGIN) / (CELL_HEIGHT + MARGIN)),
        w: Math.round((w + MARGIN) / (CELL_WIDTH + MARGIN)),
        h: Math.round((h + MARGIN) / (CELL_HEIGHT + MARGIN)),
    };
}

/**
 * Clamp pixel position to stay within canvas bounds
 */
export function clampToCanvas(x: number, y: number, w: number, h: number) {
    const maxX = CANVAS_WIDTH - w - MARGIN;
    const maxY = CANVAS_HEIGHT - h - MARGIN;

    return {
        x: Math.max(MARGIN, Math.min(x, maxX)),
        y: Math.max(MARGIN, Math.min(y, maxY)),
        w,
        h,
    };
}
