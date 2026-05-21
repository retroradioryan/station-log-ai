// One-shot capture script for GitHub Actions.
// Finds active stations whose monitoring_start falls within the current
// 5-minute window in Europe/Dublin, captures each one in parallel for the
// full monitoring window, uploads to Supabase Storage, then triggers the
// transcribe hook. Exits when all captures finish.

import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  APP_URL,
  TZ = "Europe/Dublin",
  // For manual workflow_dispatch runs: capture this station for N seconds now
  CAPTURE_STATION_ID,
  CAPTURE_DURATION_SECONDS,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !APP_URL) {
  console.error("Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or APP_URL");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function nowInTz() {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour12: false,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  const dowMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    dow: dowMap[parts.weekday],
    hh: Number(parts.hour),
    mm: Number(parts.minute),
  };
}

function secondsBetween(start, end) {
  const [sh, sm] = String(start).split(":").map(Number);
  const [eh, em] = String(end).split(":").map(Number);
  return Math.max(60, (eh * 3600 + em * 60) - (sh * 3600 + sm * 60));
}

async function recordStation(station, durationSec) {
  const date = new Date().toISOString().slice(0, 10);
  const startedAt = new Date();

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
  if (error) { console.error(`[${station.name}] insert failed`, error); return; }

  const path = `${station.id}/${date}/${rec.id}.mp3`;
  console.log(`[${station.name}] capturing ${durationSec}s → ${path}`);

  const ff = spawn("ffmpeg", [
    "-hide_banner", "-loglevel", "error",
    "-user_agent", "Mozilla/5.0",
    "-i", station.stream_url,
    "-t", String(durationSec),
    "-vn",
    "-acodec", "libmp3lame", "-b:a", "96k",
    "-f", "mp3", "pipe:1",
  ]);

  const chunks = [];
  ff.stdout.on("data", (c) => chunks.push(c));
  ff.stderr.on("data", (c) => process.stderr.write(`[${station.name}] ${c}`));

  await new Promise((resolve) => ff.on("close", resolve));
  const buf = Buffer.concat(chunks);

  if (buf.length === 0) {
    console.error(`[${station.name}] empty capture`);
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
  }).eq("id", rec.id);

  console.log(`[${station.name}] uploaded ${(buf.length / 1024 / 1024).toFixed(1)}MB, triggering transcribe`);
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
}

async function main() {
  // Manual one-off capture (workflow_dispatch with inputs)
  if (CAPTURE_STATION_ID) {
    const { data: s, error } = await sb.from("stations").select("*").eq("id", CAPTURE_STATION_ID).single();
    if (error || !s) { console.error("station not found", error); process.exit(1); }
    await recordStation(s, Number(CAPTURE_DURATION_SECONDS) || 60);
    return;
  }

  // Scheduled run: find stations whose start time is in the current 5-min window
  const { dow, hh, mm } = nowInTz();
  console.log(`Tick: ${TZ} dow=${dow} ${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}`);

  const { data: stations, error } = await sb.from("stations").select("*").eq("active", true);
  if (error) { console.error(error); process.exit(1); }

  const due = (stations ?? []).filter((s) => {
    if (!s.monitoring_days?.includes(dow)) return false;
    const [sh, sm] = String(s.monitoring_start).split(":").map(Number);
    const startMin = sh * 60 + sm;
    const nowMin = hh * 60 + mm;
    return nowMin >= startMin && nowMin < startMin + 5; // within current 5-min window
  });

  if (due.length === 0) { console.log("No stations due."); return; }

  console.log(`Capturing ${due.length}: ${due.map((s) => s.name).join(", ")}`);
  await Promise.all(due.map((s) => recordStation(s, secondsBetween(s.monitoring_start, s.monitoring_end))));
}

main().catch((e) => { console.error(e); process.exit(1); });
