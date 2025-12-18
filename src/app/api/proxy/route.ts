import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    try {
        // Validate URL
        const targetUrl = new URL(url);

        // Fetch the page content
        const response = await fetch(targetUrl.toString(), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            },
        });

        const contentType = response.headers.get('content-type') || 'text/html';
        const content = await response.text();

        // Modify the HTML to fix relative URLs and inject base tag
        let modifiedContent = content;

        // Add base tag to fix relative URLs
        const baseUrl = `${targetUrl.protocol}//${targetUrl.host}`;
        if (contentType.includes('text/html')) {
            // Inject base tag after <head>
            if (modifiedContent.includes('<head')) {
                modifiedContent = modifiedContent.replace(
                    /<head([^>]*)>/i,
                    `<head$1><base href="${baseUrl}/" target="_blank">`
                );
            }

            // Remove scripts that might cause issues
            modifiedContent = modifiedContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        }

        // Return the content without X-Frame-Options
        return new NextResponse(modifiedContent, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
            },
        });
    } catch (error) {
        console.error('Proxy error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch the URL. The website may not be accessible.' },
            { status: 500 }
        );
    }
}
