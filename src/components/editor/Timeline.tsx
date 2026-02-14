import React, { useState, useCallback } from 'react';
import { useEditor } from './EditorContext';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const Timeline: React.FC = () => {
  const { overlays, currentTime, duration, setCurrentTime, selectedOverlayId, selectOverlay, updateOverlay } = useEditor();
  const [edgeDrag, setEdgeDrag] = useState<{ id: string; edge: 'start' | 'end'; initVal: number } | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (edgeDrag) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setCurrentTime(pct * duration);
  };

  const handleEdgeMouseDown = useCallback((e: React.MouseEvent, id: string, edge: 'start' | 'end', initVal: number) => {
    e.stopPropagation();
    e.preventDefault();
    setEdgeDrag({ id, edge, initVal });

    const handleMove = (me: MouseEvent) => {
      const timeline = (e.target as HTMLElement).closest('[data-timeline]');
      if (!timeline) return;
      const rect = timeline.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (me.clientX - rect.left) / rect.width));
      const time = Math.round(pct * duration);
      updateOverlay(id, { timeline: { [edge]: Math.max(0, Math.min(duration, time)) } } as any);
    };

    const handleUp = () => {
      setEdgeDrag(null);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [duration, updateOverlay]);

  const markers = Array.from({ length: Math.floor(duration / 5) + 1 }, (_, i) => i * 5);

  return (
    <div className="h-40 bg-card border-t border-border flex flex-col select-none">
      <div className="flex items-center px-4 h-8 border-b border-border shrink-0">
        <span className="text-xs font-medium text-muted-foreground">Timeline</span>
        <span className="ml-auto text-xs text-muted-foreground font-mono">{fmt(currentTime)} / {fmt(duration)}</span>
      </div>
      <div className="flex-1 relative overflow-hidden" data-timeline>
        {/* Ruler */}
        <div className="h-6 border-b border-border relative cursor-pointer" onClick={handleClick}>
          {markers.map(t => (
            <div key={t} className="absolute top-0 flex flex-col items-start" style={{ left: `${(t / duration) * 100}%` }}>
              <div className="w-px h-3 bg-border" />
              <span className="text-[9px] text-muted-foreground ml-0.5 leading-none">{fmt(t)}</span>
            </div>
          ))}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 transition-[left] duration-75"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          >
            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rounded-full" />
          </div>
        </div>
        {/* Tracks */}
        <div className="relative cursor-pointer" onClick={handleClick}>
          {overlays.length === 0 && (
            <div className="h-16 flex items-center justify-center text-xs text-muted-foreground">
              Draw an overlay region to get started
            </div>
          )}
          {overlays.map(overlay => {
            const startPct = (overlay.timeline.start / duration) * 100;
            const widthPct = ((overlay.timeline.end - overlay.timeline.start) / duration) * 100;
            return (
              <div key={overlay.id} className="h-8 relative border-b border-border/30">
                <div
                  className={`absolute top-1 h-6 rounded-md text-[11px] flex items-center px-2 truncate transition-colors ${
                    selectedOverlayId === overlay.id
                      ? 'bg-primary/90 text-primary-foreground shadow-sm shadow-primary/30'
                      : 'bg-secondary hover:bg-muted text-secondary-foreground'
                  }`}
                  style={{
                    left: `${startPct}%`,
                    width: `${widthPct}%`,
                    minWidth: '40px',
                  }}
                  onClick={(e) => { e.stopPropagation(); selectOverlay(overlay.id); }}
                >
                  {/* Left edge drag handle */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/40 rounded-l-md"
                    onMouseDown={(e) => handleEdgeMouseDown(e, overlay.id, 'start', overlay.timeline.start)}
                  />
                  <span className="mx-2 truncate">{overlay.label}</span>
                  {/* Right edge drag handle */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/40 rounded-r-md"
                    onMouseDown={(e) => handleEdgeMouseDown(e, overlay.id, 'end', overlay.timeline.end)}
                  />
                </div>
              </div>
            );
          })}
          {/* Playhead line on tracks */}
          <div
            className="absolute top-0 bottom-0 w-px bg-primary/50 pointer-events-none"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default Timeline;
