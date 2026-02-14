import React, { useState, useEffect } from 'react';
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
  const { transform } = overlay;

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

  const isPreview = editorMode === 'preview';

  return (
    <div
      className={`absolute group transition-shadow duration-150 ${isSelected && !isPreview ? 'ring-2 ring-primary/80 ring-offset-1 ring-offset-background rounded-md' : ''}`}
      style={{
        left: `${transform.x}%`,
        top: `${transform.y}%`,
        width: `${transform.width}%`,
        height: `${transform.height}%`,
        transform: `rotate(${transform.rotation}deg)`,
        transformOrigin: 'center center',
        zIndex: overlay.zIndex,
        cursor: isPreview ? 'default' : (drag?.type === 'move' ? 'grabbing' : 'grab'),
      }}
      onMouseDown={(e) => {
        if (isPreview) return;
        e.stopPropagation();
        onSelect(overlay.id);
        setDrag({ type: 'move', sx: e.clientX, sy: e.clientY, init: { x: transform.x, y: transform.y } });
      }}
    >
      <iframe
        srcDoc={overlay.code}
        className="w-full h-full border-none rounded-sm"
        sandbox="allow-scripts allow-same-origin"
        title={overlay.label}
        style={{ pointerEvents: isPreview ? 'auto' : 'none' }}
      />
      {isSelected && !isPreview && (
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
      {!isSelected && !isPreview && (
        <div className="absolute inset-0 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity ring-1 ring-primary/30 pointer-events-none" />
      )}
    </div>
  );
};

export default OverlayElement;
