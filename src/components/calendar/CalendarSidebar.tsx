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
            <div className="bg-zinc-800/50 rounded-xl p-3">
                <h3 className="text-sm font-medium text-zinc-400 mb-3">
                    {format(selectedDate, 'MMMM yyyy')}
                </h3>

                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                        <div key={day} className="text-center text-xs text-zinc-500 font-medium">
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

                        // Check if day has events
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
                                        ? 'bg-purple-600 text-white'
                                        : isTodayDate
                                            ? 'bg-purple-600/20 text-purple-400 ring-1 ring-purple-500'
                                            : isCurrentMonth
                                                ? 'text-zinc-300 hover:bg-zinc-700'
                                                : 'text-zinc-600 hover:bg-zinc-800'
                                    }
                `}
                            >
                                {format(day, 'd')}
                                {hasEvents && !isSelected && (
                                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-purple-400" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Calendars */}
            <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
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
                                        ? 'bg-zinc-800/50 hover:bg-zinc-800'
                                        : 'opacity-50 hover:opacity-75'
                                    }
                `}
                            >
                                <div
                                    className={`w-3 h-3 rounded-sm ${isVisible ? '' : 'opacity-30'}`}
                                    style={{ backgroundColor: calendar.color }}
                                />
                                <span className="text-sm text-zinc-300 flex-1 text-left">{calendar.name}</span>
                                <span className="text-xs text-zinc-500">{eventCount}</span>
                                {isVisible ? (
                                    <Eye className="w-3.5 h-3.5 text-zinc-500" />
                                ) : (
                                    <EyeOff className="w-3.5 h-3.5 text-zinc-600" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Family Members Filter */}
            <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
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
                  flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all
                  ${isSelected
                                        ? 'ring-2 ring-offset-2 ring-offset-zinc-900'
                                        : 'opacity-70 hover:opacity-100'
                                    }
                `}
                                style={{
                                    backgroundColor: `${member.color}20`,
                                    color: member.color,
                                    '--tw-ring-color': isSelected ? member.color : 'transparent'
                                } as React.CSSProperties}
                            >
                                <span className="text-base">{member.avatar}</span>
                                <span>{member.name}</span>
                            </button>
                        );
                    })}
                </div>
                {selectedMemberIds.length > 0 && (
                    <button
                        onClick={() => selectedMemberIds.forEach(id => toggleMemberFilter(id))}
                        className="mt-2 text-xs text-zinc-500 hover:text-zinc-400"
                    >
                        Clear filter
                    </button>
                )}
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl p-4">
                <h3 className="text-sm font-medium text-white mb-2">This Week</h3>
                <div className="text-3xl font-bold text-purple-400">
                    {filteredEvents.length}
                </div>
                <p className="text-xs text-zinc-400">events scheduled</p>
            </div>
        </div>
    );
}
