import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Sparkles } from 'lucide-react';

function extractVideoId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([^&?\s#]+)/);
  return match ? match[1] : null;
}

const Index: React.FC = () => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleGo = () => {
    const id = extractVideoId(url.trim());
    if (!id) {
      setError('Please enter a valid YouTube URL');
      return;
    }
    navigate(`/editor/${id}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 text-center max-w-xl w-full">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-primary">A</span>ETHER
          </h1>
        </div>
        <p className="text-muted-foreground text-sm mb-8">
          Create interactive overlays on any YouTube video using AI
        </p>

        <div className="flex gap-2">
          <input
            value={url}
            onChange={e => { setUrl(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleGo()}
            placeholder="Paste a YouTube URL..."
            className="flex-1 bg-card text-foreground rounded-lg px-4 py-3 text-sm outline-none border border-border focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
          />
          <button
            onClick={handleGo}
            className="px-5 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2 animate-pulse-glow"
          >
            <Play className="w-4 h-4" />
            Open
          </button>
        </div>
        {error && <p className="text-destructive text-xs mt-2">{error}</p>}

        <p className="text-muted-foreground/60 text-[11px] mt-6">
          Try: youtube.com/watch?v=dQw4w9WgXcQ
        </p>
      </div>
    </div>
  );
};

export default Index;
