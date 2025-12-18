import React from 'react';
import { Frame } from '@/types/dashboard';

interface VideoFrameProps {
  frame: Frame;
}

export default function VideoFrame({ frame }: VideoFrameProps) {
  // Extract video ID from config or use default (Lofi Girl)
  const videoId = frame.config.videoId || 'jfKfPfyJRdk';
  
  return (
    <div className="h-full w-full bg-black">
      <iframe 
        width="100%" 
        height="100%" 
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}`} 
        title="YouTube video player" 
        frameBorder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
        allowFullScreen
      />
    </div>
  );
}
