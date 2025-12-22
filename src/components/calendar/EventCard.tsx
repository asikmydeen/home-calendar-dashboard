'use client';

import React from 'react';
import { CalendarEvent, CATEGORY_ICONS } from '@/types/calendar';
import { useCalendar } from '@/contexts/CalendarContext';
import { format } from 'date-fns';
import { MapPin, Users } from 'lucide-react';

interface EventCardProps {
    event: CalendarEvent;
    variant?: 'compact' | 'time' | 'full';
}

import { getContrastColor } from '@/lib/utils';

export function EventCard({ event, variant = 'compact' }: EventCardProps) {
    const { calendars, familyMembers, openEventModal } = useCalendar();

    const calendar = calendars.find(c => c.id === event.calendarId);
    const color = event.color || calendar?.color || '#E8B4BC';
    const textColor = getContrastColor(color);
    const categoryIcon = CATEGORY_ICONS[event.category];
    const assignedMembers = familyMembers.filter(m => event.assignedTo.includes(m.id));

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        openEventModal(event);
    };

    if (variant === 'compact') {
        return (
            <div
                onClick={handleClick}
                className="group flex items-center gap-1.5 px-2 py-1 rounded-md text-xs cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
                style={{
                    backgroundColor: color,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                }}
            >
                <span
                    className="truncate font-medium"
                    style={{ color: textColor }}
                >
                    {event.title}
                </span>
            </div>
        );
    }

    if (variant === 'time') {
        return (
            <div
                onClick={handleClick}
                className="group rounded-lg px-2.5 py-1.5 text-xs cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                style={{
                    backgroundColor: color,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                }}
            >
                <div
                    className="font-semibold truncate"
                    style={{ color: textColor }}
                >
                    {event.title}
                </div>
                <div
                    className="text-[10px] opacity-80"
                    style={{ color: textColor }}
                >
                    {format(new Date(event.start), 'h:mm a')}
                </div>
            </div>
        );
    }

    // Full variant
    return (
        <div
            onClick={handleClick}
            className="group rounded-xl p-4 cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-lg"
            style={{
                backgroundColor: color,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}
        >
            <div className="flex items-start gap-3">
                {/* Color indicator bar */}
                <div
                    className="w-1 rounded-full self-stretch min-h-[40px]"
                    style={{ backgroundColor: textColor, opacity: 0.3 }}
                />

                <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{categoryIcon}</span>
                        <h4
                            className="font-semibold truncate flex-1"
                            style={{ color: textColor }}
                        >
                            {event.title}
                        </h4>
                    </div>

                    {/* Description */}
                    {event.description && (
                        <p
                            className="text-sm mb-2 line-clamp-2 opacity-80"
                            style={{ color: textColor }}
                        >
                            {event.description}
                        </p>
                    )}

                    {/* Meta row */}
                    <div
                        className="flex items-center gap-4 text-xs opacity-75"
                        style={{ color: textColor }}
                    >
                        {/* Time */}
                        {!event.isAllDay && (
                            <span>
                                {format(new Date(event.start), 'h:mm a')} - {format(new Date(event.end), 'h:mm a')}
                            </span>
                        )}

                        {/* Location */}
                        {event.location && (
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate max-w-[120px]">{event.location}</span>
                            </span>
                        )}
                    </div>

                    {/* Assigned members */}
                    {assignedMembers.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-3">
                            {assignedMembers.slice(0, 4).map(member => (
                                <div
                                    key={member.id}
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm bg-white/30 shadow-sm"
                                    title={member.name}
                                >
                                    {member.avatar}
                                </div>
                            ))}
                            {assignedMembers.length > 4 && (
                                <div
                                    className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-medium"
                                    style={{ color: textColor }}
                                >
                                    +{assignedMembers.length - 4}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
