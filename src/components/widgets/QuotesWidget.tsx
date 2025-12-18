'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Frame } from '@/types/dashboard';
import { Quote, QuoteCategory, QUOTE_CATEGORIES, getRandomQuote, getQuotesByCategory } from '@/data/quotes';
import { RefreshCw, Quote as QuoteIcon } from 'lucide-react';

interface QuotesWidgetProps {
    frame: Frame;
    isEditMode?: boolean;
}

export default function QuotesWidget({ frame, isEditMode }: QuotesWidgetProps) {
    const category = (frame.config?.category || 'all') as QuoteCategory | 'all';
    const autoRotate = frame.config?.autoRotate ?? true;
    const rotateInterval = frame.config?.rotateInterval || 30000; // 30 seconds default

    const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);

    const getNewQuote = useCallback(() => {
        setIsAnimating(true);
        setTimeout(() => {
            const newQuote = category === 'all'
                ? getRandomQuote()
                : getRandomQuote(category as QuoteCategory);
            setCurrentQuote(newQuote);
            setIsAnimating(false);
        }, 300);
    }, [category]);

    // Initial quote
    useEffect(() => {
        getNewQuote();
    }, [category]);

    // Auto-rotate
    useEffect(() => {
        if (!autoRotate) return;
        const timer = setInterval(getNewQuote, rotateInterval);
        return () => clearInterval(timer);
    }, [autoRotate, rotateInterval, getNewQuote]);

    if (!currentQuote) return null;

    const categoryInfo = QUOTE_CATEGORIES.find(c => c.id === currentQuote.category);

    return (
        <div className="h-full flex flex-col justify-center items-center p-6 text-center relative overflow-hidden">
            {/* Decorative quote marks */}
            <div className="absolute top-4 left-4 text-6xl opacity-10 text-white/30 font-serif select-none">
                "
            </div>
            <div className="absolute bottom-4 right-4 text-6xl opacity-10 text-white/30 font-serif select-none rotate-180">
                "
            </div>

            {/* Quote content */}
            <div className={`transition-all duration-300 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                {/* Category badge */}
                <div className="mb-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs text-white/60">
                        <span>{categoryInfo?.emoji || '📖'}</span>
                        <span>{categoryInfo?.label || 'Quote'}</span>
                    </span>
                </div>

                {/* Quote text */}
                <blockquote className="text-lg md:text-xl lg:text-2xl font-medium text-white/90 leading-relaxed mb-4 italic">
                    "{currentQuote.text}"
                </blockquote>

                {/* Source */}
                <cite className="text-sm text-white/50 not-italic flex items-center justify-center gap-2">
                    <span className="w-8 h-px bg-white/30" />
                    {currentQuote.source}
                    <span className="w-8 h-px bg-white/30" />
                </cite>
            </div>

            {/* Refresh button */}
            <button
                onClick={getNewQuote}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                title="New quote"
            >
                <RefreshCw className="w-4 h-4" />
            </button>
        </div>
    );
}
