import React, { useState, useEffect } from 'react';
import { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Frame } from '@/types/dashboard';
import { FrameWrapper } from './FrameWrapper';
import { Loader2 } from 'lucide-react';
import ClockFrame from '../frames/ClockFrame';
import PhotosFrame from '../frames/PhotosFrame';
import NotesFrame from '../frames/NotesFrame';
import CalendarFrame from '../frames/CalendarFrame';
import WebFrame from '../frames/WebFrame';
import MusicFrame from '../frames/MusicFrame';
import VideoFrame from '../frames/VideoFrame';
import TasksFrame from '../frames/TasksFrame';
import QuotesWidget from '../widgets/QuotesWidget';
import GifWidget from '../widgets/GifWidget';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Responsive, WidthProvider } = require('react-grid-layout/legacy');

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardGridProps {
  frames: Frame[];
  isEditMode: boolean;
  onLayoutChange: (frames: Frame[]) => void;
  onRemoveFrame: (id: string) => void;
  onEditFrame: (id: string) => void;
  widgetStyle?: 'solid' | 'glass' | 'transparent';
}

export default function DashboardGrid({
  frames,
  isEditMode,
  onLayoutChange,
  onRemoveFrame,
  onEditFrame,
  widgetStyle = 'glass'
}: DashboardGridProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLayoutChange = (currentLayout: any[]) => {
    // Merge new layout positions into existing frames
    const updatedFrames = frames.map(frame => {
      const layoutItem = currentLayout.find(l => l.i === frame.id);
      if (layoutItem) {
        return {
          ...frame,
          x: layoutItem.x,
          y: layoutItem.y,
          w: layoutItem.w,
          h: layoutItem.h
        };
      }
      return frame;
    });

    // Only trigger update if something actually changed to avoid loops
    // In a real app, we'd do a deep comparison
    onLayoutChange(updatedFrames);
  };

  const renderFrameContent = (frame: Frame) => {
    switch (frame.type) {
      case 'clock':
        return <ClockFrame frame={frame} />;
      case 'photos':
        return <PhotosFrame />;
      case 'notes':
        return <NotesFrame frame={frame} />;
      case 'calendar':
        return <CalendarFrame frame={frame} />;
      case 'web':
        return <WebFrame frame={frame} />;
      case 'music':
        return <MusicFrame frame={frame} />;
      case 'video':
        return <VideoFrame frame={frame} />;
      case 'tasks':
        return <TasksFrame />;
      case 'quotes':
        return <QuotesWidget frame={frame} />;
      case 'gif':
        return <GifWidget frame={frame} isEditMode={isEditMode} />;
      default:
        return (
          <div className="p-4 h-full w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 text-zinc-400">
            <span className="text-lg font-medium capitalize">{frame.type} frame</span>
          </div>
        );
    }
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  // Define basic grid props
  // 12 columns is standard for flexibility
  const cols = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };

  return (
    <ResponsiveGridLayout
      className={`layout min-h-screen pb-24 ${isEditMode ? 'edit-mode-grid' : ''}`}
      layouts={{ lg: frames.map(f => ({ i: f.id, x: f.x, y: f.y, w: f.w, h: f.h, minW: f.minW || 2, minH: f.minH || 2 })) }}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={cols}
      rowHeight={60} // Base row height
      onLayoutChange={(_layout: any, allLayouts: any) => handleLayoutChange(allLayouts.lg || _layout)}
      isDraggable={isEditMode}
      isResizable={isEditMode}
      resizeHandles={['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']}
      draggableHandle=".draggable-handle"
      margin={[16, 16]}
    >
      {frames.map((frame) => (
        <FrameWrapper
          key={frame.id}
          frame={frame}
          isEditMode={isEditMode}
          onRemove={onRemoveFrame}
          onEdit={onEditFrame}
          widgetStyle={widgetStyle}
        >
          {renderFrameContent(frame)}
        </FrameWrapper>
      ))}
    </ResponsiveGridLayout>
  );
}
