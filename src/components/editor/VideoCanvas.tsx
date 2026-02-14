import React, { useRef } from 'react';
import { useEditor } from './EditorContext';
import OverlayElement from './OverlayElement';
import DrawLayer from './DrawLayer';

interface Props {
  videoId: string;
}

const VideoCanvas: React.FC<Props> = ({ videoId }) => {
  const { overlays, selectedOverlayId, selectOverlay, updateOverlay, currentTime, editorMode, drawState } = useEditor();
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleOverlays = overlays.filter(o => currentTime >= o.timeline.start && currentTime <= o.timeline.end);
  const isPlay = editorMode === 'preview';

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-background overflow-hidden">
      <div
        ref={containerRef}
        data-video-canvas
        className="relative w-full max-w-4xl aspect-video bg-card rounded-lg overflow-visible shadow-2xl"
        onClick={() => {
          if (!isPlay && drawState.phase === 'off') selectOverlay(null);
        }}
      >
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&modestbranding=1&rel=0`}
          className="w-full h-full rounded-lg"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Video"
        />
        {visibleOverlays.map(overlay => (
          <OverlayElement
            key={overlay.id}
            overlay={overlay}
            isSelected={selectedOverlayId === overlay.id}
            editorMode={editorMode}
            onSelect={selectOverlay}
            onUpdate={updateOverlay}
            containerRef={containerRef as React.RefObject<HTMLDivElement>}
          />
        ))}
        {drawState.phase !== 'off' && (
          <DrawLayer containerRef={containerRef as React.RefObject<HTMLDivElement>} />
        )}
      </div>
    </div>
  );
};

export default VideoCanvas;
