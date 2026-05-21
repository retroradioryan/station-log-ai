import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// POST /api/public/hooks/daily-digest
// body: { date?: "YYYY-MM-DD" }
// Builds a newsroom-style "STATION LOG" digest for every active station for
// the given date, persists one daily_reports row per station, and (if email
// is configured) sends it to the configured recipients.
//
// Triggered by pg_cron at 18:05 Dublin time on weekdays.
export const Route = createFileRoute("/api/public/hooks/daily-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({})) as { date?: string };
        const date = body.date ?? new Date().toISOString().slice(0, 10);

        const { data: stations } = await supabaseAdmin
          .from("stations").select("*").eq("active", true).order("name");
        if (!stations?.length) return Response.json({ ok: true, stations: 0 });

        const sections: string[] = [];
        for (const st of stations) {
          const { data: segs } = await supabaseAdmin
            .from("segments")
            .select("segment_time, segment_type, title, summary, people, topics")
            .eq("station_id", st.id).eq("segment_date", date)
            .order("segment_time");

          const lines: string[] = [`### ${st.name.toUpperCase()}`];
          if (!segs?.length) {
            lines.push("_No segments captured._");
          } else {
            for (const s of segs) {
              const hhmm = String(s.segment_time).slice(0, 5);
              const ppl = s.people?.length ? ` — ${s.people.join(", ")}` : "";
              const summary = s.summary ? ` — ${s.summary}` : "";
              lines.push(`${hhmm} ${capitalize(String(s.segment_type).replace(/_/g, " "))} — ${s.title}${summary}${ppl}`);
            }
          }
          const section = lines.join("\n");
          sections.push(section);

          await supabaseAdmin.from("daily_reports").insert({
            report_date: date,
            station_id: st.id,
            generated_summary: section,
          });
        }

        const digest = `# Station Log — ${date}, 16:00–18:00 Europe/Dublin\n\n${sections.join("\n\n")}`;

        // Email (best-effort)
        const recipients = (process.env.DIGEST_RECIPIENTS ?? "ryan@retrodrivein.ie,ronan@ronancoveney.ie")
          .split(",").map(s => s.trim()).filter(Boolean);
        let emailStatus: string;
        try {
          emailStatus = await sendDigestEmail(recipients, date, digest);
        } catch (e: any) {
          emailStatus = `error: ${e?.message ?? "unknown"}`;
        }

        return Response.json({ ok: true, date, stations: stations.length, email: emailStatus });
      },
    },
  },
});

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

async function sendDigestEmail(to: string[], date: string, markdown: string): Promise<string> {
  if (!to.length) return "skipped: no recipients";
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return "skipped: no email provider (RESEND_API_KEY not set)";

  const html = `<pre style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;white-space:pre-wrap;background:#fff;color:#111">${escapeHtml(markdown)}</pre>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.DIGEST_FROM ?? "Station Log <onboarding@resend.dev>",
      to,
      subject: `Station Log — ${date} (16:00–18:00 Dublin)`,
      html,
      text: markdown,
    }),
  });
  if (!res.ok) return `resend ${res.status}: ${await res.text()}`;
  return `sent to ${to.length}`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
