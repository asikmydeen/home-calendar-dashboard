import React from 'react';
import { Frame } from '@/types/dashboard';

interface MusicFrameProps {
  frame: Frame;
}

export default function MusicFrame({ frame }: MusicFrameProps) {
  // Default to a chill Lofi playlist if not configured
  // Spotify Embed URL structure: https://open.spotify.com/embed/playlist/ID
  const spotifyUrl = frame.config.spotifyUrl || 'https://open.spotify.com/embed/playlist/0vvXsWCC9xrXsKd4FyS8kM?utm_source=generator&theme=0';

  return (
    <div className="h-full w-full bg-black overflow-hidden">
      <iframe 
        style={{ borderRadius: 12 }} 
        src={spotifyUrl} 
        width="100%" 
        height="100%" 
        frameBorder="0" 
        allowFullScreen 
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
        loading="lazy"
        title="Spotify Player"
      />
    </div>
  );
}
