import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Play, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface SavedVideo {
  id: string;
  youtube_id: string;
  title: string;
  created_at: string;
}

const Library: React.FC = () => {
  const [videos, setVideos] = useState<SavedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      const { data, error } = await supabase
        .from('saved_videos')
        .select('id, youtube_id, title, created_at')
        .order('created_at', { ascending: false });
      if (error) {
        toast.error(error.message);
      } else {
        setVideos(data || []);
      }
      setLoading(false);
    };
    load();
  }, [navigate]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('saved_videos').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
    } else {
      setVideos(prev => prev.filter(v => v.id !== id));
      toast.success('Deleted');
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('/')} className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <Sparkles className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold"><span className="text-primary">A</span>ETHER Library</h1>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : videos.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground">No saved projects yet.</p>
          <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            Create one
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map(v => (
            <div key={v.id} className="bg-card rounded-lg border border-border overflow-hidden group hover:border-primary/30 transition-colors">
              <div className="aspect-video relative bg-muted">
                <img
                  src={`https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`}
                  alt={v.title}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => navigate(`/play/${v.id}`)}
                  className="absolute inset-0 flex items-center justify-center bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Play className="w-10 h-10 text-primary fill-primary" />
                </button>
              </div>
              <div className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground truncate">{v.title}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</p>
                </div>
                <button onClick={() => handleDelete(v.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Library;
