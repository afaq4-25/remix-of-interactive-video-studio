import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, existingCode, mode, dimensions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const dimensionContext = dimensions
      ? `\n\nIMPORTANT CONTEXT: The user drew a bounding box with aspect ratio ${dimensions.aspectRatio} (${Math.round(dimensions.width)}% × ${Math.round(dimensions.height)}% of the video). Design the content to perfectly fill this space. Use 100vw and 100vh for sizing.`
      : '';

    const systemPrompt = `You are Aether, an expert frontend code generator. You create standalone HTML files that run inside sandboxed iframes.

RULES:
- Output ONLY the complete HTML document (<!DOCTYPE html>...). No markdown, no explanation, no code fences.
- The HTML must be a single self-contained file with inline CSS and JS.
- Use modern CSS (flexbox, grid, gradients, animations, transforms).
- For 3D: use Three.js from CDN (https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js).
- For complex animations: use GSAP from CDN (https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js).
- For charts: use inline SVG or Canvas.
- Make it visually stunning with smooth animations.
- body must have margin:0 and background:transparent.
- Use system-ui font stack.
- Make interactive elements work (click, hover, drag).
- Keep the code compact but readable.
- For games, include game loop and keyboard/mouse controls.
- For calculators, make all buttons functional.
- For animations, use requestAnimationFrame or CSS @keyframes.
- CRITICAL: Use 100vw and 100vh units. Use flexbox/grid centering. NO fixed pixel widths/heights.
- The content MUST fill the iframe viewport responsively and reflow on resize.
- Use clamp(), min(), max() for responsive font sizes.${dimensionContext}`;

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
