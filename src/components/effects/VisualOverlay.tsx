'use client';

import React, { useMemo, useEffect } from 'react';

export type OverlayEffect =
  | 'none'
  | 'hearts'
  | 'balloons'
  | 'snow'
  | 'stars'
  | 'bubbles'
  | 'leaves'
  | 'sparkles';

export const OVERLAY_OPTIONS: { id: OverlayEffect; label: string; emoji: string }[] = [
  { id: 'none', label: 'None', emoji: '🚫' },
  { id: 'hearts', label: 'Hearts', emoji: '❤️' },
  { id: 'balloons', label: 'Balloons', emoji: '🎈' },
  { id: 'snow', label: 'Snow', emoji: '❄️' },
  { id: 'stars', label: 'Stars', emoji: '⭐' },
  { id: 'bubbles', label: 'Bubbles', emoji: '🫧' },
  { id: 'leaves', label: 'Leaves', emoji: '🍂' },
  { id: 'sparkles', label: 'Sparkles', emoji: '✨' },
];

// CSS for overlay animations - injected globally
const overlayStyles = `
@keyframes overlay-fall-down {
  0% {
    transform: translateY(-20px) rotate(0deg) scale(var(--particle-scale, 1));
    opacity: 0.9;
  }
  100% {
    transform: translateY(100vh) rotate(360deg) scale(var(--particle-scale, 1));
    opacity: 0.2;
  }
}

@keyframes overlay-float-up {
  0% {
    transform: translateY(0) rotate(0deg) scale(var(--particle-scale, 1));
    opacity: 0.9;
  }
  100% {
    transform: translateY(-110vh) rotate(-15deg) scale(var(--particle-scale, 1));
    opacity: 0.4;
  }
}

@keyframes overlay-float-hearts {
  0% {
    transform: translateY(100vh) translateX(0) scale(var(--particle-scale, 1));
    opacity: 1;
  }
  25% {
    transform: translateY(75vh) translateX(15px) scale(calc(var(--particle-scale, 1) * 1.1));
    opacity: 0.9;
  }
  50% {
    transform: translateY(50vh) translateX(-10px) scale(calc(var(--particle-scale, 1) * 1.2));
    opacity: 0.8;
  }
  75% {
    transform: translateY(25vh) translateX(10px) scale(calc(var(--particle-scale, 1) * 1.1));
    opacity: 0.5;
  }
  100% {
    transform: translateY(-10vh) translateX(-5px) scale(var(--particle-scale, 1));
    opacity: 0;
  }
}

@keyframes overlay-bubble {
  0% {
    transform: translateY(100vh) translateX(0) scale(calc(var(--particle-scale, 1) * 0.5));
    opacity: 0.8;
  }
  25% {
    transform: translateY(75vh) translateX(-15px) scale(calc(var(--particle-scale, 1) * 0.7));
    opacity: 0.7;
  }
  50% {
    transform: translateY(50vh) translateX(10px) scale(var(--particle-scale, 1));
    opacity: 0.6;
  }
  75% {
    transform: translateY(25vh) translateX(-5px) scale(calc(var(--particle-scale, 1) * 1.1));
    opacity: 0.4;
  }
  100% {
    transform: translateY(-10vh) translateX(0) scale(calc(var(--particle-scale, 1) * 1.2));
    opacity: 0;
  }
}

@keyframes overlay-twinkle {
  0%, 100% {
    opacity: 0;
    transform: scale(calc(var(--particle-scale, 1) * 0.3));
  }
  50% {
    opacity: 1;
    transform: scale(calc(var(--particle-scale, 1) * 1.2));
  }
}

@keyframes overlay-sway-fall {
  0% {
    transform: translateY(-20px) translateX(0) rotate(0deg) scale(var(--particle-scale, 1));
    opacity: 0.9;
  }
  25% {
    transform: translateY(25vh) translateX(20px) rotate(90deg) scale(var(--particle-scale, 1));
    opacity: 0.8;
  }
  50% {
    transform: translateY(50vh) translateX(-15px) rotate(180deg) scale(var(--particle-scale, 1));
    opacity: 0.6;
  }
  75% {
    transform: translateY(75vh) translateX(10px) rotate(270deg) scale(var(--particle-scale, 1));
    opacity: 0.4;
  }
  100% {
    transform: translateY(100vh) translateX(0) rotate(360deg) scale(var(--particle-scale, 1));
    opacity: 0.2;
  }
}
`;

