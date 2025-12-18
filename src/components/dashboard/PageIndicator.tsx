'use client';

import React from 'react';
import { DashboardPage } from '@/types/dashboard';

interface PageIndicatorProps {
    pages: DashboardPage[];
    currentIndex: number;
    onPageSelect: (index: number) => void;
    isEditMode?: boolean;
}

export default function PageIndicator({
    pages,
    currentIndex,
    onPageSelect,
    isEditMode = false
}: PageIndicatorProps) {
    if (pages.length <= 1) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2 bg-black/30 backdrop-blur-xl rounded-full border border-white/10">
            {pages.map((page, index) => (
                <button
                    key={page.id}
                    onClick={() => onPageSelect(index)}
                    className="group relative flex items-center justify-center"
                    aria-label={`Go to ${page.name}`}
                >
                    {/* Dot indicator */}
                    <div
                        className={`
              transition-all duration-300 rounded-full
              ${index === currentIndex
                                ? 'w-8 h-3 bg-white'
                                : 'w-3 h-3 bg-white/40 hover:bg-white/60'}
            `}
                    />

                    {/* Page name tooltip on hover */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="px-3 py-1.5 bg-zinc-900/95 backdrop-blur-xl text-white text-xs font-medium rounded-lg whitespace-nowrap shadow-xl border border-white/10">
                            {page.name}
                        </div>
                        <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-zinc-900/95 rotate-45 border-b border-r border-white/10" />
                    </div>
                </button>
            ))}

            {/* Page count indicator */}
            <div className="ml-1 pl-3 border-l border-white/20 text-white/50 text-xs font-medium">
                {currentIndex + 1} / {pages.length}
            </div>
        </div>
    );
}
