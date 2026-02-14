import React, { useState } from 'react';
import { useEditor } from './EditorContext';
import { useNavigate } from 'react-router-dom';
import { Copy, Trash2, RotateCcw, Save, ArrowLeft, Library, Plus, Eye, Pencil, ArrowUpToLine, ArrowDownToLine } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  videoId?: string;
}

const Toolbar: React.FC<Props> = ({ videoId }) => {
  const {
    selectedOverlayId, deleteOverlay, duplicateOverlay, updateOverlay,
    overlays, editorMode, setEditorMode, drawState, setDrawState,
    bringToFront, sendToBack,
  } = useEditor();
  const selected = overlays.find(o => o.id === selectedOverlayId);
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const isDrawActive = drawState.phase !== 'off';

  const handleSave = async () => {
    if (!videoId || overlays.length === 0) {
      toast.error('Nothing to save');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please sign in to save your project');
      navigate('/auth');
      return;
    }

    setSaving(true);
    try {
      const { data: video, error: videoErr } = await supabase
        .from('saved_videos')
        .insert({ user_id: user.id, youtube_id: videoId, title: `Project – ${videoId}` })
        .select('id')
        .single();

      if (videoErr) throw videoErr;

      const overlayRows = overlays.map((o, i) => ({
        saved_video_id: video.id,
        label: o.label,
        html_code: o.code,
        x: o.transform.x,
        y: o.transform.y,
        width: o.transform.width,
        height: o.transform.height,
        rotation: o.transform.rotation,
        start_time: o.timeline.start,
        end_time: o.timeline.end,
        sort_order: i,
      }));

      const { error: overlayErr } = await supabase.from('saved_overlays').insert(overlayRows);
      if (overlayErr) throw overlayErr;

      toast.success('Project saved!');
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-12 bg-card border-b border-border flex items-center px-4 gap-2 shrink-0">
      <button onClick={() => navigate('/')} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
        <ArrowLeft className="w-4 h-4" />
      </button>
      <span className="text-sm font-bold tracking-tight text-foreground">
        <span className="text-primary">A</span>ETHER
      </span>
      <div className="w-px h-5 bg-border" />

      {/* New Overlay button */}
      <button
        onClick={() => {
          if (isDrawActive) {
            setDrawState({ phase: 'off' });
          } else {
            setDrawState({ phase: 'ready' });
          }
        }}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
          isDrawActive
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground hover:bg-muted'
        }`}
      >
        <Plus className="w-3.5 h-3.5" />
        {isDrawActive ? 'Cancel Draw' : '+ New Overlay'}
      </button>

      {/* Mode toggle */}
      <div className="flex items-center bg-secondary rounded-md p-0.5">
        <button
          onClick={() => setEditorMode('edit')}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
            editorMode === 'edit' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Pencil className="w-3 h-3" />
          Edit
        </button>
        <button
          onClick={() => setEditorMode('preview')}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
            editorMode === 'preview' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Eye className="w-3 h-3" />
          Preview
        </button>
      </div>

      <div className="w-px h-5 bg-border" />

      {selected ? (
        <>
          <span className="text-xs text-muted-foreground truncate max-w-32">{selected.label}</span>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => bringToFront(selected.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Bring to front">
              <ArrowUpToLine className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => sendToBack(selected.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Send to back">
              <ArrowDownToLine className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => updateOverlay(selected.id, { transform: { rotation: 0 } } as any)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Reset rotation">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => duplicateOverlay(selected.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Duplicate">
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => deleteOverlay(selected.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-5 bg-border mx-1" />
            <button onClick={handleSave} disabled={saving} className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </>
      ) : (
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => navigate('/library')} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="My Library">
            <Library className="w-4 h-4" />
          </button>
          <button onClick={handleSave} disabled={saving || overlays.length === 0} className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5">
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Toolbar;
