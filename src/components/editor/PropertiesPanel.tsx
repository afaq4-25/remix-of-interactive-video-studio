import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, InspectedElement } from './EditorContext';
import { X, Type, Palette, BoxSelect, Move, Image as ImageIcon, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const PropertiesPanel: React.FC = () => {
  const { selectedOverlayId, overlays, updateOverlay, inspectedElement, setInspectedElement } = useEditor();
  const selectedOverlay = overlays.find(o => o.id === selectedOverlayId);
  const [elements, setElements] = useState<{ selector: string; tagName: string; text: string }[]>([]);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const iframeQueryRef = useRef<HTMLIFrameElement | null>(null);

  // Scan the iframe for editable elements
  const scanIframe = useCallback(() => {
    if (!selectedOverlayId) return;
    const iframe = document.querySelector(`iframe[title="${selectedOverlay?.label}"]`) as HTMLIFrameElement | null;
    if (!iframe?.contentDocument) return;
    iframeQueryRef.current = iframe;

    const doc = iframe.contentDocument;
    const editableElements: { selector: string; tagName: string; text: string }[] = [];
    const tags = doc.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, button, a, label, div, img');
    
    tags.forEach((el, idx) => {
      const htmlEl = el as HTMLElement;
      // Only include elements with direct text or images
      if (htmlEl.tagName === 'IMG' || (htmlEl.childNodes.length <= 3 && htmlEl.textContent?.trim())) {
        const selector = `[data-ae-idx="${idx}"]`;
        htmlEl.setAttribute('data-ae-idx', String(idx));
        editableElements.push({
          selector,
          tagName: htmlEl.tagName,
          text: htmlEl.tagName === 'IMG' ? (htmlEl as HTMLImageElement).src : htmlEl.textContent?.trim() || '',
        });
      }
    });

    setElements(editableElements);
  }, [selectedOverlayId, selectedOverlay?.label]);

  useEffect(() => {
    if (!selectedOverlayId) {
      setElements([]);
      setInspectedElement(null);
      return;
    }
    // Delay to let iframe render
    const timer = setTimeout(scanIframe, 500);
    return () => clearTimeout(timer);
  }, [selectedOverlayId, selectedOverlay?.code, scanIframe, setInspectedElement]);

  const inspectElement = useCallback((selector: string) => {
    const iframe = iframeQueryRef.current;
    if (!iframe?.contentDocument) return;
    const el = iframe.contentDocument.querySelector(selector) as HTMLElement | null;
    if (!el) return;

    const computed = iframe.contentWindow?.getComputedStyle(el);
    if (!computed) return;

    const styles: Record<string, string> = {
      color: computed.color,
      backgroundColor: computed.backgroundColor,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      fontFamily: computed.fontFamily,
      padding: computed.padding,
      margin: computed.margin,
      borderRadius: computed.borderRadius,
      textAlign: computed.textAlign,
    };

    const inspected: InspectedElement = {
      overlayId: selectedOverlayId!,
      selector,
      tagName: el.tagName,
      textContent: el.tagName === 'IMG' ? (el as HTMLImageElement).src : el.textContent?.trim() || '',
      styles,
    };

    setInspectedElement(inspected);
    setEditValues(styles);
  }, [selectedOverlayId, setInspectedElement]);

  const applyStyleChange = useCallback((prop: string, value: string) => {
    if (!inspectedElement || !selectedOverlay) return;
    const iframe = iframeQueryRef.current;
    if (!iframe?.contentDocument) return;

    const el = iframe.contentDocument.querySelector(inspectedElement.selector) as HTMLElement | null;
    if (!el) return;

    // Apply style directly
    (el.style as any)[prop] = value;
    setEditValues(prev => ({ ...prev, [prop]: value }));

    // Serialize modified HTML back to overlay code
    const updatedHtml = iframe.contentDocument.documentElement.outerHTML;
    updateOverlay(selectedOverlay.id, { code: `<!DOCTYPE html>${updatedHtml}` });
  }, [inspectedElement, selectedOverlay, updateOverlay]);

  const applyTextChange = useCallback((newText: string) => {
    if (!inspectedElement || !selectedOverlay) return;
    const iframe = iframeQueryRef.current;
    if (!iframe?.contentDocument) return;

    const el = iframe.contentDocument.querySelector(inspectedElement.selector) as HTMLElement | null;
    if (!el) return;

    el.textContent = newText;
    setInspectedElement({ ...inspectedElement, textContent: newText });

    const updatedHtml = iframe.contentDocument.documentElement.outerHTML;
    updateOverlay(selectedOverlay.id, { code: `<!DOCTYPE html>${updatedHtml}` });
  }, [inspectedElement, selectedOverlay, updateOverlay, setInspectedElement]);

  const handleGenerateImage = useCallback(async () => {
    if (!imagePrompt.trim() || !inspectedElement || !selectedOverlay) return;
    setGeneratingImage(true);

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ prompt: imagePrompt }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.error || 'Image generation failed');
      }

      const { imageUrl } = await resp.json();

      // Apply to the inspected IMG element
      const iframe = iframeQueryRef.current;
      if (iframe?.contentDocument) {
        const el = iframe.contentDocument.querySelector(inspectedElement.selector) as HTMLImageElement | null;
        if (el && el.tagName === 'IMG') {
          el.src = imageUrl;
          const updatedHtml = iframe.contentDocument.documentElement.outerHTML;
          updateOverlay(selectedOverlay.id, { code: `<!DOCTYPE html>${updatedHtml}` });
        }
      }
      setImagePrompt('');
    } catch (e: any) {
      console.error('Image gen error:', e);
    } finally {
      setGeneratingImage(false);
    }
  }, [imagePrompt, inspectedElement, selectedOverlay, updateOverlay]);

  if (!selectedOverlayId || !selectedOverlay) return null;

  return (
    <div className="w-64 min-w-[240px] bg-card border-l border-border flex flex-col">
      <div className="h-12 flex items-center px-4 border-b border-border gap-2">
        <BoxSelect className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Properties</span>
        {inspectedElement && (
          <button onClick={() => setInspectedElement(null)} className="ml-auto p-1 rounded hover:bg-secondary text-muted-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {!inspectedElement ? (
            <>
              <div className="text-xs text-muted-foreground mb-2">
                Click an element below to inspect and edit its properties.
              </div>
              {elements.length === 0 && (
                <div className="text-xs text-muted-foreground/60 text-center py-4">
                  No editable elements found.
                  <br />
                  <button onClick={scanIframe} className="text-primary mt-2 hover:underline">Rescan</button>
                </div>
              )}
              {elements.map((el, i) => (
                <button
                  key={i}
                  onClick={() => inspectElement(el.selector)}
                  className="w-full text-left p-2 rounded-md bg-secondary hover:bg-muted text-xs flex items-center gap-2 transition-colors"
                >
                  <span className="text-primary/60 font-mono text-[10px] shrink-0 w-10 uppercase">
                    {el.tagName === 'IMG' ? '🖼️' : ''}{el.tagName.toLowerCase()}
                  </span>
                  <span className="truncate text-foreground">
                    {el.tagName === 'IMG' ? 'Image' : el.text.slice(0, 40)}
                  </span>
                </button>
              ))}
            </>
          ) : (
            <>
              <div className="text-xs font-medium text-primary mb-1 uppercase tracking-wider">
                {inspectedElement.tagName.toLowerCase()}
              </div>

              {/* Text Content */}
              {inspectedElement.tagName !== 'IMG' && (
                <div className="space-y-1">
                  <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Type className="w-3 h-3" /> Text
                  </label>
                  <input
                    value={inspectedElement.textContent}
                    onChange={(e) => applyTextChange(e.target.value)}
                    className="w-full bg-secondary text-foreground text-xs rounded px-2 py-1.5 border border-border focus:border-primary/50 outline-none"
                  />
                </div>
              )}

              {/* Image element */}
              {inspectedElement.tagName === 'IMG' && (
                <div className="space-y-2">
                  <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <ImageIcon className="w-3 h-3" /> Generate AI Image
                  </label>
                  <input
                    value={imagePrompt}
                    onChange={e => setImagePrompt(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleGenerateImage()}
                    placeholder="Describe the image..."
                    className="w-full bg-secondary text-foreground text-xs rounded px-2 py-1.5 border border-border focus:border-primary/50 outline-none"
                  />
                  <button
                    onClick={handleGenerateImage}
                    disabled={generatingImage || !imagePrompt.trim()}
                    className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40"
                  >
                    {generatingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                    {generatingImage ? 'Generating...' : 'Generate'}
                  </button>
                </div>
              )}

              {/* Colors */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Palette className="w-3 h-3" /> Colors
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Text</span>
                    <input
                      type="color"
                      value={rgbToHex(editValues.color || '')}
                      onChange={(e) => applyStyleChange('color', e.target.value)}
                      className="w-full h-7 rounded border border-border cursor-pointer bg-transparent"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Background</span>
                    <input
                      type="color"
                      value={rgbToHex(editValues.backgroundColor || '')}
                      onChange={(e) => applyStyleChange('backgroundColor', e.target.value)}
                      className="w-full h-7 rounded border border-border cursor-pointer bg-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Typography */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Type className="w-3 h-3" /> Typography
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Size</span>
                    <input
                      value={editValues.fontSize || ''}
                      onChange={(e) => applyStyleChange('fontSize', e.target.value)}
                      className="w-full bg-secondary text-foreground text-[11px] rounded px-2 py-1 border border-border outline-none focus:border-primary/50"
                      placeholder="16px"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Weight</span>
                    <select
                      value={editValues.fontWeight || '400'}
                      onChange={(e) => applyStyleChange('fontWeight', e.target.value)}
                      className="w-full bg-secondary text-foreground text-[11px] rounded px-2 py-1 border border-border outline-none"
                    >
                      <option value="100">Thin</option>
                      <option value="300">Light</option>
                      <option value="400">Normal</option>
                      <option value="500">Medium</option>
                      <option value="600">Semi</option>
                      <option value="700">Bold</option>
                      <option value="900">Black</option>
                    </select>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">Align</span>
                  <div className="flex gap-1 mt-0.5">
                    {['left', 'center', 'right'].map(align => (
                      <button
                        key={align}
                        onClick={() => applyStyleChange('textAlign', align)}
                        className={`flex-1 text-[10px] py-1 rounded border transition-colors ${
                          editValues.textAlign === align
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-secondary text-muted-foreground border-border hover:border-primary/30'
                        }`}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Spacing */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Move className="w-3 h-3" /> Spacing
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Padding</span>
                    <input
                      value={editValues.padding || ''}
                      onChange={(e) => applyStyleChange('padding', e.target.value)}
                      className="w-full bg-secondary text-foreground text-[11px] rounded px-2 py-1 border border-border outline-none focus:border-primary/50"
                      placeholder="8px"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Margin</span>
                    <input
                      value={editValues.margin || ''}
                      onChange={(e) => applyStyleChange('margin', e.target.value)}
                      className="w-full bg-secondary text-foreground text-[11px] rounded px-2 py-1 border border-border outline-none focus:border-primary/50"
                      placeholder="0px"
                    />
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">Border Radius</span>
                  <input
                    value={editValues.borderRadius || ''}
                    onChange={(e) => applyStyleChange('borderRadius', e.target.value)}
                    className="w-full bg-secondary text-foreground text-[11px] rounded px-2 py-1 border border-border outline-none focus:border-primary/50"
                    placeholder="4px"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

// Helper: convert rgb(r,g,b) to hex
function rgbToHex(rgb: string): string {
  if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return '#000000';
  if (rgb.startsWith('#')) return rgb;
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return '#000000';
  return '#' + [match[1], match[2], match[3]].map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
}

export default PropertiesPanel;
