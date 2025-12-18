'use client';

import React, { useState } from 'react';
import { DashboardPage } from '@/types/dashboard';
import { X, Plus, Trash2, Edit3 } from 'lucide-react';

interface PageSettingsProps {
    pages: DashboardPage[];
    currentPageIndex: number;
    isOpen: boolean;
    onClose: () => void;
    onAddPage: (name: string) => void;
    onRemovePage: (pageId: string) => void;
    onUpdatePage: (pageId: string, updates: Partial<DashboardPage>) => void;
    onGoToPage: (index: number) => void;
}

export default function PageSettings({
    pages,
    currentPageIndex,
    isOpen,
    onClose,
    onAddPage,
    onRemovePage,
    onUpdatePage,
    onGoToPage
}: PageSettingsProps) {
    const [newPageName, setNewPageName] = useState('');
    const [editingPageId, setEditingPageId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    if (!isOpen) return null;

    const handleAddPage = () => {
        if (newPageName.trim()) {
            onAddPage(newPageName.trim());
            setNewPageName('');
        } else {
            onAddPage('New Page');
        }
    };

    const handleStartEdit = (page: DashboardPage) => {
        setEditingPageId(page.id);
        setEditingName(page.name);
    };

    const handleSaveEdit = (pageId: string) => {
        if (editingName.trim()) {
            onUpdatePage(pageId, { name: editingName.trim() });
        }
        setEditingPageId(null);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-zinc-700">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700">
                    <h2 className="text-lg font-semibold text-white">Manage Pages</h2>
                    <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    {/* Page List */}
                    <div className="space-y-2">
                        {pages.map((page, index) => (
                            <div
                                key={page.id}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${index === currentPageIndex
                                        ? 'bg-purple-600/20 border-2 border-purple-500'
                                        : 'bg-zinc-800 border-2 border-transparent hover:border-zinc-600'
                                    }`}
                            >
                                {/* Page number */}
                                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60 text-sm font-bold">
                                    {index + 1}
                                </div>

                                {/* Page name (editable) */}
                                {editingPageId === page.id ? (
                                    <input
                                        type="text"
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        onBlur={() => handleSaveEdit(page.id)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(page.id)}
                                        autoFocus
                                        className="flex-1 px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                ) : (
                                    <button
                                        onClick={() => { onGoToPage(index); onClose(); }}
                                        className="flex-1 text-left text-white font-medium hover:text-purple-300 transition-colors"
                                    >
                                        {page.name}
                                        <span className="text-white/40 text-sm ml-2">
                                            ({page.frames.length} widget{page.frames.length !== 1 ? 's' : ''})
                                        </span>
                                    </button>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleStartEdit(page)}
                                        className="p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    {pages.length > 1 && (
                                        <button
                                            onClick={() => onRemovePage(page.id)}
                                            className="p-2 hover:bg-red-500/20 rounded-lg text-white/50 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Add Page */}
                    <div className="mt-4 flex gap-2">
                        <input
                            type="text"
                            value={newPageName}
                            onChange={(e) => setNewPageName(e.target.value)}
                            placeholder="New page name..."
                            className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddPage()}
                        />
                        <button
                            onClick={handleAddPage}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Add
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end px-6 py-4 border-t border-zinc-700 bg-zinc-800/50">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
