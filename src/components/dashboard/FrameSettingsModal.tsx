'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Frame, FrameType, DashboardPage } from '@/types/dashboard';
import { X, Save, ArrowRightLeft } from 'lucide-react';
import { CalendarModuleSettings } from './CalendarModuleSettings';

interface FrameSettingsModalProps {
    frame: Frame | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (frame: Frame) => void;
    pages?: DashboardPage[];
    currentPageIndex?: number;
    onMoveToPage?: (frameId: string, targetPageIndex: number) => void;
}

export default function FrameSettingsModal({
    frame,
    isOpen,
    onClose,
    onSave,
    pages = [],
    currentPageIndex = 0,
    onMoveToPage
}: FrameSettingsModalProps) {
    const [title, setTitle] = useState('');
    const [config, setConfig] = useState<Record<string, any>>({});
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (frame) {
            setTitle(frame.title || '');
            setConfig(frame.config || {});
        }
    }, [frame]);

    if (!isOpen || !frame || !mounted) return null;

    const handleSave = () => {
        onSave({
            ...frame,
            title,
            config
        });
        onClose();
    };

    const renderConfigFields = () => {
        switch (frame.type) {
            case 'web':
                return (
                    <div className="space-y-3">
                        <label className="block">
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">URL</span>
                            <input
                                type="url"
                                value={config.url || ''}
                                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                                placeholder="https://example.com"
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </label>
                    </div>
                );

            case 'video':
                return (
                    <div className="space-y-3">
                        <label className="block">
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">YouTube Video ID</span>
                            <input
                                type="text"
                                value={config.videoId || ''}
                                onChange={(e) => setConfig({ ...config, videoId: e.target.value })}
                                placeholder="jfKfPfyJRdk"
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </label>
                        <p className="text-xs text-zinc-500">Enter just the video ID from the YouTube URL (e.g., from youtube.com/watch?v=<strong>jfKfPfyJRdk</strong>)</p>
                    </div>
                );

            case 'music':
                return (
                    <div className="space-y-3">
                        <label className="block">
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Spotify Embed URL</span>
                            <input
                                type="url"
                                value={config.spotifyUrl || ''}
                                onChange={(e) => setConfig({ ...config, spotifyUrl: e.target.value })}
                                placeholder="https://open.spotify.com/embed/playlist/..."
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </label>
                        <p className="text-xs text-zinc-500">Get this from Spotify: Share → Embed → Copy embed code → extract the src URL</p>
                    </div>
                );

            case 'photos':
                return (
                    <div className="space-y-3">
                        <label className="block">
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Photo Album URL (Google Photos)</span>
                            <input
                                type="url"
                                value={config.albumUrl || ''}
                                onChange={(e) => setConfig({ ...config, albumUrl: e.target.value })}
                                placeholder="https://photos.google.com/share/..."
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </label>
                        <label className="block">
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Slideshow Interval (seconds)</span>
                            <input
                                type="number"
                                min="3"
                                max="60"
                                value={config.interval || 10}
                                onChange={(e) => setConfig({ ...config, interval: parseInt(e.target.value) })}
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </label>
                    </div>
                );

            case 'calendar':
                return <CalendarModuleSettings config={config} setConfig={setConfig} />;

            case 'clock':
                const clockStyles = [
                    { id: 'minimal', name: 'Minimal', desc: 'Clean & modern' },
                    { id: 'bold', name: 'Bold', desc: 'Chunky numbers' },
                    { id: 'retro', name: 'Retro', desc: 'Flip clock style' },
                    { id: 'neon', name: 'Neon', desc: 'Glowing effect' },
                    { id: 'analog', name: 'Analog', desc: 'Classic clock face' },
                ];
                const accentColors = ['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

                return (
                    <div className="space-y-4">
                        {/* Clock Style */}
                        <div>
                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 block mb-2">Clock Style</span>
                            <div className="grid grid-cols-3 gap-2">
                                {clockStyles.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => setConfig({ ...config, style: s.id })}
                                        className={`p-3 rounded-xl text-center transition-all ${(config.style || 'neon') === s.id
                                            ? 'bg-purple-600/20 border-2 border-purple-500'
                                            : 'bg-zinc-100 dark:bg-zinc-800 border-2 border-transparent hover:border-zinc-300 dark:hover:border-zinc-600'
                                            }`}
                                    >
                                        <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{s.name}</p>
                                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">{s.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Accent Color */}
                        <div>
                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 block mb-2">Accent Color</span>
                            <div className="flex gap-2">
                                {accentColors.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setConfig({ ...config, accentColor: color })}
                                        className={`w-8 h-8 rounded-full transition-transform ${(config.accentColor || '#a855f7') === color
                                            ? 'ring-2 ring-zinc-900 dark:ring-white ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 scale-110'
                                            : 'hover:scale-110'
                                            }`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Options */}
                        <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={config.show24Hour || false}
                                    onChange={(e) => setConfig({ ...config, show24Hour: e.target.checked })}
                                    className="rounded border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                                />
                                <span className="text-sm text-zinc-700 dark:text-zinc-300">24-hour</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={config.showSeconds || false}
                                    onChange={(e) => setConfig({ ...config, showSeconds: e.target.checked })}
                                    className="rounded border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                                />
                                <span className="text-sm text-zinc-700 dark:text-zinc-300">Seconds</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={config.showDate !== false}
                                    onChange={(e) => setConfig({ ...config, showDate: e.target.checked })}
                                    className="rounded border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                                />
                                <span className="text-sm text-zinc-700 dark:text-zinc-300">Date</span>
                            </label>
                        </div>
                    </div>
                );

            case 'quotes':
                const quoteCategories = [
                    { id: 'all', name: 'All', emoji: '🎲' },
                    { id: 'quran', name: 'Quran', emoji: '📖' },
                    { id: 'hadith', name: 'Hadith', emoji: '🕌' },
                    { id: 'motivational', name: 'Motivational', emoji: '💪' },
                    { id: 'leadership', name: 'Leadership', emoji: '👑' },
                    { id: 'wisdom', name: 'Wisdom', emoji: '🦉' },
                    { id: 'kids', name: 'Kids', emoji: '🌟' },
                    { id: 'gratitude', name: 'Gratitude', emoji: '🙏' },
                    { id: 'family', name: 'Family', emoji: '💕' },
                ];

                return (
                    <div className="space-y-4">
                        <div>
                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 block mb-2">Quote Category</span>
                            <div className="grid grid-cols-3 gap-2">
                                {quoteCategories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setConfig({ ...config, category: cat.id })}
                                        className={`p-2 rounded-lg text-center transition-all ${(config.category || 'all') === cat.id
                                            ? 'bg-purple-600/20 border-2 border-purple-500'
                                            : 'bg-zinc-100 dark:bg-zinc-800 border-2 border-transparent hover:border-zinc-300 dark:hover:border-zinc-600'
                                            }`}
                                    >
                                        <span className="text-lg">{cat.emoji}</span>
                                        <p className="text-xs text-zinc-700 dark:text-zinc-200 mt-1">{cat.name}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={config.autoRotate !== false}
                                onChange={(e) => setConfig({ ...config, autoRotate: e.target.checked })}
                                className="rounded border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                            />
                            <span className="text-sm text-zinc-700 dark:text-zinc-300">Auto-rotate quotes</span>
                        </label>
                        <label className="block">
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Rotate Interval (seconds)</span>
                            <input
                                type="number"
                                min="5"
                                max="120"
                                value={(config.rotateInterval || 30000) / 1000}
                                onChange={(e) => setConfig({ ...config, rotateInterval: parseInt(e.target.value) * 1000 })}
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </label>
                    </div>
                );

            case 'gif':
                return (
                    <div className="space-y-3">
                        <label className="block">
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">GIF URL</span>
                            <input
                                type="url"
                                value={config.url || ''}
                                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                                placeholder="https://media.giphy.com/media/.../giphy.gif"
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </label>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Paste any GIF URL from Giphy, Tenor, or direct image links</p>
                        {config.url && (
                            <div className="mt-3 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                                <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-2">Preview:</p>
                                <img src={config.url} alt="GIF Preview" className="max-h-32 rounded" />
                            </div>
                        )}
                    </div>
                );

            case 'notes':
            case 'tasks':
            default:
                return (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        No additional settings available for this widget type.
                    </p>
                );
        }
    };

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ pointerEvents: 'auto' }}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        Edit {frame.type.charAt(0).toUpperCase() + frame.type.slice(1)} Widget
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-zinc-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-4 space-y-4">
                    {/* Title field - common for all */}
                    <label className="block">
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Widget Title</span>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={frame.type.charAt(0).toUpperCase() + frame.type.slice(1)}
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </label>

                    {/* Type-specific config */}
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">Widget Settings</h3>
                        {renderConfigFields()}
                    </div>

                    {/* Move to Page - Only show if there are multiple pages */}
                    {pages.length > 1 && onMoveToPage && (
                        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                            <div className="flex items-center gap-2 mb-3">
                                <ArrowRightLeft className="w-4 h-4 text-purple-500" />
                                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Move to Page</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {pages.map((page, index) => (
                                    <button
                                        key={page.id}
                                        onClick={() => {
                                            if (index !== currentPageIndex && frame) {
                                                onMoveToPage(frame.id, index);
                                                onClose();
                                            }
                                        }}
                                        disabled={index === currentPageIndex}
                                        className={`
                                            p-3 rounded-xl text-center transition-all text-sm
                                            ${index === currentPageIndex
                                                ? 'bg-purple-600/20 border-2 border-purple-500 cursor-default'
                                                : 'bg-zinc-100 dark:bg-zinc-800 border-2 border-transparent hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30'
                                            }
                                        `}
                                    >
                                        <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{page.name}</p>
                                        {index === currentPageIndex && (
                                            <p className="text-xs text-purple-500 mt-0.5">Current</p>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                        <Save className="w-4 h-4" />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
