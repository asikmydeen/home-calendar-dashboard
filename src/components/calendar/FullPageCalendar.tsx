'use client';

import React from 'react';
import { useCalendar } from '@/contexts/CalendarContext';
import { ViewSwitcher } from './ViewSwitcher';
import { CalendarSidebar } from './CalendarSidebar';
import { CalendarHeader } from './CalendarHeader';
import { FamilyMemberBar } from './FamilyMemberBar';
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
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-white">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
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
        <div className="h-full w-full flex flex-col bg-gradient-to-br from-amber-50 via-orange-50/30 to-white overflow-hidden">
            {/* Premium Header */}
            <div className="flex-shrink-0 p-4 pb-2">
                <CalendarHeader familyName="Our Family" />
            </div>

            {/* Family Member Bar + View Switcher */}
            <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between">
                <FamilyMemberBar />
                <ViewSwitcher />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden px-4 pb-4">
                {/* Sidebar - hidden on mobile */}
                <div className="hidden lg:block w-72 flex-shrink-0 mr-4 overflow-y-auto bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-100">
                    <CalendarSidebar />
                </div>

                {/* Calendar View */}
                <div className="flex-1 overflow-hidden bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-100">
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

