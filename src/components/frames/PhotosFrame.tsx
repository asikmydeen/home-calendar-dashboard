import React, { useState, useEffect } from 'react';
import Image from 'next/image';

const MOCK_PHOTOS = [
  'https://picsum.photos/seed/1/800/600',
  'https://picsum.photos/seed/2/800/600',
  'https://picsum.photos/seed/3/800/600',
  'https://picsum.photos/seed/4/800/600',
];

export default function PhotosFrame() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % MOCK_PHOTOS.length);
    }, 10000); // 10 seconds

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-full w-full relative bg-black">
      <Image
        src={MOCK_PHOTOS[index]}
        alt="Slideshow"
        fill
        className="object-cover transition-opacity duration-1000"
        priority
        sizes="100vw"
      />
      <div className="absolute bottom-4 right-4 text-white/50 text-xs">
        via Google Photos
      </div>
    </div>
  );
}
