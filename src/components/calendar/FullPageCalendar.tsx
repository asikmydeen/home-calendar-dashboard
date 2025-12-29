'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useCalendar } from '@/contexts/CalendarContext';
import { ViewSwitcher } from './ViewSwitcher';
import { CalendarSidebar } from './CalendarSidebar';
import { CalendarHeader } from './CalendarHeader';
import { FamilyMemberBar } from './FamilyMemberBar';
import { AgendaView } from './views/AgendaView';
import { EventModal } from './EventModal';
import { QuickAddFAB } from './QuickAddFAB';
import { Loader2 } from 'lucide-react';

// Dynamic import Schedule-X to avoid SSR issues
const ScheduleXCalendar = dynamic(
    () => import('./ScheduleXCalendar'),
    {
        ssr: false,
        loading: () => (
            <div className="h-full w-full flex items-center justify-center bg-white/50">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </div>
        ),
    }
);

function CalendarContent() {
    const calendarContext = useCalendar();
    const { currentView, isLoading, isEventModalOpen } = calendarContext;

    if (isLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-white">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </div>
        );
    }

    const renderView = () => {
        // Use AgendaView as custom list view, Schedule-X for day/week/month
        if (currentView === 'agenda') {
            return <AgendaView />;
        }
        // For day, week, and month views, use Schedule-X
        return <ScheduleXCalendar />;
    };

    return (
        <div className="h-full w-full flex flex-col bg-gradient-to-br from-amber-50 via-orange-50/30 to-white overflow-hidden">
            {/* Premium Header - scales with container */}
            <div className="flex-shrink-0 p-[2%]">
                <CalendarHeader familyName="Our Family" />
            </div>

            {/* Family Member Bar + View Switcher - compact row */}
            <div className="flex-shrink-0 px-[2%] py-[1%] flex items-center justify-between gap-2 flex-wrap">
                <FamilyMemberBar className="flex-1 min-w-0" />
                <ViewSwitcher />
            </div>

            {/* Main Content Area - takes remaining space */}
            <div className="flex-1 flex overflow-hidden px-[2%] pb-[2%] min-h-0">
                {/* Sidebar - responsive width, scrollable if needed */}
                <div className="hidden lg:flex lg:flex-col w-[280px] flex-shrink-0 mr-[1%] overflow-hidden bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-100">
                    <CalendarSidebar />
                </div>

                {/* Calendar View - takes remaining space */}
                <div className="flex-1 overflow-hidden bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-100 min-w-0">
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
