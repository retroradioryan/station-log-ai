// Generates a newsroom-style daily AI summary across all monitored stations.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { date } = await req.json().catch(() => ({ date: new Date().toISOString().slice(0, 10) }));
    const reportDate = date || new Date().toISOString().slice(0, 10);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: segments, error } = await supabase
      .from("segments")
      .select("segment_time, segment_type, title, summary, people, topics, stations(name)")
      .eq("segment_date", reportDate)
      .order("segment_time");
    if (error) throw error;

    const compact = (segments || []).map((s: any) =>
      `[${s.stations?.name} ${s.segment_time?.slice(0,5)}] ${s.segment_type}: ${s.title}${s.summary ? " — " + s.summary : ""}${s.people?.length ? " (people: " + s.people.join(", ") + ")" : ""}${s.topics?.length ? " #" + s.topics.join(" #") : ""}`
    ).join("\n");

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a senior radio newsroom editor. Write a concise, factual, neutral cross-station briefing for the supplied day. No hallucinations. 4–6 short paragraphs. Highlight overlap, exclusives, dominant topics, notable people. Use newsroom voice." },
          { role: "user", content: `Date: ${reportDate}\nSegments:\n${compact || "(no segments)"}\n\nProduce: 1) one-paragraph headline summary, 2) bullet list of cross-station topics, 3) one-paragraph 'only on X' exclusives, 4) one-paragraph political/sentiment note.` },
        ],
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      return new Response(JSON.stringify({ error: `AI gateway ${aiRes.status}: ${text}` }), {
        status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const ai = await aiRes.json();
    const summary = ai?.choices?.[0]?.message?.content ?? "";

    await supabase.from("daily_reports").insert({ report_date: reportDate, generated_summary: summary });

    return new Response(JSON.stringify({ summary, date: reportDate, segments: segments?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
