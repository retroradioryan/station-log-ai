import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// POST /api/public/hooks/segment-day
// body: { date?: "YYYY-MM-DD", station_id?: string }
// Pulls every transcript captured for the given station+date, asks the LLM
// to split the broadcast into discrete newsroom-grade story segments, and
// inserts them into `segments`. Existing segments for that station+date are
// wiped first so the job is idempotent.
export const Route = createFileRoute("/api/public/hooks/segment-day")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return Response.json({ error: "LOVABLE_API_KEY missing" }, { status: 500 });

        const body = await request.json().catch(() => ({})) as { date?: string; station_id?: string };
        const date = body.date ?? new Date().toISOString().slice(0, 10);

        // Resolve stations to process
        let stationsQ = supabaseAdmin.from("stations").select("*").eq("active", true);
        if (body.station_id) stationsQ = stationsQ.eq("id", body.station_id);
        const { data: stations } = await stationsQ;
        if (!stations?.length) return Response.json({ ok: true, stations: 0 });

        const results: Array<{ station: string; segments: number; error?: string }> = [];

        for (const station of stations) {
          try {
            // Recordings for this station on this date
            const { data: recs } = await supabaseAdmin
              .from("recordings")
              .select("id, started_at, recording_date")
              .eq("station_id", station.id)
              .eq("recording_date", date)
              .order("started_at");
            if (!recs?.length) { results.push({ station: station.name, segments: 0 }); continue; }

            const recIds = recs.map(r => r.id);
            const { data: transcripts } = await supabaseAdmin
              .from("transcripts").select("recording_id, transcript, start_time, end_time")
              .in("recording_id", recIds);
            if (!transcripts?.length) { results.push({ station: station.name, segments: 0 }); continue; }

            // Build a single timestamped transcript, anchored to wall-clock time of each recording.
            const recStart = new Map(recs.map(r => [r.id, r.started_at ? new Date(r.started_at) : new Date(`${date}T16:00:00Z`)]));
            const lines = transcripts
              .map(t => {
                const base = recStart.get(t.recording_id)!.getTime();
                const at = new Date(base + (t.start_time ?? 0) * 1000);
                return { at, text: t.transcript };
              })
              .sort((a, b) => a.at.getTime() - b.at.getTime())
              .map(l => `[${l.at.toISOString().slice(11, 19)}] ${l.text}`)
              .join("\n");

            const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  {
                    role: "system",
                    content: "You are a radio newsroom analyst. Split the supplied broadcast transcript (timestamps are wall-clock UTC, HH:MM:SS) into discrete content blocks (news, interview, ad, music, weather, travel, sports, listener_call, political, entertainment, discussion, other). For each segment, return: start_time (HH:MM:SS in UTC, the timestamp of the segment's first line), title (<=10 words), 1-2 sentence summary, segment_type, people[], organizations[], locations[], topics[], tone, confidence (0-1). Reply with ONLY valid JSON: { segments: Segment[] }. Aim for 4-15 segments for a 2 hour window. NEVER invent facts.",
                  },
                  { role: "user", content: `Station: ${station.name}\nDate: ${date}\n\nTranscript:\n${lines}` },
                ],
                response_format: { type: "json_object" },
              }),
            });
            if (!aiRes.ok) { results.push({ station: station.name, segments: 0, error: `ai ${aiRes.status}` }); continue; }
            const ai = await aiRes.json() as any;
            const parsed = JSON.parse(ai?.choices?.[0]?.message?.content ?? "{}") as { segments?: any[] };
            const segs = parsed.segments ?? [];
            if (!segs.length) { results.push({ station: station.name, segments: 0 }); continue; }

            // Wipe existing segments for this station+date to keep idempotent
            await supabaseAdmin.from("segments").delete().eq("station_id", station.id).eq("segment_date", date);

            const rows = segs.map((s: any) => ({
              station_id: station.id,
              segment_date: date,
              segment_time: normalizeTime(s.start_time ?? "16:00:00"),
              segment_type: normalizeType(s.segment_type ?? s.type),
              title: String(s.title ?? "Untitled segment").slice(0, 200),
              summary: s.summary ?? null,
              people: Array.isArray(s.people) ? s.people : [],
              organizations: Array.isArray(s.organizations) ? s.organizations : [],
              locations: Array.isArray(s.locations) ? s.locations : [],
              topics: Array.isArray(s.topics) ? s.topics : [],
              tone: s.tone ?? null,
              confidence: typeof s.confidence === "number" ? s.confidence : null,
            }));
            await supabaseAdmin.from("segments").insert(rows);
            results.push({ station: station.name, segments: rows.length });
          } catch (e: any) {
            results.push({ station: station.name, segments: 0, error: e?.message ?? "unknown" });
          }
        }

        return Response.json({ ok: true, date, results });
      },
    },
  },
});

function normalizeTime(t: string): string {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(t).trim());
  if (!m) return "16:00:00";
  return `${m[1].padStart(2, "0")}:${m[2]}:${(m[3] ?? "00").padStart(2, "0")}`;
}

type SegmentType = "news"|"interview"|"music"|"ad"|"sports"|"weather"|"travel"|"listener_call"|"political"|"entertainment"|"discussion"|"other";
const VALID: SegmentType[] = ["news","interview","music","ad","sports","weather","travel","listener_call","political","entertainment","discussion","other"];
function normalizeType(t: unknown): SegmentType {
  const v = String(t ?? "").toLowerCase().replace(/[\s-]+/g, "_") as SegmentType;
  return (VALID as string[]).includes(v) ? v : "other";
}
