'use client';

import React from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body>
                <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
                    <h2>Application Error</h2>
                    <button onClick={() => reset()}>Try again</button>
                </div>
            </body>
        </html>
    );
}
