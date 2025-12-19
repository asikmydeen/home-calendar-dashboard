'use client';

import React from 'react';
import { useCalendar } from '@/contexts/CalendarContext';
import { ViewSwitcher } from './ViewSwitcher';
import { CalendarSidebar } from './CalendarSidebar';
import { MonthView } from './views/MonthView';
import { WeekView } from './views/WeekView';
import { DayView } from './views/DayView';
import { AgendaView } from './views/AgendaView';
import { EventModal } from './EventModal';
import { QuickAddFAB } from './QuickAddFAB';
import { Loader2 } from 'lucide-react';

function CalendarContent() {
    const { currentView, isLoading, isEventModalOpen } = useCalendar();

    if (isLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-zinc-900">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    const renderView = () => {
        switch (currentView) {
            case 'day':
                return <DayView />;
            case 'week':
                return <WeekView />;
            case 'agenda':
                return <AgendaView />;
            case 'month':
            default:
                return <MonthView />;
        }
    };

    return (
        <div className="h-full w-full flex flex-col bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 overflow-hidden">
            {/* Top Toolbar */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-zinc-800/50 bg-zinc-900/80 backdrop-blur-sm">
                <ViewSwitcher />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar - hidden on mobile */}
                <div className="hidden lg:block w-72 flex-shrink-0 border-r border-zinc-800/50 overflow-y-auto">
                    <CalendarSidebar />
                </div>

                {/* Calendar View */}
                <div className="flex-1 overflow-hidden">
                    {renderView()}
                </div>
            </div>

            {/* Quick Add FAB */}
            <QuickAddFAB />

            {/* Event Modal */}
            {isEventModalOpen && <EventModal />}
        </div>
    );
}

export default function FullPageCalendar() {
    return <CalendarContent />;
}
