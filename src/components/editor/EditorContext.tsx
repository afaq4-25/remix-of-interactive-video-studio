import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Overlay {
  id: string;
  type: 'iframe' | 'widget';
  code: string;
  timeline: { start: number; end: number };
  transform: { x: number; y: number; width: number; height: number; rotation: number };
  zIndex: number;
  isResponsive: boolean;
  label: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export type EditorMode = 'edit' | 'preview';
export type DrawPhase = 'off' | 'ready' | 'drawing' | 'prompting';
export interface DrawState {
  phase: DrawPhase;
  startX?: number;
  startY?: number;
  currentX?: number;
  currentY?: number;
  box?: { x: number; y: number; width: number; height: number };
}

interface EditorContextType {
  overlays: Overlay[];
  selectedOverlayId: string | null;
  currentTime: number;
  duration: number;
  chatMessages: ChatMessage[];
  editorMode: EditorMode;
  drawState: DrawState;
  addOverlay: (overlay: Overlay) => void;
  updateOverlay: (id: string, updates: Partial<Overlay>) => void;
  deleteOverlay: (id: string) => void;
  duplicateOverlay: (id: string) => void;
  selectOverlay: (id: string | null) => void;
  setCurrentTime: (time: number) => void;
  addChatMessage: (msg: ChatMessage) => void;
  setEditorMode: (mode: EditorMode) => void;
  setDrawState: (state: DrawState) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
}

const EditorContext = createContext<EditorContextType | null>(null);

export const useEditor = () => {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used within EditorProvider');
  return ctx;
};

export const EditorProvider = ({ children }: { children: ReactNode }) => {
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'assistant', content: 'Welcome to Aether v2! Click **"+ New Overlay"** to draw a region on the video, then describe what to build.' }
  ]);
  const [editorMode, setEditorMode] = useState<EditorMode>('edit');
  const [drawState, setDrawState] = useState<DrawState>({ phase: 'off' });
  const duration = 60;

  const addOverlay = useCallback((overlay: Overlay) => {
    setOverlays(prev => [...prev, overlay]);
    setSelectedOverlayId(overlay.id);
  }, []);

  const updateOverlay = useCallback((id: string, updates: Partial<Overlay>) => {
    setOverlays(prev => prev.map(o => {
      if (o.id !== id) return o;
      const merged = { ...o };
      if (updates.timeline) merged.timeline = { ...o.timeline, ...updates.timeline };
      if (updates.transform) merged.transform = { ...o.transform, ...updates.transform };
      if (updates.code !== undefined) merged.code = updates.code;
      if (updates.label !== undefined) merged.label = updates.label;
      if (updates.zIndex !== undefined) merged.zIndex = updates.zIndex;
      if (updates.isResponsive !== undefined) merged.isResponsive = updates.isResponsive;
      if (updates.type !== undefined) merged.type = updates.type;
      return merged;
    }));
  }, []);

  const deleteOverlay = useCallback((id: string) => {
    setOverlays(prev => prev.filter(o => o.id !== id));
    setSelectedOverlayId(prev => prev === id ? null : prev);
  }, []);

  const duplicateOverlay = useCallback((id: string) => {
    setOverlays(prev => {
      const src = prev.find(o => o.id === id);
      if (!src) return prev;
      const maxZ = Math.max(0, ...prev.map(o => o.zIndex));
      const dup: Overlay = {
        ...src,
        id: crypto.randomUUID(),
        transform: { ...src.transform, x: src.transform.x + 3, y: src.transform.y + 3 },
        zIndex: maxZ + 1,
        label: src.label + ' copy',
      };
      return [...prev, dup];
    });
  }, []);

  const bringToFront = useCallback((id: string) => {
    setOverlays(prev => {
      const maxZ = Math.max(0, ...prev.map(o => o.zIndex));
      return prev.map(o => o.id === id ? { ...o, zIndex: maxZ + 1 } : o);
    });
  }, []);

  const sendToBack = useCallback((id: string) => {
    setOverlays(prev => {
      const minZ = Math.min(0, ...prev.map(o => o.zIndex));
      return prev.map(o => o.id === id ? { ...o, zIndex: minZ - 1 } : o);
    });
  }, []);

  const addChatMessage = useCallback((msg: ChatMessage) => {
    setChatMessages(prev => [...prev, msg]);
  }, []);

  return (
    <EditorContext.Provider value={{
      overlays, selectedOverlayId, currentTime, duration, chatMessages,
      editorMode, drawState,
      addOverlay, updateOverlay, deleteOverlay, duplicateOverlay,
      selectOverlay: setSelectedOverlayId, setCurrentTime, addChatMessage,
      setEditorMode, setDrawState, bringToFront, sendToBack,
    }}>
      {children}
    </EditorContext.Provider>
  );
};
