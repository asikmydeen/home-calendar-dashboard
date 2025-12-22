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
                <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
                    <h2>Something went wrong!</h2>
                    <p>{error?.message || 'Unknown error'}</p>
                    <button
                        onClick={() => reset()}
                        style={{ padding: '10px 20px', cursor: 'pointer' }}
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
