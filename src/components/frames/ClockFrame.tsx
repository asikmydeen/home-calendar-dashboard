import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Frame } from '@/types/dashboard';

interface ClockFrameProps {
  frame?: Frame;
}

type ClockStyle = 'minimal' | 'bold' | 'retro' | 'neon' | 'analog';

export default function ClockFrame({ frame }: ClockFrameProps) {
  const [time, setTime] = useState(new Date());
  const style: ClockStyle = (frame?.config?.style as ClockStyle) || 'neon';
  const show24Hour = frame?.config?.show24Hour || false;
  const showSeconds = frame?.config?.showSeconds || false;
  const showDate = frame?.config?.showDate !== false;
  const accentColor = frame?.config?.accentColor || '#a855f7';

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeFormat = show24Hour
    ? (showSeconds ? 'HH:mm:ss' : 'HH:mm')
    : (showSeconds ? 'h:mm:ss' : 'h:mm');
  const formattedTime = format(time, timeFormat);
  const ampm = !show24Hour ? format(time, 'a') : '';
  const formattedDate = format(time, 'EEEE, MMMM do');

  // Minimal Style - Clean and modern
  if (style === 'minimal') {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-4 bg-transparent text-white">
        <div className="text-6xl md:text-8xl font-extralight tracking-tighter opacity-90">
          {formattedTime}
          {ampm && <span className="text-2xl ml-2 opacity-50">{ampm}</span>}
        </div>
        {showDate && (
          <div className="text-lg md:text-xl font-light opacity-40 mt-3">
            {formattedDate}
          </div>
        )}
      </div>
    );
  }

  // Bold Style - Chunky and impactful
  if (style === 'bold') {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-4 bg-transparent text-white">
        <div className="text-7xl md:text-9xl font-black tracking-tight" style={{ color: accentColor }}>
          {formattedTime}
        </div>
        {ampm && <div className="text-2xl font-bold mt-2 opacity-60">{ampm}</div>}
        {showDate && (
          <div className="text-lg md:text-xl font-medium opacity-50 mt-4 uppercase tracking-widest">
            {formattedDate}
          </div>
        )}
      </div>
    );
  }

  // Retro Flip Clock Style
  if (style === 'retro') {
    const digits = formattedTime.split('');
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-4 bg-transparent">
        <div className="flex gap-2">
          {digits.map((digit, i) => (
            <div key={i} className={`
              ${digit === ':' ? 'w-6' : 'w-14 md:w-20'}
              h-20 md:h-28 flex items-center justify-center
              ${digit !== ':' ? 'bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-lg shadow-lg border border-zinc-700' : ''}
            `}>
              <span className={`
                ${digit === ':' ? 'text-4xl text-white/50 animate-pulse' : 'text-5xl md:text-7xl font-bold text-white'}
              `}>
                {digit}
              </span>
              {digit !== ':' && (
                <div className="absolute w-full h-px bg-black/30" style={{ top: '50%' }} />
              )}
            </div>
          ))}
          {ampm && (
            <div className="ml-2 flex items-center">
              <span className="text-xl font-medium text-white/50">{ampm}</span>
            </div>
          )}
        </div>
        {showDate && (
          <div className="text-lg font-light text-white/40 mt-6 tracking-wide">
            {formattedDate}
          </div>
        )}
      </div>
    );
  }

  // Neon Style - Glowing effect
  if (style === 'neon') {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-4 bg-transparent">
        <div
          className="text-6xl md:text-8xl font-light tracking-wider"
          style={{
            color: accentColor,
            textShadow: `0 0 10px ${accentColor}, 0 0 20px ${accentColor}, 0 0 40px ${accentColor}, 0 0 80px ${accentColor}`,
          }}
        >
          {formattedTime}
          {ampm && <span className="text-2xl ml-3 opacity-70">{ampm}</span>}
        </div>
        {showDate && (
          <div
            className="text-lg md:text-xl font-light mt-4 tracking-widest"
            style={{
              color: accentColor,
              opacity: 0.5,
              textShadow: `0 0 5px ${accentColor}`,
            }}
          >
            {formattedDate}
          </div>
        )}
      </div>
    );
  }

  // Analog Clock Style - SVG based
  if (style === 'analog') {
    const seconds = time.getSeconds();
    const minutes = time.getMinutes();
    const hours = time.getHours() % 12;

    const secondAngle = (seconds / 60) * 360;
    const minuteAngle = ((minutes + seconds / 60) / 60) * 360;
    const hourAngle = ((hours + minutes / 60) / 12) * 360;

    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-4 bg-transparent">
        <svg viewBox="0 0 200 200" className="w-40 h-40 md:w-56 md:h-56">
          {/* Clock face */}
          <circle cx="100" cy="100" r="95" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />

          {/* Hour markers */}
          {[...Array(12)].map((_, i) => {
            const angle = (i * 30 - 90) * (Math.PI / 180);
            const x1 = 100 + 80 * Math.cos(angle);
            const y1 = 100 + 80 * Math.sin(angle);
            const x2 = 100 + 90 * Math.cos(angle);
            const y2 = 100 + 90 * Math.sin(angle);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.5)" strokeWidth="2" />;
          })}

          {/* Hour hand */}
          <line
            x1="100" y1="100"
            x2="100" y2="50"
            stroke={accentColor}
            strokeWidth="4"
            strokeLinecap="round"
            transform={`rotate(${hourAngle} 100 100)`}
          />

          {/* Minute hand */}
          <line
            x1="100" y1="100"
            x2="100" y2="30"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${minuteAngle} 100 100)`}
          />

          {/* Second hand */}
          <line
            x1="100" y1="100"
            x2="100" y2="20"
            stroke={accentColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            transform={`rotate(${secondAngle} 100 100)`}
          />

          {/* Center dot */}
          <circle cx="100" cy="100" r="5" fill={accentColor} />
        </svg>

        {showDate && (
          <div className="text-sm md:text-base font-light text-white/40 mt-4 tracking-wide">
            {formattedDate}
          </div>
        )}
      </div>
    );
  }

  // Default fallback
  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-4 bg-transparent text-white">
      <div className="text-6xl font-light">{formattedTime}</div>
    </div>
  );
}

