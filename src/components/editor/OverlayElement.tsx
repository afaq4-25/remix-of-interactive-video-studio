import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Overlay, EditorMode } from './EditorContext';

interface Props {
  overlay: Overlay;
  isSelected: boolean;
  editorMode: EditorMode;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Overlay>) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

const OverlayElement: React.FC<Props> = ({ overlay, isSelected, editorMode, onSelect, onUpdate, containerRef }) => {
  const [drag, setDrag] = useState<{ type: 'move' | 'resize' | 'rotate'; sx: number; sy: number; init: any } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { transform } = overlay;

  const isPlay = editorMode === 'preview';

  // In play mode, focus iframe for keyboard capture
  useEffect(() => {
    if (isPlay && isSelected && iframeRef.current) {
      iframeRef.current.focus();
    }
  }, [isPlay, isSelected]);

  useEffect(() => {
    if (!drag) return;
    const handleMove = (e: MouseEvent) => {
      const c = containerRef.current;
      if (!c) return;
      const r = c.getBoundingClientRect();

      if (drag.type === 'move') {
        const dx = ((e.clientX - drag.sx) / r.width) * 100;
        const dy = ((e.clientY - drag.sy) / r.height) * 100;
        onUpdate(overlay.id, { transform: { x: drag.init.x + dx, y: drag.init.y + dy } } as any);
      } else if (drag.type === 'resize') {
        const dx = ((e.clientX - drag.sx) / r.width) * 100;
        const dy = ((e.clientY - drag.sy) / r.height) * 100;
        onUpdate(overlay.id, {
          transform: { width: Math.max(5, drag.init.w + dx), height: Math.max(5, drag.init.h + dy) } as any,
        });
      } else if (drag.type === 'rotate') {
        const cx = (transform.x + transform.width / 2) / 100 * r.width + r.left;
        const cy = (transform.y + transform.height / 2) / 100 * r.height + r.top;
        const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI) + 90;
        onUpdate(overlay.id, { transform: { rotation: Math.round(angle) } } as any);
      }
    };
    const handleUp = () => setDrag(null);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [drag, overlay.id, transform, containerRef, onUpdate]);

  return (
    <div
      className={`absolute group transition-shadow duration-150 ${
        isSelected && !isPlay ? 'ring-2 ring-primary ring-offset-0 rounded-md' : ''
      }`}
      style={{
        left: `${transform.x}%`,
        top: `${transform.y}%`,
        width: `${transform.width}%`,
        height: `${transform.height}%`,
        transform: `rotate(${transform.rotation}deg)`,
        transformOrigin: 'center center',
        zIndex: Math.max(2, overlay.zIndex),
        cursor: isPlay ? 'default' : (drag?.type === 'move' ? 'grabbing' : 'grab'),
      }}
      onClick={(e) => { if (!isPlay) e.stopPropagation(); }}
      onMouseDown={(e) => {
        if (isPlay) return;
        e.stopPropagation();
        onSelect(overlay.id);
        setDrag({ type: 'move', sx: e.clientX, sy: e.clientY, init: { x: transform.x, y: transform.y } });
      }}
    >
      <iframe
        ref={iframeRef}
        srcDoc={overlay.code}
        className="w-full h-full border-none rounded-sm"
        sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock"
        title={overlay.label}
        style={{ pointerEvents: isPlay ? 'auto' : 'none' }}
        tabIndex={isPlay ? 0 : -1}
      />
      {/* Edit mode handles — hidden in play mode */}
      {isSelected && !isPlay && (
        <>
          {/* Corner handles */}
          {[
            '-top-1.5 -left-1.5 cursor-nw-resize',
            '-top-1.5 -right-1.5 cursor-ne-resize',
            '-bottom-1.5 -left-1.5 cursor-sw-resize',
          ].map((cls, i) => (
            <div key={i} className={`absolute ${cls} w-3 h-3 bg-primary rounded-full border-2 border-background`} />
          ))}
          {/* Resize handle (bottom-right) */}
          <div
            className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-primary rounded-full border-2 border-background cursor-se-resize"
            onMouseDown={(e) => {
              e.stopPropagation();
              setDrag({ type: 'resize', sx: e.clientX, sy: e.clientY, init: { w: transform.width, h: transform.height } });
            }}
          />
          {/* Rotation handle */}
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div
              className="w-4 h-4 rounded-full bg-primary border-2 border-background cursor-grab hover:scale-110 transition-transform"
              onMouseDown={(e) => {
                e.stopPropagation();
                setDrag({ type: 'rotate', sx: e.clientX, sy: e.clientY, init: { r: transform.rotation } });
              }}
            />
            <div className="w-px h-4 bg-primary/60" />
          </div>
          {/* Label */}
          <div className="absolute -top-6 left-0 text-[10px] text-primary font-medium tracking-wide whitespace-nowrap bg-background/80 px-1 rounded">
            {overlay.label} · {transform.rotation}°
          </div>
        </>
      )}
      {/* Hover outline in edit mode when not selected */}
      {!isSelected && !isPlay && (
        <div className="absolute inset-0 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity ring-1 ring-primary/30 pointer-events-none" />
      )}
    </div>
  );
};

export default OverlayElement;
