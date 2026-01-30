'use client';

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';

interface YouTubePlayerProps {
  videoId: string;
  startTime?: string; // Format: "MM:SS"
  endTime?: string;   // Format: "MM:SS"
  autoLoop?: boolean;
  onReady?: () => void;
  onEnd?: () => void;
  className?: string;
}

export interface YouTubePlayerHandle {
  replay: () => void;
}

// Convert "MM:SS" to seconds
function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

// Declare YouTube IFrame API types
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        options: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  destroy: () => void;
}

const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(({
  videoId,
  startTime,
  endTime,
  autoLoop = false,
  onReady,
  onEnd,
  className = '',
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const loopIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startSeconds = startTime ? parseTimestamp(startTime) : 0;
  const endSeconds = endTime ? parseTimestamp(endTime) : 0;

  // Expose replay method to parent
  useImperativeHandle(ref, () => ({
    replay: () => {
      if (playerRef.current) {
        playerRef.current.seekTo(startSeconds, true);
        playerRef.current.playVideo();
      }
    }
  }));

  // Check online status
  useEffect(() => {
    setIsOffline(!navigator.onLine);
    
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize YouTube player
  const initPlayer = useCallback(() => {
    if (!containerRef.current || isOffline) return;
    
    if (!videoId) {
      console.warn("YouTubePlayer: videoId is missing");
      return;
    }

    // Clean up existing player first
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (e) {
        // Ignore cleanup errors
      }
      playerRef.current = null;
    }

    // Create unique ID for player
    const playerId = `yt-player-${videoId}-${Date.now()}`;
    containerRef.current.id = playerId;

    playerRef.current = new window.YT.Player(playerId, {
      videoId,
      playerVars: {
        autoplay: 0,
        controls: 1,
        modestbranding: 1,
        rel: 0,
        start: startSeconds,
        ...(endSeconds > 0 && { end: endSeconds }),
        playsinline: 1,
      },
      events: {
        onReady: (event) => {
          setIsLoading(false);
          if (startSeconds > 0) {
            event.target.seekTo(startSeconds, true);
          }
          onReady?.();
        },
        onStateChange: (event) => {
          // Handle video end
          if (event.data === window.YT.PlayerState.ENDED) {
            if (autoLoop && startSeconds > 0) {
              playerRef.current?.seekTo(startSeconds, true);
              playerRef.current?.playVideo();
            }
            onEnd?.();
          }
        },
        onError: () => {
          setIsLoading(false);
          setIsOffline(true);
        },
      },
    });
  }, [videoId, startSeconds, endSeconds, autoLoop, isOffline, onReady, onEnd]);

  // Load YouTube IFrame API
  useEffect(() => {
    if (isOffline) return;

    // Check if API already loaded
    if (window.YT && window.YT.Player) {
      initPlayer();
      return;
    }

    // Load API script
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    // Set callback
    window.onYouTubeIframeAPIReady = initPlayer;

    return () => {
      // Clean up player safely
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // Ignore errors if player already destroyed
          console.warn('YouTube player cleanup error:', e);
        }
        playerRef.current = null;
      }
      if (loopIntervalRef.current) {
        clearInterval(loopIntervalRef.current);
        loopIntervalRef.current = null;
      }
    };
  }, [initPlayer, isOffline]);

  // Loop monitoring for timestamp-based looping
  useEffect(() => {
    if (!autoLoop || !endSeconds || !playerRef.current) return;

    loopIntervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const currentTime = playerRef.current.getCurrentTime();
          if (currentTime >= endSeconds) {
            playerRef.current.seekTo(startSeconds, true);
          }
        } catch (e) {
          // Player not ready yet, skip this iteration
        }
      }
    }, 500);

    return () => {
      if (loopIntervalRef.current) {
        clearInterval(loopIntervalRef.current);
        loopIntervalRef.current = null;
      }
    };
  }, [autoLoop, startSeconds, endSeconds]);

  // Offline fallback
  if (isOffline) {
    return (
      <div className={`youtube-container ${className}`}>
        <div className="youtube-offline">
          <div className="text-6xl mb-4">📵</div>
          <p className="text-lg">Video unavailable offline</p>
          <p className="text-sm mt-2 opacity-60">Text instructions still work!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`youtube-container ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-wok-coal">
          <div className="text-4xl animate-pulse">🔥</div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
});

YouTubePlayer.displayName = 'YouTubePlayer';

export default YouTubePlayer;
