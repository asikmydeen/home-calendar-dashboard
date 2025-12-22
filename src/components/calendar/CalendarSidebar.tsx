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

    return (
        <div className="p-4 space-y-6">
            {/* Mini Calendar */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">
                    {format(selectedDate, 'MMMM yyyy')}
                </h3>

                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                        <div key={day} className="text-center text-xs text-slate-400 font-medium">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days grid */}
                <div className="grid grid-cols-7 gap-1">
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
                                    relative w-8 h-8 text-xs rounded-lg flex items-center justify-center transition-all
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
                                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-400" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Calendars */}
            <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-slate-400" />
                    Calendars
                </h3>
                <div className="space-y-1">
                    {calendars.map(calendar => {
                        const isVisible = visibleCalendarIds.includes(calendar.id);
                        const eventCount = filteredEvents.filter(e => e.calendarId === calendar.id).length;

                        return (
                            <button
                                key={calendar.id}
                                onClick={() => toggleCalendarVisibility(calendar.id)}
                                className={`
                                    w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all
                                    ${isVisible
                                        ? 'bg-white hover:bg-slate-50 shadow-sm border border-slate-100'
                                        : 'opacity-50 hover:opacity-75'
                                    }
                                `}
                            >
                                <div
                                    className={`w-3 h-3 rounded-sm ${isVisible ? '' : 'opacity-30'}`}
                                    style={{ backgroundColor: calendar.color }}
                                />
                                <span className="text-sm text-slate-700 flex-1 text-left">{calendar.name}</span>
                                <span className="text-xs text-slate-400">{eventCount}</span>
                                {isVisible ? (
                                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                                ) : (
                                    <EyeOff className="w-3.5 h-3.5 text-slate-300" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Family Members Filter */}
            <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    Family Members
                </h3>
                <div className="flex flex-wrap gap-2">
                    {familyMembers.map(member => {
                        const isSelected = selectedMemberIds.includes(member.id);

                        return (
                            <button
                                key={member.id}
                                onClick={() => toggleMemberFilter(member.id)}
                                className={`
                                    flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all border
                                    ${isSelected
                                        ? 'ring-2 ring-offset-2 shadow-sm'
                                        : 'opacity-70 hover:opacity-100'
                                    }
                                `}
                                style={{
                                    backgroundColor: `${member.color}15`,
                                    borderColor: member.color,
                                    color: member.color,
                                    '--tw-ring-color': isSelected ? member.color : 'transparent'
                                } as React.CSSProperties}
                            >
                                <span className="text-base">{member.avatar}</span>
                                <span className="font-medium">{member.name}</span>
                            </button>
                        );
                    })}
                </div>
                {selectedMemberIds.length > 0 && (
                    <button
                        onClick={() => selectedMemberIds.forEach(id => toggleMemberFilter(id))}
                        className="mt-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        Clear filter
                    </button>
                )}
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl p-4 border border-orange-200/50">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">This Week</h3>
                <div className="text-3xl font-bold text-orange-600">
                    {filteredEvents.length}
                </div>
                <p className="text-xs text-slate-500">events scheduled</p>
            </div>
        </div>
    );
}
