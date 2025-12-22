'use client';

import React from 'react';
import { format } from 'date-fns';
import { Sun } from 'lucide-react';

interface CalendarHeaderProps {
    familyName?: string;
}

export function CalendarHeader({ familyName = 'My Family' }: CalendarHeaderProps) {
    const now = new Date();
    const timeString = format(now, 'h:mm');
    const periodString = format(now, 'a');
    const dateString = format(now, 'EEE, MMM d');

    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300 px-4 py-3 sm:px-6 sm:py-4 shadow-lg">
            {/* Decorative background elements */}
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute left-1/3 bottom-0 h-20 w-20 translate-y-6 rounded-full bg-white/10 blur-2xl" />

            <div className="relative flex items-center justify-between gap-4">
                {/* Time Display */}
                <div className="flex flex-col min-w-0">
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white drop-shadow-sm">
                            {timeString}
                        </span>
                        <span className="text-base sm:text-lg font-medium text-white/80">
                            {periodString}
                        </span>
                    </div>
                    <span className="text-sm sm:text-base font-medium text-white/90">
                        {dateString}
                    </span>
                </div>

                {/* Family Name & Weather */}
                <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                    {/* Weather Widget */}
                    <div className="flex items-center gap-1.5 rounded-xl bg-white/20 backdrop-blur-sm px-2.5 py-1.5 sm:px-3 sm:py-2">
                        <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        <span className="text-sm sm:text-base font-semibold text-white">72°</span>
                    </div>

                    {/* Family Name */}
                    <div className="text-right hidden sm:block">
                        <h1 className="text-lg lg:text-xl font-bold text-white drop-shadow-sm">
                            {familyName}
                        </h1>
                        <p className="text-xs font-medium text-white/80">
                            Family Calendar
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
