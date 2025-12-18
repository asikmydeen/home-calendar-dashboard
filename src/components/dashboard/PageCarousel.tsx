'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { DashboardPage, Frame } from '@/types/dashboard';

interface PageCarouselProps {
    pages: DashboardPage[];
    currentPageIndex: number;
    onPageChange: (index: number) => void;
    children: (page: DashboardPage, index: number) => React.ReactNode;
}

export default function PageCarousel({
    pages,
    currentPageIndex,
    onPageChange,
    children
}: PageCarouselProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const isScrollingRef = useRef(false);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);

    // Scroll to current page when index changes
    useEffect(() => {
        if (containerRef.current && !isScrollingRef.current) {
            const pageWidth = containerRef.current.clientWidth;
            containerRef.current.scrollTo({
                left: currentPageIndex * pageWidth,
                behavior: 'smooth'
            });
        }
    }, [currentPageIndex]);

    // Handle scroll end to detect page change
    const handleScroll = useCallback(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const pageWidth = container.clientWidth;
        const scrollLeft = container.scrollLeft;
        const newIndex = Math.round(scrollLeft / pageWidth);

        if (newIndex !== currentPageIndex && newIndex >= 0 && newIndex < pages.length) {
            isScrollingRef.current = true;
            onPageChange(newIndex);
            setTimeout(() => { isScrollingRef.current = false; }, 100);
        }
    }, [currentPageIndex, pages.length, onPageChange]);

    // Touch handlers for better swipe control
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };
    }, []);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (!touchStartRef.current || !containerRef.current) return;

        const touchEnd = {
            x: e.changedTouches[0].clientX,
            y: e.changedTouches[0].clientY
        };

        const deltaX = touchStartRef.current.x - touchEnd.x;
        const deltaY = Math.abs(touchStartRef.current.y - touchEnd.y);
        const threshold = containerRef.current.clientWidth * 0.2; // 20% of page width

        // Only trigger if horizontal swipe and not too much vertical movement
        if (Math.abs(deltaX) > threshold && deltaY < 100) {
            if (deltaX > 0 && currentPageIndex < pages.length - 1) {
                onPageChange(currentPageIndex + 1);
            } else if (deltaX < 0 && currentPageIndex > 0) {
                onPageChange(currentPageIndex - 1);
            }
        }

        touchStartRef.current = null;
    }, [currentPageIndex, pages.length, onPageChange]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' && currentPageIndex < pages.length - 1) {
                onPageChange(currentPageIndex + 1);
            } else if (e.key === 'ArrowLeft' && currentPageIndex > 0) {
                onPageChange(currentPageIndex - 1);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentPageIndex, pages.length, onPageChange]);

    return (
        <div
            ref={containerRef}
            className="page-carousel flex overflow-x-auto overflow-y-hidden h-full w-full"
            onScroll={handleScroll}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{
                scrollSnapType: 'x mandatory',
                scrollBehavior: 'smooth',
                WebkitOverflowScrolling: 'touch'
            }}
        >
            {pages.map((page, index) => (
                <div
                    key={page.id}
                    className="page-slide flex-shrink-0 w-full h-full"
                    style={{ scrollSnapAlign: 'start' }}
                >
                    {children(page, index)}
                </div>
            ))}
        </div>
    );
}
