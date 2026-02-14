import React, { useCallback } from 'react';
import { useEditor } from './EditorContext';

interface Props {
  containerRef: React.RefObject<HTMLDivElement>;
}

const DrawLayer: React.FC<Props> = ({ containerRef }) => {
  const { drawState, setDrawState } = useEditor();

  const getRelativePos = useCallback((e: React.MouseEvent) => {
    const c = containerRef.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100)),
    };
  }, [containerRef]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = getRelativePos(e);
    setDrawState({ phase: 'drawing', startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y });
  }, [getRelativePos, setDrawState]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (drawState.phase !== 'drawing') return;
    const pos = getRelativePos(e);
    setDrawState({ ...drawState, currentX: pos.x, currentY: pos.y });
  }, [drawState, getRelativePos, setDrawState]);

  const handleMouseUp = useCallback(() => {
    if (drawState.phase !== 'drawing' || !drawState.startX || !drawState.startY || !drawState.currentX || !drawState.currentY) {
      setDrawState({ phase: 'off' });
      return;
    }
    const x = Math.min(drawState.startX, drawState.currentX);
    const y = Math.min(drawState.startY, drawState.currentY);
    const width = Math.abs(drawState.currentX - drawState.startX);
    const height = Math.abs(drawState.currentY - drawState.startY);

    if (width < 3 || height < 3) {
      setDrawState({ phase: 'off' });
      return;
    }
    setDrawState({ phase: 'prompting', box: { x, y, width, height } });
  }, [drawState, setDrawState]);

  if (drawState.phase === 'ready') {
    return (
      <div
        className="absolute inset-0 z-30 cursor-crosshair"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-0 bg-background/20 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
          <div className="text-center animate-fade-in">
            <div className="w-10 h-10 mx-auto mb-2 border-2 border-dashed border-primary/60 rounded-md flex items-center justify-center">
              <span className="text-primary text-lg">+</span>
            </div>
            <p className="text-sm text-primary font-medium">Click and drag to draw an overlay region</p>
            <p className="text-xs text-muted-foreground mt-1">Draw where you want the component to appear</p>
          </div>
        </div>
      </div>
    );
  }

  if (drawState.phase === 'drawing' && drawState.startX != null && drawState.currentX != null) {
    const x = Math.min(drawState.startX, drawState.currentX);
    const y = Math.min(drawState.startY!, drawState.currentY!);
    const w = Math.abs(drawState.currentX - drawState.startX);
    const h = Math.abs(drawState.currentY! - drawState.startY!);

    return (
      <div
        className="absolute inset-0 z-30 cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="absolute inset-0 bg-background/20 pointer-events-none" />
        <div
          className="absolute border-2 border-primary rounded-md bg-primary/10 pointer-events-none"
          style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` }}
        >
          <div className="absolute -top-6 left-0 text-[10px] text-primary font-mono whitespace-nowrap">
            {Math.round(w)}% × {Math.round(h)}%
          </div>
        </div>
      </div>
    );
  }

  if (drawState.phase === 'prompting' && drawState.box) {
    return (
      <div className="absolute inset-0 z-30 pointer-events-none">
        <div
          className="absolute border-2 border-primary border-dashed rounded-md bg-primary/5 animate-pulse-glow"
          style={{
            left: `${drawState.box.x}%`,
            top: `${drawState.box.y}%`,
            width: `${drawState.box.width}%`,
            height: `${drawState.box.height}%`,
          }}
        >
          <div className="absolute -top-6 left-0 text-[10px] text-primary font-mono whitespace-nowrap">
            {Math.round(drawState.box.width)}% × {Math.round(drawState.box.height)}%
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default DrawLayer;
