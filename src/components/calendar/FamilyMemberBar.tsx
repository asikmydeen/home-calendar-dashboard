'use client';

import React from 'react';
import { FamilyMember } from '@/types/calendar';
import { useCalendar } from '@/contexts/CalendarContext';

interface FamilyMemberBarProps {
    className?: string;
}

export function FamilyMemberBar({ className = '' }: FamilyMemberBarProps) {
    const { familyMembers, selectedMemberIds, toggleMemberFilter, filteredEvents } = useCalendar();

    const getMemberEventCount = (memberId: string) => {
        // Filter strictly for TODAY's events
        return filteredEvents.filter(e => {
            if (!e.assignedTo.includes(memberId)) return false;
            const eventDate = new Date(e.start);
            const today = new Date();
            return eventDate.getDate() === today.getDate() &&
                eventDate.getMonth() === today.getMonth() &&
                eventDate.getFullYear() === today.getFullYear();
        }).length;
    };

    return (
        <div className={`flex items-center gap-2 overflow-hidden ${className}`}>
            <span className="text-xs font-medium text-slate-500 flex-shrink-0 hidden sm:block">Today's Schedule</span>
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto">
                {familyMembers.map(member => {
                    const isSelected = selectedMemberIds.length === 0 || selectedMemberIds.includes(member.id);
                    const eventCount = getMemberEventCount(member.id);

                    return (
                        <button
                            key={member.id}
                            onClick={() => toggleMemberFilter(member.id)}
                            className={`flex flex-col items-center gap-0.5 transition-all duration-200 flex-shrink-0 ${isSelected ? 'opacity-100 scale-100' : 'opacity-40 scale-95'
                                }`}
                        >
                            {/* Avatar with badge */}
                            <div className="relative">
                                <div
                                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-xl shadow-sm border-2 border-white"
                                    style={{
                                        backgroundColor: `${member.color}20`,
                                    }}
                                >
                                    {member.avatar}
                                </div>

                                {eventCount > 0 && (
                                    <div
                                        className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                                        style={{ backgroundColor: member.color }}
                                    >
                                        {eventCount}
                                    </div>
                                )}
                            </div>

                            {/* Name */}
                            <span
                                className="text-[10px] font-medium truncate max-w-[48px]"
                                style={{ color: isSelected ? member.color : '#94a3b8' }}
                            >
                                {member.name}
                            </span>
                        </button>
                    );
                })}
            </div>

            {selectedMemberIds.length > 0 && (
                <button
                    onClick={() => selectedMemberIds.forEach(id => toggleMemberFilter(id))}
                    className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
                >
                    Clear
                </button>
            )}
        </div>
    );
}
