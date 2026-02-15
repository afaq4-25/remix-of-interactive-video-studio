import React, { useState, useRef, useEffect } from 'react';
import { useEditor, Overlay } from './EditorContext';
import { Send, Sparkles, Pencil, Loader2, X } from 'lucide-react';
import { streamOverlayGeneration } from '@/lib/ai-stream';

const ChatPanel: React.FC = () => {
  const {
    addChatMessage, getChatMessages, addOverlay, updateOverlay, currentTime,
    selectedOverlayId, overlays, drawState, setDrawState
  } = useEditor();
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamPreview, setStreamPreview] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const selectedOverlay = overlays.find(o => o.id === selectedOverlayId);
  const isPrompting = drawState.phase === 'prompting';

  // Determine the chat context: overlay-specific or global
  const chatContextId = isPrompting ? '__new__' : (selectedOverlayId || 'global');
  const chatMessages = getChatMessages(chatContextId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, streamPreview]);

  const getPixelDimensions = (box: { x: number; y: number; width: number; height: number }) => {
    const videoCanvas = document.querySelector('[data-video-canvas]') as HTMLDivElement | null;
    if (!videoCanvas) return { widthPx: 0, heightPx: 0 };
    const rect = videoCanvas.getBoundingClientRect();
    return {
      widthPx: Math.round((box.width / 100) * rect.width),
      heightPx: Math.round((box.height / 100) * rect.height),
    };
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isGenerating) return;
    setInput('');

    const isEditing = !!selectedOverlay && !isPrompting;
    const drawnBox = isPrompting && drawState.box ? drawState.box : null;

    addChatMessage(chatContextId, { id: crypto.randomUUID(), role: 'user', content: text });
    setIsGenerating(true);
    setStreamPreview('');

    addChatMessage(chatContextId, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `${isEditing ? '✏️ Editing' : '🔨 Generating'} overlay...`,
    });

    const aspectRatio = drawnBox ? (drawnBox.width / drawnBox.height).toFixed(2) : undefined;
    const pixelDims = drawnBox ? getPixelDimensions(drawnBox) : { widthPx: 0, heightPx: 0 };

    // Build conversation history for context (only for editing existing overlays)
    const history = isEditing ? getChatMessages(selectedOverlayId!).filter(m => m.role === 'user').map(m => m.content) : [];

    await streamOverlayGeneration({
      prompt: text,
      existingCode: isEditing ? selectedOverlay.code : undefined,
      mode: isEditing ? 'edit' : 'create',
      dimensions: drawnBox ? {
        width: drawnBox.width,
        height: drawnBox.height,
        aspectRatio: aspectRatio!,
        widthPx: pixelDims.widthPx,
        heightPx: pixelDims.heightPx,
      } : undefined,
      onDelta: (chunk) => setStreamPreview(prev => prev + chunk),
      onDone: (html) => {
        setStreamPreview('');
        if (isEditing) {
          updateOverlay(selectedOverlay.id, { code: html });
          addChatMessage(selectedOverlayId!, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `✅ Updated **${selectedOverlay.label}**.`,
          });
        } else {
          const label = text.length > 30 ? text.slice(0, 30) + '…' : text;
          const maxZ = Math.max(0, ...overlays.map(o => o.zIndex));
          const overlay: Overlay = {
            id: crypto.randomUUID(),
            type: 'iframe',
            code: html,
            timeline: { start: Math.max(0, currentTime), end: Math.min(60, currentTime + 10) },
            transform: drawnBox
              ? { x: drawnBox.x, y: drawnBox.y, width: drawnBox.width, height: drawnBox.height, rotation: 0 }
              : { x: 10 + Math.random() * 30, y: 10 + Math.random() * 30, width: 30, height: 25, rotation: 0 },
            zIndex: maxZ + 1,
            isResponsive: true,
            label,
          };
          addOverlay(overlay);
          // The addOverlay callback initializes the overlay's chat history
        }
        setDrawState({ phase: 'off' });
        setIsGenerating(false);
      },
      onError: (error) => {
        setStreamPreview('');
        addChatMessage(chatContextId, { id: crypto.randomUUID(), role: 'assistant', content: `❌ Error: ${error}` });
        setIsGenerating(false);
      },
    });
  };

  const cancelDraw = () => setDrawState({ phase: 'off' });

  return (
    <div className="w-80 min-w-[280px] bg-card border-r border-border flex flex-col">
      <div className="h-12 flex items-center px-4 border-b border-border gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">AI Agent</span>
        {selectedOverlay && !isPrompting && (
          <span className="ml-auto flex items-center gap-1 text-[11px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            <Pencil className="w-3 h-3" />
            {selectedOverlay.label}
          </span>
        )}
        {isPrompting && (
          <span className="ml-auto flex items-center gap-1 text-[11px] text-accent bg-accent/10 px-2 py-0.5 rounded-full">
            New Region
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {chatMessages.length === 0 && !isPrompting && !selectedOverlay && (
          <div className="text-xs text-muted-foreground text-center py-8">
            Select an overlay to see its chat history, or draw a new region.
          </div>
        )}
        {chatMessages.map(msg => (
          <div key={msg.id} className={`animate-fade-in ${msg.role === 'user' ? 'ml-6' : 'mr-2'}`}>
            <div className={`text-xs mb-1 ${msg.role === 'user' ? 'text-right text-muted-foreground' : 'text-primary font-medium'}`}>
              {msg.role === 'user' ? 'You' : 'Aether'}
            </div>
            <div className={`text-sm rounded-lg px-3 py-2 ${msg.role === 'user' ? 'bg-secondary text-secondary-foreground' : 'bg-muted/50 text-foreground'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isGenerating && streamPreview && (
          <div className="animate-fade-in mr-2">
            <div className="text-xs mb-1 text-primary font-medium">Aether · Streaming</div>
            <div className="text-[11px] rounded-lg px-3 py-2 bg-muted/50 text-muted-foreground font-mono max-h-32 overflow-y-auto whitespace-pre-wrap break-all">
              {streamPreview.slice(-300)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-border">
        {isPrompting && (
          <div className="mb-2 p-2 rounded-md bg-primary/5 border border-primary/20 flex items-center justify-between">
            <span className="text-xs text-primary">Region drawn — describe what to build</span>
            <button onClick={cancelDraw} className="p-0.5 rounded hover:bg-primary/10 text-primary">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={
              isPrompting
                ? 'What should I build in this space?'
                : selectedOverlay
                  ? `Edit "${selectedOverlay.label}"...`
                  : 'Click "+ New Overlay" or select one...'
            }
            className="flex-1 bg-secondary text-foreground text-sm rounded-lg px-3 py-2 outline-none border border-border focus:border-primary/50 transition-all placeholder:text-muted-foreground"
            disabled={isGenerating || (!isPrompting && !selectedOverlay)}
            autoFocus={isPrompting}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isGenerating}
            className="p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-30 transition-opacity"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        {(isPrompting || (!selectedOverlay && !isPrompting)) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {['3D cube game', 'Animated calculator', 'Physics simulation', 'Quiz widget', 'Countdown timer'].map(s => (
              <button
                key={s}
                onClick={() => setInput(s)}
                disabled={isGenerating || !isPrompting}
                className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPanel;
