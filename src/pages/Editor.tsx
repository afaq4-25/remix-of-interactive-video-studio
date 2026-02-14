import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { EditorProvider } from '@/components/editor/EditorContext';
import ChatPanel from '@/components/editor/ChatPanel';
import VideoCanvas from '@/components/editor/VideoCanvas';
import Timeline from '@/components/editor/Timeline';
import Toolbar from '@/components/editor/Toolbar';

const Editor: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();

  if (!videoId) return <Navigate to="/" replace />;

  return (
    <EditorProvider>
      <div className="h-screen flex flex-col overflow-hidden">
        <Toolbar videoId={videoId} />
        <div className="flex flex-1 min-h-0">
          <ChatPanel />
          <VideoCanvas videoId={videoId} />
        </div>
        <Timeline />
      </div>
    </EditorProvider>
  );
};

export default Editor;
