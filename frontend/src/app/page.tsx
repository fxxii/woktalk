'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import WokIcon from '@/components/WokIcon';

export default function Home() {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const extractVideoId = (inputUrl: string): string | null => {
    // Handle various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
    ];
    
    for (const pattern of patterns) {
      const match = inputUrl.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const videoId = extractVideoId(url.trim());
    if (!videoId) {
      setError('Please enter a valid YouTube URL or video ID');
      return;
    }

    setIsProcessing(true);
    setProgress(5);
    setStatusMessage('Starting video extraction...');

    try {
      // Start processing
      const response = await fetch('/api/process-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          youtube_url: url
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start processing');
      }

      const data = await response.json();
      
      if (data.status === 'completed') {
        // Already cached - navigate immediately
        router.push(`/recipe/${data.job_id}`);
        return;
      }

      // Poll for status
      const jobId = data.job_id;
      const startStatusStream = (jobId: string) => {
        // Try direct backend port (bypass proxy which might buffer SSE)
        const host = window.location.hostname;
        const sseUrl = `http://${host}:8000/api/stream-status/${jobId}`;
        // console.log('Connecting to SSE:', sseUrl);
        
        const eventSource = new EventSource(sseUrl);

        eventSource.onmessage = (event) => {
          try {
            const statusData = JSON.parse(event.data);
            
            setProgress(statusData.progress);
            setStatusMessage(statusData.message || 'Processing...');
            
            if (statusData.status === 'completed') {
              setStatusMessage('🎉 Recipe ready! Redirecting...');
              eventSource.close();
              router.push(`/recipe/${jobId}`);
            } else if (statusData.status === 'failed') {
              setError(statusData.message || 'Processing failed');
              setIsProcessing(false);
              eventSource.close();
            }
          } catch (err) {
            console.error('Failed to parse SSE data:', err);
          }
        };

        eventSource.onerror = (err) => {
          console.error('SSE Connection Error:', err);
          // Don't close immediately as EventSource auto-reconnects
          // But if it's been too long or specific error, handle it
          if (eventSource.readyState === EventSource.CLOSED) {
            setError('Connection to server lost. Retrying...');
          }
        };

        return () => {
          eventSource.close();
        };
      };

      startStatusStream(data.job_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsProcessing(false);
    }
  };

  const handleDemo = () => {
    // Load demo recipe directly
    router.push('/recipe/GNGGWBWkRbE');
  };

  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Logo & Title */}
        <div className="text-center mb-12">
          <div className="text-8xl mb-4 animate-flame">
            <WokIcon className="w-32 h-32 mx-auto" />
          </div>
          <h1 className="text-grease-3xl font-bold mb-2">
            <span className="bg-gradient-to-r from-wok-flame to-wok-ginger bg-clip-text text-transparent">
              WokTalk
            </span>
          </h1>
          <p className="text-grease-xl font-chinese text-wok-steam/80">鑊氣</p>
          <p className="text-grease-base text-wok-steam/60 mt-4 max-w-md mx-auto">
            Transform any cooking video into a<br />
            <span className="text-wok-ginger">Hong Kong Cantonese</span> learning experience
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-2xl px-4">
          <div className="relative">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste YouTube URL here..."
              className="input-grease pr-32"
              disabled={isProcessing}
            />
            <button
              type="submit"
              disabled={isProcessing || !url.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2
                         px-6 py-2 rounded-lg font-semibold
                         bg-wok-flame text-white
                         disabled:opacity-50 disabled:cursor-not-allowed
                         hover:bg-wok-flame/90 transition-colors"
            >
              {isProcessing ? '🔥' : 'Cook!'}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 rounded-xl bg-wok-chili/20 border border-wok-chili/30 text-wok-chili">
              ❌ {error}
            </div>
          )}

          {/* Progress Bar */}
          {isProcessing && (
            <div className="mt-6">
              <div className="progress-bar mb-2">
                <div 
                  className="progress-bar-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-wok-steam/60">
                {statusMessage}
              </p>
            </div>
          )}
        </form>

        {/* Demo Button */}
        <button
          onClick={handleDemo}
          className="mt-8 btn-secondary"
        >
          🥚 Try Demo Recipe
        </button>

        {/* AI Features */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl px-4">
          <FeatureCard
            icon="🎯"
            title="Visual Grounding"
            description="AI verifies audio instructions against video frames"
          />
          <FeatureCard
            icon="👴"
            title="Uncle Style"
            description="Authentic Cha Chaan Teng personality in translations"
          />
          <FeatureCard
            icon="💰"
            title="Cost Optimized"
            description="90% token savings with smart frame sampling"
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-wok-steam/40 text-sm">
        <p>
          AI-Powered by Gemini 2.5 Flash • 
          <span className="font-chinese ml-2">上碟前猛火燒鑊，要有鑊氣呀！</span>
        </p>
      </footer>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="card text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-wok-steam mb-2">{title}</h3>
      <p className="text-sm text-wok-steam/60">{description}</p>
    </div>
  );
}
