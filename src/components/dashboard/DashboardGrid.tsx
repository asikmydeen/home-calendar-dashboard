import React, { useState, useEffect, useMemo } from 'react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Frame } from '@/types/dashboard';
import { useDisplayMode } from '@/hooks/useDisplayMode';
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
import { useMeasure } from 'react-use';

interface DashboardGridProps {
  frames: Frame[];
  isEditMode: boolean;
  onLayoutChange: (frames: Frame[]) => void;
  onRemoveFrame: (id: string) => void;
  onEditFrame: (id: string) => void;
  widgetStyle?: 'glass' | 'solid' | 'transparent' | 'frameless';
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
  const { calculateRowHeight } = useDisplayMode();
  const [ref, { width }] = useMeasure<HTMLDivElement>();
  const isAddingFrameRef = React.useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Track the current layout state internally to prevent react-grid-layout from modifying it
  const [internalLayout, setInternalLayout] = useState<any[]>([]);

  // Sync internal layout with frames prop, but ONLY when frames change from external source
  useEffect(() => {
    const newLayout = frames.map(f => ({
      i: f.id,
      x: f.x,
      y: f.y,
      w: f.w,
      h: f.h,
      minW: f.minW || 2,
      minH: f.minH || 2
    }));
    setInternalLayout(newLayout);

    // Detect if a new frame was added
    if (newLayout.length > internalLayout.length) {
      isAddingFrameRef.current = true;
      setTimeout(() => {
        isAddingFrameRef.current = false;
      }, 100);
    }
  }, [frames]);

  // Calculate dynamic row height to fill viewport
  // MUST be before any conditional returns to satisfy Rules of Hooks
  const rowHeight = useMemo(() => {
    const targetRows = 8;
    return calculateRowHeight(targetRows, 120, 16); // 120px header, 16px margin
  }, [calculateRowHeight]);

  // Generate layout data - use internal layout to prevent react-grid-layout from modifying it
  const layout = useMemo(() => {
    return internalLayout.length > 0 ? internalLayout : frames.map(f => ({
      i: f.id,
      x: f.x,
      y: f.y,
      w: f.w,
      h: f.h,
      minW: f.minW || 2,
      minH: f.minH || 2
    }));
  }, [internalLayout, frames]);

  const MAX_ROWS = 8; // Fixed 8 rows to match viewport

  // Handle drag stop - only update when user finishes dragging
  const handleDragStop = (newLayout: readonly any[]) => {
    if (isAddingFrameRef.current) return;
    setInternalLayout([...newLayout]);
    updateLayout(newLayout);
  };

  // Handle resize stop - only update when user finishes resizing
  const handleResizeStop = (newLayout: readonly any[]) => {
    if (isAddingFrameRef.current) return;
    setInternalLayout([...newLayout]);
    updateLayout(newLayout);
  };

  // Update layout helper function
  const updateLayout = (currentLayout: readonly any[]) => {
    const updatedFrames = frames.map(frame => {
      const item = currentLayout.find((l: any) => l.i === frame.id);
      if (!item) return frame;

      return {
        ...frame,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      };
    });

    onLayoutChange(updatedFrames);
  };

  // Handle layout change - ignore to prevent auto-compaction
  const handleLayoutChange = () => {
    // Do nothing - we only update on drag/resize stop
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

  return (
    <div ref={ref} className={`h-full w-full overflow-visible ${isEditMode ? 'edit-mode-grid' : ''}`}>
      {width > 0 && (
        <GridLayout
          className="layout h-full"
          layout={layout}
          width={width}
          autoSize={false}
          style={{ minHeight: '100%' }}
          gridConfig={{
            cols: 12,
            rowHeight: rowHeight,
            maxRows: MAX_ROWS,
            margin: [16, 16],
            containerPadding: [0, 0]
          }}
          dragConfig={{
            enabled: isEditMode,
            handle: ".draggable-handle",
            bounded: true
          }}
          resizeConfig={{
            enabled: isEditMode,
            handles: ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']
          }}
          compactor={{
            type: null,
            allowOverlap: true,
            preventCollision: false,
            compact: (layout) => layout, // No compaction
            onMove: (layout, item, x, y) => {
              const newLayout = [...layout];
              const movedItem = newLayout.find(l => l.i === item.i);
              if (movedItem) {
                movedItem.x = x;
                movedItem.y = y;
              }
              return newLayout;
            }
          }}
          onLayoutChange={handleLayoutChange}
          onDragStop={handleDragStop}
          onResizeStop={handleResizeStop}
        >
          {frames.map((frame) => (
            <div key={frame.id}>
              <FrameWrapper
                frame={frame}
                isEditMode={isEditMode}
                onRemove={onRemoveFrame}
                onEdit={onEditFrame}
                widgetStyle={widgetStyle}
              >
                {renderFrameContent(frame)}
              </FrameWrapper>
            </div>
          ))}
        </GridLayout>
      )}
    </div>
  );
}
