# Station Log — Ingestion Worker

Lovable's web app runs on Cloudflare Workers, which **cannot** hold a long-lived
ffmpeg pipe open against a radio stream. This tiny Node service does that work:

```
[radio stream URL] ──ffmpeg──▶ [mp3 buffer] ──▶ Supabase Storage (`recordings` bucket)
                                                ──▶ recordings table
                                                ──▶ POST /api/public/hooks/transcribe
                                                       └─▶ Deepgram → transcripts
                                                       └─▶ Lovable AI → segments
```

## What it does

Every minute the worker checks `public.stations` and, for any active station
whose `monitoring_start` matches the current minute (in the configured timezone)
and whose `monitoring_days` includes today, it:

1. Inserts a `recordings` row (`status=recording`).
2. Spawns `ffmpeg` against `stream_url` for the configured window (default 4–6pm).
3. Uploads the resulting mp3 to `recordings/<station_id>/<date>/<rec_id>.mp3`.
4. Updates the row with `audio_url` + `duration_seconds`.
5. POSTs `{ recording_id }` to `APP_URL/api/public/hooks/transcribe`, which
   transcribes via Deepgram and chains to `/segment` for AI segmentation.

## Required environment

| Var | Where to get it |
|---|---|
| `SUPABASE_URL` | Lovable Cloud → Connectors → Lovable Cloud |
| `SUPABASE_SERVICE_ROLE_KEY` | Same place. **Service role only — never ship to a browser.** |
| `APP_URL` | Your stable Lovable URL, e.g. `https://project--<lovable-project-id>.lovable.app` |
| `TZ` | Optional, default `Europe/Dublin` |

## Deploy on Fly.io (recommended, ~$0/mo)

```bash
cd ingestion-worker

# 1. Install flyctl: https://fly.io/docs/flyctl/install/
fly auth login

# 2. Create the app (uses fly.toml, no HTTP service)
fly launch --no-deploy --copy-config --name station-log-ingestion

# 3. Set secrets (NEVER commit these)
fly secrets set \
  SUPABASE_URL="https://<your-project>.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
  APP_URL="https://project--<lovable-project-id>.lovable.app"

# 4. Ship it
fly deploy

# 5. Watch the logs
fly logs
```

## Deploy on Render

1. New → Background Worker → connect this repo, set root to `ingestion-worker/`.
2. Runtime: Docker. Plan: Starter ($7/mo) is enough for ~10 stations.
3. Add the three env vars above.
4. Deploy.

## Local dev

```bash
cd ingestion-worker
npm install
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... APP_URL=http://localhost:3000 npm start
```

For a quick end-to-end test without waiting for the cron, temporarily set a
station's `monitoring_start` to one minute in the future and a short window.

## Costs

- **Fly.io shared-cpu-1x / 512 MB**: free allowance covers 1 always-on machine.
- **Deepgram**: ~$0.0043/min for `nova-2`. 4 stations × 2h/day ≈ $1.25/day.
- **Lovable AI segmentation**: included in Lovable Cloud free tier for low volume.
- **Supabase Storage**: 2h mp3 @ 96kbps ≈ 85 MB/station/day.

## Troubleshooting

- **ffmpeg exits immediately** → the `stream_url` is probably a playlist (`.m3u`/`.pls`).
  Resolve it to the actual stream URL and store that in the `stations` table.
- **0-byte uploads** → station blocks non-browser user agents. Add
  `"-user_agent", "Mozilla/5.0", "-headers", "Referer: https://station.ie\\r\\n"`
  before `-i` in `worker.js`.
- **transcribe hook returns 500** → check `DEEPGRAM_API_KEY` is set on the Lovable side.
