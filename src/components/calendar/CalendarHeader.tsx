'use client';

import React from 'react';
import { format } from 'date-fns';
import { Cloud, Sun, CloudSun } from 'lucide-react';

interface CalendarHeaderProps {
    familyName?: string;
}

export function CalendarHeader({ familyName = 'My Family' }: CalendarHeaderProps) {
    const now = new Date();
    const timeString = format(now, 'h:mm');
    const periodString = format(now, 'a');
    const dateString = format(now, 'EEE, MMM d');

    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300 px-6 py-5 shadow-lg">
            {/* Decorative background elements */}
            <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute left-1/3 bottom-0 h-24 w-24 translate-y-8 rounded-full bg-white/10 blur-2xl" />

            <div className="relative flex items-center justify-between">
                {/* Time Display */}
                <div className="flex flex-col">
                    <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-bold text-white drop-shadow-sm">
                            {timeString}
                        </span>
                        <span className="text-xl font-medium text-white/80">
                            {periodString}
                        </span>
                    </div>
                    <span className="mt-1 text-lg font-medium text-white/90">
                        {dateString}
                    </span>
                </div>

                {/* Family Name & Weather */}
                <div className="flex items-center gap-6">
                    {/* Weather Widget (placeholder) */}
                    <div className="flex items-center gap-2 rounded-xl bg-white/20 backdrop-blur-sm px-4 py-2">
                        <Sun className="h-6 w-6 text-white" />
                        <span className="text-lg font-semibold text-white">72°</span>
                    </div>

                    {/* Family Name */}
                    <div className="text-right">
                        <h1 className="text-2xl font-bold text-white drop-shadow-sm">
                            {familyName}
                        </h1>
                        <p className="text-sm font-medium text-white/80">
                            Family Calendar
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
