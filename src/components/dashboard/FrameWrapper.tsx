import React from 'react';
import { clsx } from 'clsx';
import { Frame } from '@/types/dashboard';
import { X, Settings, GripHorizontal } from 'lucide-react';

interface FrameWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  frame: Frame;
  isEditMode: boolean;
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
  children: React.ReactNode;
  widgetStyle?: 'solid' | 'glass' | 'transparent' | 'frameless';
  // properties passed by react-grid-layout
  style?: React.CSSProperties;
  className?: string;
  onMouseDown?: React.MouseEventHandler;
  onMouseUp?: React.MouseEventHandler;
  onTouchEnd?: React.TouchEventHandler;
}

// Widget style classes
const getWidgetClasses = (style: 'solid' | 'glass' | 'transparent' | 'frameless') => {
  switch (style) {
    case 'glass':
      return 'bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl';
    case 'transparent':
      return 'bg-transparent border border-white/10';
    case 'frameless':
      return 'bg-transparent border-0 shadow-none';
    case 'solid':
    default:
      return 'bg-zinc-900/90 border border-zinc-700 shadow-lg';
  }
};

// ForwardRef is required by react-grid-layout
export const FrameWrapper = React.forwardRef<HTMLDivElement, FrameWrapperProps>(
  ({ frame, isEditMode, onRemove, onEdit, children, widgetStyle = 'glass', style, className, onMouseDown, onMouseUp, onTouchEnd, ...props }, ref) => {

    // In frameless mode without edit mode, hide header and borders completely
    const isFrameless = widgetStyle === 'frameless';
    const showHeader = isEditMode || (frame.title && !isFrameless);

    return (
      <div
        ref={ref}
        style={style}
        className={clsx(
          "flex flex-col transition-all duration-300 h-full",
          isFrameless ? "" : "rounded-2xl",
          getWidgetClasses(widgetStyle),
          isEditMode ? "ring-2 ring-purple-500/50 shadow-purple-500/20 shadow-lg" : "",
          className
        )}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onTouchEnd={onTouchEnd}
        {...props}
      >
        {/* Header - Only visible in edit mode or if title exists (hidden in frameless mode unless editing) */}
        {showHeader && (
          <div className={clsx(
            "flex items-center justify-between px-3 py-2",
            isFrameless ? "" : "border-b border-white/10",
            isEditMode ? "cursor-move draggable-handle bg-white/5" : ""
          )}>
            <div className="flex items-center gap-2">
              {isEditMode && <GripHorizontal className="w-4 h-4 text-white/40" />}
              <span className="font-medium text-sm text-white/80 truncate">
                {frame.title || frame.type}
              </span>
            </div>

            {isEditMode && (
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(frame.id); }}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(frame.id); }}
                  className="p-1.5 hover:bg-red-500/20 rounded-lg text-white/60 hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className={clsx(
          "flex-1 min-h-0 overflow-hidden relative",
          isFrameless ? "" : "rounded-b-2xl"
        )}>
          {children}
          {/* Overlay in edit mode to prevent interaction with iframe/inputs while dragging */}
          {/* z-[5] is lower than resize handles (z-100) so resizing still works */}
          {isEditMode && <div className="absolute inset-0 bg-transparent z-[5]" />}
        </div>
      </div>
    );
  }
);

FrameWrapper.displayName = 'FrameWrapper';
