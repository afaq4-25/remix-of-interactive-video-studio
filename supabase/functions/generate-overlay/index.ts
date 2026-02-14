import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Library CDN map for auto-injection
const LIBRARY_CDNS: Record<string, { keywords: string[]; tag: string }> = {
  threejs: {
    keywords: ["3d", "three", "3d game", "webgl", "cube", "sphere", "scene"],
    tag: '<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"><\/script>',
  },
  matterjs: {
    keywords: ["physics", "2d physics", "gravity", "collision", "rigid body"],
    tag: '<script src="https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js"><\/script>',
  },
  p5js: {
    keywords: ["p5", "creative coding", "sketch", "generative", "particle"],
    tag: '<script src="https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js"><\/script>',
  },
  gsap: {
    keywords: ["animation", "animate", "tween", "transition", "motion"],
    tag: '<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"><\/script>',
  },
};

function detectLibraries(prompt: string): string[] {
  const lower = prompt.toLowerCase();
  const tags: string[] = [];
  for (const lib of Object.values(LIBRARY_CDNS)) {
    if (lib.keywords.some(kw => lower.includes(kw))) {
      tags.push(lib.tag);
    }
  }
  return tags;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, existingCode, mode, dimensions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Detect libraries to auto-inject
    const libraryTags = detectLibraries(prompt);
    const libraryContext = libraryTags.length > 0
      ? `\n\nAUTO-INJECTED LIBRARIES: The following libraries are available via CDN. Include these script tags in your <head>:\n${libraryTags.join('\n')}\nUse these libraries directly in your code.`
      : '';

    // Context-aware dimension logic
    let dimensionContext = '';
    if (dimensions) {
      const widthPx = dimensions.widthPx || 0;
      const heightPx = dimensions.heightPx || 0;
      let sizeGuidance = '';

      if (widthPx > 0 && widthPx < 300) {
        sizeGuidance = `\nSIZE CATEGORY: WIDGET (${widthPx}×${heightPx}px). Generate a widget-style, minimal UI with large fonts and no padding. Use flex-col layouts. Keep it simple — big text, single-purpose. No sidebars or complex layouts.`;
      } else if (widthPx >= 300 && widthPx <= 800) {
        sizeGuidance = `\nSIZE CATEGORY: MEDIUM (${widthPx}×${heightPx}px). Generate a balanced UI with appropriate spacing. Content should fill the space without feeling cramped or too sparse.`;
      } else if (widthPx > 800) {
        sizeGuidance = `\nSIZE CATEGORY: DESKTOP (${widthPx}×${heightPx}px). Generate a full desktop-class application. You can use sidebars, multi-column layouts, and complex UI patterns.`;
      }

      dimensionContext = `\n\nIMPORTANT DIMENSION CONTEXT: The user drew a bounding box of ${widthPx}×${heightPx}px (aspect ratio ${dimensions.aspectRatio}, ${Math.round(dimensions.width)}% × ${Math.round(dimensions.height)}% of the video). Design the content to perfectly fill this space.${sizeGuidance}`;
    }

    const systemPrompt = `You are Aether, an expert frontend code generator. You create standalone HTML files that run inside sandboxed iframes.

RULES:
- Output ONLY the complete HTML document (<!DOCTYPE html>...). No markdown, no explanation, no code fences.
- The HTML must be a single self-contained file with inline CSS and JS.
- Use modern CSS (flexbox, grid, gradients, animations, transforms).
- Make it visually stunning with smooth animations.
- body must have margin:0 and background:transparent.
- Use system-ui font stack.
- Make interactive elements work (click, hover, drag).
- Keep the code compact but readable.
- For games, include game loop and keyboard/mouse controls. Ensure WASD and arrow keys work.
- For calculators, make all buttons functional.
- For animations, use requestAnimationFrame or CSS @keyframes.
- CRITICAL: Use 100vw and 100vh units for sizing. Use flexbox/grid centering. NO fixed pixel widths/heights for layout containers.
- The content MUST fill the iframe viewport responsively and reflow on resize.
- Use clamp(), min(), max(), and container-relative units for responsive font sizes.
- Use @container queries where possible for component-level responsiveness.
- For keyboard-interactive content (games, etc.), add tabindex="0" to the main element and use addEventListener for keydown events on the document.${dimensionContext}${libraryContext}`;

    let userMessage = "";
    if (mode === "edit" && existingCode) {
      userMessage = `Here is the current HTML code of an iframe overlay:\n\n${existingCode}\n\nThe user wants the following changes: ${prompt}\n\nReturn the COMPLETE updated HTML document.`;
    } else {
      userMessage = `Create an interactive HTML overlay for: ${prompt}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
