'use client';

import confetti from 'canvas-confetti';
import { useCallback } from 'react';

export function useConfetti() {
    // Basic celebration confetti
    const celebrate = useCallback(() => {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    }, []);

    // Task completion - smaller burst
    const taskComplete = useCallback(() => {
        confetti({
            particleCount: 50,
            spread: 60,
            startVelocity: 30,
            origin: { y: 0.7 },
            colors: ['#22c55e', '#10b981', '#34d399', '#6ee7b7']
        });
    }, []);

    // Big celebration - fireworks style
    const fireworks = useCallback(() => {
        const duration = 3000;
        const end = Date.now() + duration;

        const interval = setInterval(() => {
            if (Date.now() > end) {
                clearInterval(interval);
                return;
            }

            confetti({
                particleCount: 30,
                spread: 100,
                startVelocity: 50,
                origin: {
                    x: Math.random(),
                    y: Math.random() * 0.4
                }
            });
        }, 200);
    }, []);

    // Confetti cannon from sides
    const cannon = useCallback(() => {
        // Left side
        confetti({
            particleCount: 100,
            angle: 60,
            spread: 55,
            origin: { x: 0 }
        });
        // Right side
        confetti({
            particleCount: 100,
            angle: 120,
            spread: 55,
            origin: { x: 1 }
        });
    }, []);

    // Stars confetti
    const stars = useCallback(() => {
        confetti({
            particleCount: 50,
            spread: 360,
            shapes: ['star'],
            colors: ['#ffd700', '#ffec8b', '#fff8dc'],
            scalar: 1.2
        });
    }, []);

    // Hearts confetti
    const hearts = useCallback(() => {
        const heart = confetti.shapeFromText({ text: '❤️', scalar: 2 });
        confetti({
            particleCount: 30,
            spread: 100,
            shapes: [heart],
            scalar: 2
        });
    }, []);

    return {
        celebrate,
        taskComplete,
        fireworks,
        cannon,
        stars,
        hearts
    };
}
