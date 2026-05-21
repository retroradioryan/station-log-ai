// Station Log — ingestion worker
// Runs ffmpeg against each active station during its monitoring window,
// uploads the resulting mp3 to Supabase Storage, creates a `recordings`
// row, then pokes the app to transcribe + segment.
//
// Deploy on Fly.io / Render / Railway / a tiny VPS — anywhere that can keep
// a long-running Node process alive (Cloudflare Workers cannot).

import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import cron from "node-cron";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  APP_URL, // e.g. https://project--<id>.lovable.app
  TZ = "Europe/Dublin",
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !APP_URL) {
  console.error("Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or APP_URL");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const running = new Set(); // station ids currently being recorded

async function recordStation(station) {
  const date = new Date().toISOString().slice(0, 10);
  const startedAt = new Date();
  const durationSec = secondsBetween(station.monitoring_start, station.monitoring_end);

  const { data: rec, error } = await sb
    .from("recordings")
    .insert({
      station_id: station.id,
      recording_date: date,
      started_at: startedAt.toISOString(),
      status: "recording",
    })
    .select()
    .single();
  if (error) { console.error("insert recording failed", error); return; }

  const path = `${station.id}/${date}/${rec.id}.mp3`;
  console.log(`[${station.name}] recording ${durationSec}s → ${path}`);

  const ff = spawn("ffmpeg", [
    "-hide_banner", "-loglevel", "error",
    "-i", station.stream_url,
    "-t", String(durationSec),
    "-vn",
    "-acodec", "libmp3lame", "-b:a", "96k",
    "-f", "mp3", "pipe:1",
  ]);

  const chunks = [];
  ff.stdout.on("data", (c) => chunks.push(c));
  ff.stderr.on("data", (c) => process.stderr.write(`[${station.name}] ${c}`));

  ff.on("close", async (code) => {
    const buf = Buffer.concat(chunks);
    if (code !== 0 || buf.length === 0) {
      console.error(`[${station.name}] ffmpeg failed (code=${code}, bytes=${buf.length})`);
      await sb.from("recordings").update({ status: "failed", ended_at: new Date().toISOString() }).eq("id", rec.id);
      return;
    }
    const { error: upErr } = await sb.storage.from("recordings").upload(path, buf, {
      contentType: "audio/mpeg", upsert: true,
    });
    if (upErr) {
      console.error(`[${station.name}] upload failed`, upErr);
      await sb.from("recordings").update({ status: "failed", ended_at: new Date().toISOString() }).eq("id", rec.id);
      return;
    }
    await sb.from("recordings").update({
      audio_url: path,
      duration_seconds: durationSec,
      ended_at: new Date().toISOString(),
      // status will be flipped to processing → completed by transcribe hook
    }).eq("id", rec.id);

    console.log(`[${station.name}] uploaded ${buf.length} bytes, triggering transcribe`);
    try {
      const res = await fetch(`${APP_URL}/api/public/hooks/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recording_id: rec.id }),
      });
      console.log(`[${station.name}] transcribe → ${res.status}`);
    } catch (e) {
      console.error(`[${station.name}] transcribe hook failed`, e);
    }
  });
}

function secondsBetween(start, end) {
  const [sh, sm] = String(start).split(":").map(Number);
  const [eh, em] = String(end).split(":").map(Number);
  return Math.max(60, (eh * 3600 + em * 60) - (sh * 3600 + sm * 60));
}

// Every minute, check which stations should start recording RIGHT NOW.
cron.schedule("* * * * *", async () => {
  const now = new Date();
  const hhmm = now.toTimeString().slice(0, 5); // "HH:MM"
  const dow = now.getDay(); // 0=Sun..6=Sat

  const { data: stations, error } = await sb
    .from("stations")
    .select("*")
    .eq("active", true);
  if (error) { console.error("list stations failed", error); return; }

  for (const s of stations ?? []) {
    if (!s.monitoring_days?.includes(dow)) continue;
    if (s.monitoring_start.slice(0, 5) !== hhmm) continue; // start at the minute
    if (running.has(s.id)) continue;
    running.add(s.id);
    recordStation(s).finally(() => running.delete(s.id));
  }
}, { timezone: TZ });

console.log(`Station Log ingestion worker started (TZ=${TZ})`);
