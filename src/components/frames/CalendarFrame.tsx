'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Frame } from '@/types/dashboard';
import { Loader2 } from 'lucide-react';

// Dynamic import to avoid SSR issues
const FullPageCalendar = dynamic(
  () => import('@/components/calendar/FullPageCalendar'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-zinc-900">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }
);

interface CalendarFrameProps {
  frame: Frame;
}

export default function CalendarFrame({ frame }: CalendarFrameProps) {
  return (
    <div className="h-full w-full overflow-hidden rounded-lg">
      <FullPageCalendar />
    </div>
  );
}

