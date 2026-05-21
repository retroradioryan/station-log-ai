import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// POST /api/public/hooks/transcribe
// body: { recording_id: string }
// Pulls the audio file from the `recordings` bucket, sends it to Deepgram,
// stores the transcript, and triggers segmentation.
export const Route = createFileRoute("/api/public/hooks/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.DEEPGRAM_API_KEY;
        if (!apiKey) return Response.json({ error: "DEEPGRAM_API_KEY missing" }, { status: 500 });

        let body: { recording_id?: string };
        try { body = await request.json(); } catch { return Response.json({ error: "invalid json" }, { status: 400 }); }
        const recordingId = body.recording_id;
        if (!recordingId || typeof recordingId !== "string") {
          return Response.json({ error: "recording_id required" }, { status: 400 });
        }

        // 1. Look up recording
        const { data: rec, error: recErr } = await supabaseAdmin
          .from("recordings").select("*").eq("id", recordingId).single();
        if (recErr || !rec) return Response.json({ error: "recording not found" }, { status: 404 });
        if (!rec.audio_url) return Response.json({ error: "recording has no audio_url" }, { status: 400 });

        await supabaseAdmin.from("recordings").update({ status: "processing" }).eq("id", recordingId);

        // 2. Download audio from storage
        const { data: audio, error: dlErr } = await supabaseAdmin.storage
          .from("recordings").download(rec.audio_url);
        if (dlErr || !audio) {
          await supabaseAdmin.from("recordings").update({ status: "failed" }).eq("id", recordingId);
          return Response.json({ error: "download failed", detail: dlErr?.message }, { status: 500 });
        }
        const audioBuf = await audio.arrayBuffer();

        // 3. Send to Deepgram
        const dgRes = await fetch(
          "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&paragraphs=true&utterances=true&language=en",
          {
            method: "POST",
            headers: {
              Authorization: `Token ${apiKey}`,
              "Content-Type": "audio/mpeg",
            },
            body: audioBuf,
          },
        );
        if (!dgRes.ok) {
          await supabaseAdmin.from("recordings").update({ status: "failed" }).eq("id", recordingId);
          return Response.json({ error: "deepgram failed", status: dgRes.status, detail: await dgRes.text() }, { status: 502 });
        }
        const dg = await dgRes.json() as any;
        const channel = dg?.results?.channels?.[0];
        const utterances: Array<{ start: number; end: number; transcript: string; confidence?: number }> =
          dg?.results?.utterances ?? [];

        // 4. Store transcripts (one row per utterance for timestamp granularity)
        if (utterances.length) {
          const rows = utterances.map((u) => ({
            recording_id: recordingId,
            transcript: u.transcript,
            start_time: Math.floor(u.start),
            end_time: Math.ceil(u.end),
            confidence: u.confidence ?? null,
          }));
          await supabaseAdmin.from("transcripts").insert(rows);
        } else {
          // fallback: single transcript
          const full = channel?.alternatives?.[0]?.transcript ?? "";
          if (full) {
            await supabaseAdmin.from("transcripts").insert({
              recording_id: recordingId,
              transcript: full,
              start_time: 0,
              end_time: rec.duration_seconds ?? 0,
              confidence: channel?.alternatives?.[0]?.confidence ?? null,
            });
          }
        }

        await supabaseAdmin.from("recordings").update({ status: "completed" }).eq("id", recordingId);

        // 5. Fire-and-forget segmentation
        const origin = new URL(request.url).origin;
        fetch(`${origin}/api/public/hooks/segment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recording_id: recordingId }),
        }).catch(() => { /* logged downstream */ });

        return Response.json({ ok: true, utterances: utterances.length });
      },
    },
  },
});
