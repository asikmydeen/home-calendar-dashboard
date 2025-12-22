
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

export const proxyUrl = onRequest({ cors: true }, async (request, response) => {
    const url = request.query.url as string;

    if (!url) {
        response.status(400).json({ error: 'URL parameter is required' });
        return;
    }

    try {
        // Validate URL
        const targetUrl = new URL(url);

        // Fetch the page content
        const fetchResponse = await fetch(targetUrl.toString(), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            },
        });

        const contentType = fetchResponse.headers.get('content-type') || 'text/html';
        const content = await fetchResponse.text();

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

        // Return the content
        response.set('Content-Type', contentType);
        response.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
        response.send(modifiedContent);

    } catch (error: any) {
        logger.error('Proxy error:', error);
        response.status(500).json({ error: 'Failed to fetch the URL. The website may not be accessible.' });
    }
});
