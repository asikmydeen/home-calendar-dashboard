'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Frame } from '@/types/dashboard';
import { ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';

interface WebFrameProps {
  frame: Frame;
}

export default function WebFrame({ frame }: WebFrameProps) {
  const url = frame.config.url || 'https://www.wikipedia.org';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useProxy, setUseProxy] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Determine if we should use the proxy
  const getIframeSrc = () => {
    // Some sites are known to work directly
    const directEmbedDomains = [
      'wikipedia.org',
      'youtube.com',
      'embed',
      'widget',
      'player',
    ];

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      const pathname = urlObj.pathname.toLowerCase();

      // Check if the URL is likely to work directly
      const canEmbedDirectly = directEmbedDomains.some(domain =>
        hostname.includes(domain) || pathname.includes(domain)
      );

      if (canEmbedDirectly && !useProxy) {
        return url;
      }

      // Use proxy for other sites
      return `/api/proxy?url=${encodeURIComponent(url)}`;
    } catch {
      return url;
    }
  };

  const handleLoad = () => {
    setLoading(false);
    setError(null);
  };

  const handleError = () => {
    setLoading(false);
    if (!useProxy) {
      // Try with proxy
      setUseProxy(true);
      setLoading(true);
    } else {
      setError('Unable to load this website. It may block embedding.');
    }
  };

  const refresh = () => {
    setLoading(true);
    setError(null);
    if (iframeRef.current) {
      iframeRef.current.src = getIframeSrc();
    }
  };

  // Reset when URL changes
  useEffect(() => {
    setLoading(true);
    setError(null);
    setUseProxy(false);
  }, [url]);

  return (
    <div className="h-full w-full bg-zinc-900 relative overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-2 bg-zinc-800/90 backdrop-blur-sm border-b border-zinc-700">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs text-zinc-400 truncate max-w-[200px]" title={url}>
            {url}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={refresh}
            className="p-1.5 hover:bg-zinc-700 rounded-md transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 hover:bg-zinc-700 rounded-md transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          </a>
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-5">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-zinc-400">Loading...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 pt-12">
          <div className="flex flex-col items-center gap-3 p-6 text-center max-w-sm">
            <AlertCircle className="w-10 h-10 text-amber-500" />
            <p className="text-sm text-zinc-300">{error}</p>
            <p className="text-xs text-zinc-500">
              Many websites block embedding for security reasons.
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open in New Tab
            </a>
          </div>
        </div>
      )}

      {/* Iframe */}
      <iframe
        ref={iframeRef}
        src={getIframeSrc()}
        className="w-full h-full border-0 pt-10"
        title={frame.title || "Web Frame"}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        onLoad={handleLoad}
        onError={handleError}
        style={{ display: error ? 'none' : 'block' }}
      />
    </div>
  );
}

