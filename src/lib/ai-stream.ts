const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-overlay`;

export async function streamOverlayGeneration({
  prompt,
  existingCode,
  mode = 'create',
  dimensions,
  onDelta,
  onDone,
  onError,
}: {
  prompt: string;
  existingCode?: string;
  mode?: 'create' | 'edit';
  dimensions?: { width: number; height: number; aspectRatio: string };
  onDelta: (chunk: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: string) => void;
}) {
  try {
    const resp = await fetch(GENERATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ prompt, existingCode, mode, dimensions }),
    });

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({ error: "Request failed" }));
      onError(data.error || `Error ${resp.status}`);
      return;
    }

    if (!resp.body) {
      onError("No response body");
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            fullText += content;
            onDelta(content);
          }
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }

    // Flush remaining
    if (buffer.trim()) {
      for (let raw of buffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            fullText += content;
            onDelta(content);
          }
        } catch { /* ignore */ }
      }
    }

    // Extract HTML from response
    let html = fullText.trim();
    const htmlMatch = html.match(/```html?\s*\n([\s\S]*?)```/);
    if (htmlMatch) {
      html = htmlMatch[1].trim();
    } else if (!html.startsWith("<!DOCTYPE") && !html.startsWith("<html") && !html.startsWith("<")) {
      html = `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:transparent;font-family:system-ui;color:white"><div>${html}</div></body></html>`;
    }

    onDone(html);
  } catch (e) {
    onError(e instanceof Error ? e.message : "Stream failed");
  }
}
