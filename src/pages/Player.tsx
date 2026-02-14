import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';

interface OverlayData {
  id: string;
  label: string;
  html_code: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  start_time: number;
  end_time: number;
}

const Player: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [youtubeId, setYoutubeId] = useState('');
  const [overlays, setOverlays] = useState<OverlayData[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!projectId) return;
    const load = async () => {
      const { data: video, error: vErr } = await supabase
        .from('saved_videos')
        .select('youtube_id, title')
        .eq('id', projectId)
        .single();
      if (vErr || !video) {
        toast.error('Project not found');
        navigate('/library');
        return;
      }
      setYoutubeId(video.youtube_id);

      const { data: ovs, error: oErr } = await supabase
        .from('saved_overlays')
        .select('*')
        .eq('saved_video_id', projectId)
        .order('sort_order');
      if (!oErr && ovs) setOverlays(ovs);
      setLoading(false);
    };
    load();
  }, [projectId, navigate]);

  const togglePlay = useCallback(() => {
    if (playing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPlaying(false);
    } else {
      setPlaying(true);
      intervalRef.current = window.setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= 60) {
            clearInterval(intervalRef.current!);
            setPlaying(false);
            return 0;
          }
          return prev + 0.1;
        });
      }, 100);
    }
  }, [playing]);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  if (!projectId) return <Navigate to="/library" replace />;
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;

  const visible = overlays.filter(o => currentTime >= o.start_time && currentTime <= o.end_time);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="h-12 bg-card border-b border-border flex items-center px-4 gap-3 shrink-0">
        <button onClick={() => navigate('/library')} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold"><span className="text-primary">A</span>ETHER Player</span>
        <button onClick={togglePlay} className="ml-auto p-2 rounded-md bg-primary text-primary-foreground hover:opacity-90">
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative w-full max-w-4xl aspect-video bg-card rounded-lg overflow-visible shadow-2xl">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&modestbranding=1&rel=0`}
            className="w-full h-full rounded-lg"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Video"
          />
          {visible.map(o => (
            <div
              key={o.id}
              className="absolute"
              style={{
                left: `${o.x}%`,
                top: `${o.y}%`,
                width: `${o.width}%`,
                height: `${o.height}%`,
                transform: `rotate(${o.rotation}deg)`,
                transformOrigin: 'center center',
              }}
            >
              <iframe
                srcDoc={o.html_code}
                className="w-full h-full border-none rounded-sm"
                sandbox="allow-scripts"
                title={o.label}
              />
            </div>
          ))}
        </div>
      </div>
      {/* Simple timeline scrubber */}
      <div className="h-12 bg-card border-t border-border flex items-center px-4 gap-3">
        <span className="text-xs text-muted-foreground font-mono w-12">
          {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
        </span>
        <input
          type="range"
          min={0}
          max={60}
          step={0.1}
          value={currentTime}
          onChange={e => setCurrentTime(parseFloat(e.target.value))}
          className="flex-1 accent-primary"
        />
        <span className="text-xs text-muted-foreground font-mono w-12 text-right">1:00</span>
      </div>
    </div>
  );
};

export default Player;
