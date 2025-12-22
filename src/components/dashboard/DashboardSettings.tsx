'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardTheme, DashboardLayout, DEFAULT_THEME, OverlayEffect } from '@/types/dashboard';
import { X, Palette, Type, Sparkles, Image, Users, Monitor, ExternalLink } from 'lucide-react';
import { HouseholdSettings } from './HouseholdSettings';

const OVERLAY_OPTIONS: { id: OverlayEffect; label: string; emoji: string }[] = [
    { id: 'none', label: 'None', emoji: '🚫' },
    { id: 'hearts', label: 'Hearts', emoji: '❤️' },
    { id: 'balloons', label: 'Balloons', emoji: '🎈' },
    { id: 'snow', label: 'Snow', emoji: '❄️' },
    { id: 'stars', label: 'Stars', emoji: '⭐' },
    { id: 'bubbles', label: 'Bubbles', emoji: '🫧' },
    { id: 'leaves', label: 'Leaves', emoji: '🍂' },
    { id: 'sparkles', label: 'Sparkles', emoji: '✨' },
];

interface DashboardSettingsProps {
    dashboard: DashboardLayout;
    isOpen: boolean;
    onClose: () => void;
    onSave: (theme: DashboardTheme) => void;
}

const PRESET_BACKGROUNDS = [
    { name: 'Midnight', value: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' },
    { name: 'Sunset', value: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 50%, #48dbfb 100%)' },
    { name: 'Aurora', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)' },
    { name: 'Ocean', value: 'linear-gradient(135deg, #0093E9 0%, #80D0C7 100%)' },
    { name: 'Forest', value: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
    { name: 'Noir', value: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #2d2d2d 100%)' },
    { name: 'Rose', value: 'linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)' },
    { name: 'Cosmic', value: 'linear-gradient(135deg, #0c0c1e 0%, #1a0a2e 30%, #0f1f3d 60%, #061428 100%)' },
];

const FONTS = [
    { id: 'inter', name: 'Inter', sample: 'Modern & Clean' },
    { id: 'outfit', name: 'Outfit', sample: 'Friendly & Rounded' },
    { id: 'space-grotesk', name: 'Space Grotesk', sample: 'Techy & Bold' },
    { id: 'playfair', name: 'Playfair Display', sample: 'Elegant & Serif' },
    { id: 'jetbrains-mono', name: 'JetBrains Mono', sample: 'Monospace & Sharp' },
];

const WIDGET_STYLES = [
    { id: 'solid', name: 'Solid', desc: 'Opaque backgrounds' },
    { id: 'glass', name: 'Glass', desc: 'Frosted blur effect' },
    { id: 'transparent', name: 'Transparent', desc: 'See-through widgets' },
];

export default function DashboardSettings({ dashboard, isOpen, onClose, onSave }: DashboardSettingsProps) {
    const router = useRouter();
    const [theme, setTheme] = useState<DashboardTheme>(dashboard.theme || DEFAULT_THEME);
    const [activeTab, setActiveTab] = useState<'background' | 'font' | 'widgets' | 'household'>('background');
    const [customImageUrl, setCustomImageUrl] = useState('');

    if (!isOpen) return null;

    const handleBackgroundSelect = (value: string) => {
        setTheme(prev => ({
            ...prev,
            background: { type: 'gradient', value }
        }));
    };

    const handleImageUrl = () => {
        if (customImageUrl) {
            setTheme(prev => ({
                ...prev,
                background: { type: 'image', value: customImageUrl }
            }));
        }
    };

    const tabs = [
        { id: 'background', label: 'Background', icon: Image },
        { id: 'font', label: 'Typography', icon: Type },
        { id: 'widgets', label: 'Widgets', icon: Sparkles },
        { id: 'household', label: 'Household', icon: Users },
    ] as const;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-zinc-700">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700">
                    <div className="flex items-center gap-3">
                        <Palette className="w-5 h-5 text-purple-400" />
                        <h2 className="text-lg font-semibold text-white">Dashboard Settings</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-zinc-800">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${activeTab === tab.id
                                ? 'text-white border-b-2 border-purple-500 bg-zinc-800/50'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {activeTab === 'background' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-medium text-zinc-300 mb-3">Preset Gradients</h3>
                                <div className="grid grid-cols-4 gap-3">
                                    {PRESET_BACKGROUNDS.map(bg => (
                                        <button
                                            key={bg.name}
                                            onClick={() => handleBackgroundSelect(bg.value)}
                                            className={`relative h-20 rounded-xl overflow-hidden transition-all ${theme.background.value === bg.value
                                                ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-zinc-900'
                                                : 'hover:scale-105'
                                                }`}
                                            style={{ background: bg.value }}
                                        >
                                            <span className="absolute bottom-2 left-2 text-xs font-medium text-white drop-shadow-lg">
                                                {bg.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-zinc-300 mb-3">Custom Image URL</h3>
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={customImageUrl}
                                        onChange={(e) => setCustomImageUrl(e.target.value)}
                                        placeholder="https://images.unsplash.com/..."
                                        className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                    <button
                                        onClick={handleImageUrl}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>

                            {/* Preview */}
                            <div>
                                <h3 className="text-sm font-medium text-zinc-300 mb-3">Preview</h3>
                                <div
                                    className="h-32 rounded-xl overflow-hidden"
                                    style={{
                                        background: theme.background.type === 'image'
                                            ? `url(${theme.background.value}) center/cover`
                                            : theme.background.value
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'font' && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-zinc-300 mb-3">Choose Font Family</h3>
                            <div className="space-y-2">
                                {FONTS.map(font => (
                                    <button
                                        key={font.id}
                                        onClick={() => setTheme(prev => ({ ...prev, font: font.id as any }))}
                                        className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${theme.font === font.id
                                            ? 'bg-purple-600/20 border-2 border-purple-500'
                                            : 'bg-zinc-800 border-2 border-transparent hover:border-zinc-600'
                                            }`}
                                    >
                                        <div className="text-left">
                                            <p className="font-medium text-white">{font.name}</p>
                                            <p className="text-sm text-zinc-400">{font.sample}</p>
                                        </div>
                                        {theme.font === font.id && (
                                            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'widgets' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-medium text-zinc-300 mb-3">Widget Style</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {WIDGET_STYLES.map(style => (
                                        <button
                                            key={style.id}
                                            onClick={() => setTheme(prev => ({ ...prev, widgetStyle: style.id as any }))}
                                            className={`p-4 rounded-xl text-center transition-all ${theme.widgetStyle === style.id
                                                ? 'bg-purple-600/20 border-2 border-purple-500'
                                                : 'bg-zinc-800 border-2 border-transparent hover:border-zinc-600'
                                                }`}
                                        >
                                            <p className="font-medium text-white">{style.name}</p>
                                            <p className="text-xs text-zinc-400 mt-1">{style.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-zinc-300 mb-3">Accent Color</h3>
                                <div className="flex gap-3">
                                    {['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444'].map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setTheme(prev => ({ ...prev, accentColor: color }))}
                                            className={`w-10 h-10 rounded-full transition-transform ${theme.accentColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110' : 'hover:scale-110'
                                                }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Visual Overlay Effects */}
                            <div>
                                <h3 className="text-sm font-medium text-zinc-300 mb-3">Visual Effects ✨</h3>
                                <p className="text-xs text-zinc-500 mb-3">Add magical floating animations</p>
                                <div className="grid grid-cols-4 gap-2">
                                    {OVERLAY_OPTIONS.map(option => (
                                        <button
                                            key={option.id}
                                            onClick={() => setTheme(prev => ({ ...prev, overlay: option.id }))}
                                            className={`p-3 rounded-xl text-center transition-all ${theme.overlay === option.id || (!theme.overlay && option.id === 'none')
                                                ? 'bg-purple-600/30 border-2 border-purple-500'
                                                : 'bg-zinc-800 border-2 border-transparent hover:border-zinc-600'
                                                }`}
                                        >
                                            <div className="text-2xl mb-1">{option.emoji}</div>
                                            <p className="text-xs text-white/80">{option.label}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}


                    {activeTab === 'household' && (
                        <div className="space-y-6">
                            <HouseholdSettings />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-700 bg-zinc-800/50">
                    {/* Console Link */}
                    <button
                        onClick={() => { onClose(); router.push('/app/console'); }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                        <Monitor className="w-4 h-4" />
                        <span>Display Management</span>
                        <ExternalLink className="w-3 h-3" />
                    </button>
                    
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => { onSave(theme); onClose(); }}
                            className="px-6 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}
