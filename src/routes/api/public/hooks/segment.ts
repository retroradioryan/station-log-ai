import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// POST /api/public/hooks/segment
// body: { recording_id: string }
// Reads transcripts for a recording, asks Lovable AI to segment them into
// newsroom-grade story segments, and persists them.
export const Route = createFileRoute("/api/public/hooks/segment")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return Response.json({ error: "LOVABLE_API_KEY missing" }, { status: 500 });

        let body: { recording_id?: string };
        try { body = await request.json(); } catch { return Response.json({ error: "invalid json" }, { status: 400 }); }
        const recordingId = body.recording_id;
        if (!recordingId) return Response.json({ error: "recording_id required" }, { status: 400 });

        const { data: rec } = await supabaseAdmin
          .from("recordings").select("*, stations(*)").eq("id", recordingId).single();
        if (!rec) return Response.json({ error: "recording not found" }, { status: 404 });

        const { data: transcripts } = await supabaseAdmin
          .from("transcripts").select("*").eq("recording_id", recordingId).order("start_time");
        if (!transcripts?.length) return Response.json({ error: "no transcripts" }, { status: 400 });

        // Build a timestamped transcript for the model
        const transcriptText = transcripts.map((t) =>
          `[${formatHMS(t.start_time)}] ${t.transcript}`
        ).join("\n");

        const startedAt = rec.started_at ? new Date(rec.started_at) : new Date(`${rec.recording_date}T16:00:00Z`);

        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "You are a radio newsroom analyst. Segment a broadcast transcript into discrete content blocks (news, interview, ad, music, weather, travel, sports, listener_call, political, entertainment, discussion, other). For each segment, return a short title, 1-2 sentence summary, the segment type, key people, organizations, locations, topics, tone (neutral/critical/celebratory/etc), confidence (0-1), and the start offset in seconds from the beginning of the recording. Reply with ONLY valid JSON of shape: { segments: Segment[] }.",
              },
              {
                role: "user",
                content: `Station: ${(rec as any).stations?.name ?? "Unknown"}\nDate: ${rec.recording_date}\n\nTranscript:\n${transcriptText}`,
              },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (!aiRes.ok) {
          return Response.json({ error: "ai failed", status: aiRes.status, detail: await aiRes.text() }, { status: 502 });
        }
        const ai = await aiRes.json() as any;
        const content = ai?.choices?.[0]?.message?.content ?? "{}";
        let parsed: { segments?: any[] };
        try { parsed = JSON.parse(content); } catch { return Response.json({ error: "ai returned non-json", content }, { status: 502 }); }
        const segments = parsed.segments ?? [];

        if (!segments.length) return Response.json({ ok: true, segments: 0 });

        const rows = segments.map((s: any) => {
          const offset = Number(s.start_offset_seconds ?? s.start ?? 0);
          const segDate = new Date(startedAt.getTime() + offset * 1000);
          return {
            recording_id: recordingId,
            station_id: rec.station_id,
            segment_date: segDate.toISOString().slice(0, 10),
            segment_time: segDate.toISOString().slice(11, 19),
            segment_type: normalizeType(s.segment_type ?? s.type),
            title: String(s.title ?? "Untitled segment").slice(0, 200),
            summary: s.summary ?? null,
            people: Array.isArray(s.people) ? s.people : [],
            organizations: Array.isArray(s.organizations) ? s.organizations : [],
            locations: Array.isArray(s.locations) ? s.locations : [],
            topics: Array.isArray(s.topics) ? s.topics : [],
            tone: s.tone ?? null,
            confidence: typeof s.confidence === "number" ? s.confidence : null,
          };
        });
        await supabaseAdmin.from("segments").insert(rows);

        return Response.json({ ok: true, segments: rows.length });
      },
    },
  },
});

function formatHMS(secs: number) {
  const h = Math.floor(secs / 3600).toString().padStart(2, "0");
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
  const s = Math.floor(secs % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

const VALID = new Set(["news","interview","music","ad","sports","weather","travel","listener_call","political","entertainment","discussion","other"]);
function normalizeType(t: unknown): string {
  const v = String(t ?? "").toLowerCase().replace(/[\s-]+/g, "_");
  return VALID.has(v) ? v : "other";
}