interface VisualOverlayProps {
  effect: OverlayEffect;
}

export default function VisualOverlay({ effect }: VisualOverlayProps) {
  // Inject global styles once
  useEffect(() => {
    const styleId = 'visual-overlay-styles';
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = overlayStyles;
      document.head.appendChild(styleEl);
    }
    return () => {
      // Cleanup on unmount if needed
    };
  }, []);

  if (effect === 'none') return null;

  const particles = useMemo(() => {
    const count = effect === 'snow' ? 50 : effect === 'sparkles' || effect === 'stars' ? 30 : 20;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 8, // More spread out delays
      duration: 4 + Math.random() * 6, // Longer, more varied durations
      size: 0.6 + Math.random() * 0.6,
      topPosition: effect === 'stars' || effect === 'sparkles' ? Math.random() * 100 : 0,
    }));
  }, [effect]);

  const getEmoji = () => {
    switch (effect) {
      case 'hearts': return ['❤️', '💕', '💗', '💖', '💝'];
      case 'balloons': return ['🎈', '🎈', '🎈', '🎉', '🎊'];
      case 'snow': return ['❄️', '❅', '❆', '✧', '•'];
      case 'stars': return ['⭐', '✨', '💫', '🌟', '✦'];
      case 'bubbles': return ['🫧', '○', '◯', '●', '◌'];
      case 'leaves': return ['🍂', '🍁', '🍃', '🌿', '🌾'];
      case 'sparkles': return ['✨', '⭐', '✦', '✧', '★', '💫'];
      default: return ['✨'];
    }
  };

  const emojis = getEmoji();

  const getAnimationStyle = (particle: typeof particles[0]) => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${particle.left}%`,
      animationDelay: `${particle.delay}s`,
      animationDuration: `${particle.duration}s`,
      animationIterationCount: 'infinite',
      animationTimingFunction: 'linear',
      '--particle-scale': particle.size,
    } as React.CSSProperties;

    switch (effect) {
      case 'balloons':
        return {
          ...baseStyle,
          top: '100%',
          animationName: 'overlay-float-up',
          animationTimingFunction: 'ease-out',
        };
      case 'snow':
        return {
          ...baseStyle,
          top: '-5%',
          animationName: 'overlay-fall-down',
        };
      case 'leaves':
        return {
          ...baseStyle,
          top: '-5%',
          animationName: 'overlay-sway-fall',
          animationTimingFunction: 'ease-in-out',
        };
      case 'hearts':
        return {
          ...baseStyle,
          top: '100%',
          animationName: 'overlay-float-hearts',
          animationTimingFunction: 'ease-in-out',
        };
      case 'bubbles':
        return {
          ...baseStyle,
          top: '100%',
          animationName: 'overlay-bubble',
          animationTimingFunction: 'ease-in-out',
        };
      case 'stars':
      case 'sparkles':
        return {
          ...baseStyle,
          top: `${particle.topPosition}%`,
          animationName: 'overlay-twinkle',
          animationTimingFunction: 'ease-in-out',
        };
      default:
        return {
          ...baseStyle,
          top: '-5%',
          animationName: 'overlay-fall-down',
        };
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-30">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="text-2xl"
          style={getAnimationStyle(particle)}
        >
          {emojis[particle.id % emojis.length]}
        </div>
      ))}
    </div>
  );
}
