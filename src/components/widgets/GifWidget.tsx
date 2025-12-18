'use client';

import React, { useState } from 'react';
import { Frame } from '@/types/dashboard';
import { Image, Link } from 'lucide-react';

interface GifWidgetProps {
    frame: Frame;
    isEditMode?: boolean;
}

export default function GifWidget({ frame, isEditMode }: GifWidgetProps) {
    const gifUrl = frame.config?.url || '';
    const [error, setError] = useState(false);

    // Convert Giphy/Tenor share URLs to direct GIF URLs if needed
    const getDirectGifUrl = (url: string): string => {
        if (!url) return '';

        // Giphy share links
        if (url.includes('giphy.com/gifs/') && !url.endsWith('.gif')) {
            const match = url.match(/giphy\.com\/gifs\/(?:.*-)?([a-zA-Z0-9]+)(?:\?|$)/);
            if (match) {
                return `https://media.giphy.com/media/${match[1]}/giphy.gif`;
            }
        }

        // Already a direct GIF URL
        return url;
    };

    const directUrl = getDirectGifUrl(gifUrl);

    if (!gifUrl) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-white/40 gap-3 p-6">
                <Image className="w-12 h-12 opacity-50" />
                <p className="text-sm text-center">No GIF set</p>
                <p className="text-xs opacity-60 text-center">
                    {isEditMode
                        ? 'Click settings to add a GIF URL'
                        : 'Enter edit mode to configure'}
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-white/40 gap-3 p-6">
                <Link className="w-12 h-12 opacity-50" />
                <p className="text-sm text-center">Could not load GIF</p>
                <p className="text-xs opacity-60 text-center break-all px-4">
                    {gifUrl.substring(0, 50)}...
                </p>
            </div>
        );
    }

    return (
        <div className="h-full w-full flex items-center justify-center overflow-hidden bg-black/20 rounded-lg">
            <img
                src={directUrl}
                alt={frame.title || 'GIF'}
                className="max-w-full max-h-full object-contain"
                onError={() => setError(true)}
            />
        </div>
    );
}
