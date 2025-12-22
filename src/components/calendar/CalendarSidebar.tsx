'use client';

import React from 'react';
import { useCalendar } from '@/contexts/CalendarContext';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns';
import { Eye, EyeOff, Users } from 'lucide-react';

export function CalendarSidebar() {
    const {
        selectedDate,
        setDate,
        calendars,
        familyMembers,
        visibleCalendarIds,
        selectedMemberIds,
        toggleCalendarVisibility,
        toggleMemberFilter,
        filteredEvents
    } = useCalendar();

    // Mini calendar dates
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    // Get event count for a member (including all events assigned to them)
    // For Google events, we check if they are explicitly assigned to this member
    const getMemberEventCount = (memberId: string) => {
        return filteredEvents.filter(e => e.assignedTo?.includes(memberId)).length;
    };

    // Get event count for Family calendar
    // This includes:
    // 1. Explicit 'family' calendar events
    // 2. Google events that are NOT assigned to any specific member (fallback to family)
    const getFamilyEventCount = () => {
        return filteredEvents.filter(e => {
            const isFamilyCal = e.calendarId === 'family';
            const isUnassignedGoogle = e.calendarId.startsWith('google-') && (!e.assignedTo || e.assignedTo.length === 0);
            return isFamilyCal || isUnassignedGoogle;
        }).length;
    };

    // Build display calendars - show Family + Members with their event counts
    const displayCalendars = calendars.map(cal => {
        if (cal.type === 'family') {
            return { ...cal, eventCount: getFamilyEventCount() };
        }
        // For member calendars, count events assigned to that member
        const memberId = cal.id.replace('cal-', '');
        return { ...cal, eventCount: getMemberEventCount(memberId) };
    });

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Mini Calendar - fixed at top */}
            <div className="flex-shrink-0 p-3 border-b border-slate-100">
                <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">
                        {format(selectedDate, 'MMMM yyyy')}
                    </h3>

                    {/* Day headers */}
                    <div className="grid grid-cols-7 gap-0.5 mb-1">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                            <div key={day} className="text-center text-[10px] text-slate-400 font-medium">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days grid - compact sizing */}
                    <div className="grid grid-cols-7 gap-0.5">
                        {calendarDays.map(day => {
                            const isCurrentMonth = isSameMonth(day, selectedDate);
                            const isSelected = isSameDay(day, selectedDate);
                            const isTodayDate = isToday(day);

                            const hasEvents = filteredEvents.some(event =>
                                isSameDay(new Date(event.start), day)
                            );

                            return (
                                <button
                                    key={day.toISOString()}
                                    onClick={() => setDate(day)}
                                    className={`
                                        relative w-7 h-7 text-[11px] rounded-md flex items-center justify-center transition-all
                                        ${isSelected
                                            ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-sm'
                                            : isTodayDate
                                                ? 'bg-orange-100 text-orange-600 ring-1 ring-orange-300'
                                                : isCurrentMonth
                                                    ? 'text-slate-700 hover:bg-slate-100'
                                                    : 'text-slate-300 hover:bg-slate-50'
                                        }
                                    `}
                                >
                                    {format(day, 'd')}
                                    {hasEvents && !isSelected && (
                                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-400" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Calendars - scrollable section */}
            <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-3">
                <div>
                    <h3 className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                        <Eye className="w-3 h-3" />
                        Calendars
                    </h3>
                    <div className="space-y-1">
                        {displayCalendars.map(calendar => {
                            const isVisible = visibleCalendarIds.includes(calendar.id);
                            const member = familyMembers.find(m => calendar.id === `cal-${m.id}`);

                            return (
                                <button
                                    key={calendar.id}
                                    onClick={() => toggleCalendarVisibility(calendar.id)}
                                    className={`
                                        w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-left
                                        ${isVisible
                                            ? 'bg-white hover:bg-slate-50 shadow-sm border border-slate-100'
                                            : 'opacity-50 hover:opacity-75'
                                        }
                                    `}
                                >
                                    {/* Avatar or color dot */}
                                    {member ? (
                                        <span className="text-base flex-shrink-0">{member.avatar}</span>
                                    ) : (
                                        <div
                                            className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${isVisible ? '' : 'opacity-30'}`}
                                            style={{ backgroundColor: calendar.color }}
                                        />
                                    )}
                                    <span className="text-xs text-slate-700 flex-1 truncate">{calendar.name}</span>
                                    <span className="text-[10px] text-slate-400">{calendar.eventCount}</span>
                                    {isVisible ? (
                                        <Eye className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                    ) : (
                                        <EyeOff className="w-3 h-3 text-slate-300 flex-shrink-0" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Family Members Filter */}
                {familyMembers.length > 0 && (
                    <div>
                        <h3 className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                            <Users className="w-3 h-3" />
                            Filter by Member
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                            {familyMembers.map(member => {
                                const isSelected = selectedMemberIds.includes(member.id);
                                const eventCount = getMemberEventCount(member.id);

                                return (
                                    <button
                                        key={member.id}
                                        onClick={() => toggleMemberFilter(member.id)}
                                        className={`
                                            flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-all border
                                            ${isSelected
                                                ? 'shadow-sm'
                                                : 'opacity-70 hover:opacity-100'
                                            }
                                        `}
                                        style={{
                                            backgroundColor: `${member.color}15`,
                                            borderColor: isSelected ? member.color : 'transparent',
                                            color: member.color,
                                        }}
                                    >
                                        <span>{member.avatar}</span>
                                        <span className="font-medium">{member.name}</span>
                                        <span className="opacity-60">({eventCount})</span>
                                    </button>
                                );
                            })}
                        </div>
                        {selectedMemberIds.length > 0 && (
                            <button
                                onClick={() => selectedMemberIds.forEach(id => toggleMemberFilter(id))}
                                className="mt-2 text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                Clear filter
                            </button>
                        )}
                    </div>
                )}

                {/* Quick Stats - at bottom of scrollable area */}
                <div className="bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl p-3 border border-orange-200/50">
                    <h3 className="text-xs font-semibold text-slate-700 mb-1">Total Events</h3>
                    <div className="text-2xl font-bold text-orange-600">
                        {filteredEvents.length}
                    </div>
                    <p className="text-[10px] text-slate-500">visible in current view</p>
                </div>
            </div>
        </div>
    );
}
