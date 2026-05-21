import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/Chrome";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { fmtDate } from "@/lib/log-format";

export const Route = createFileRoute("/recordings")({ component: Recordings });

type Rec = {
  id: string;
  station_id: string;
  recording_date: string;
  duration_seconds: number | null;
  status: string;
  audio_url: string | null;
  created_at: string;
  stations?: { name: string; color: string | null } | null;
};

function RecordingRow({ rec }: { rec: Rec }) {
  const [signed, setSigned] = useState<string | null>(null);
  const [transcriptCount, setTranscriptCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (rec.audio_url) {
        const { data } = await supabase.storage
          .from("recordings")
          .createSignedUrl(rec.audio_url, 60 * 60);
        if (!cancelled) setSigned(data?.signedUrl ?? null);
      }
      const { count } = await supabase
        .from("transcripts")
        .select("id", { count: "exact", head: true })
        .eq("recording_id", rec.id);
      if (!cancelled) setTranscriptCount(count ?? 0);
    })();
    return () => { cancelled = true; };
  }, [rec.id, rec.audio_url]);

  const statusColor =
    rec.status === "completed" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    : rec.status === "processing" ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
    : rec.status === "recording" ? "bg-sky-500/15 text-sky-300 border-sky-500/30"
    : "bg-muted text-muted-foreground";

  return (
    <div className="px-5 py-4 grid grid-cols-[1fr_auto] gap-4 items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="size-2 rounded-full" style={{ background: rec.stations?.color ?? "#888" }} />
          <span className="text-sm font-medium">{rec.stations?.name ?? "Unknown station"}</span>
          <Badge variant="outline" className={`${statusColor} text-[10px]`}>{rec.status}</Badge>
          <span className="text-xs text-muted-foreground tabular-nums">
            {fmtDate(rec.recording_date)} · {rec.duration_seconds ?? "?"}s
          </span>
          {transcriptCount !== null && (
            <span className="text-xs text-muted-foreground">· {transcriptCount} utterances</span>
          )}
        </div>
        {signed ? (
          <audio controls src={signed} className="w-full max-w-xl h-9" preload="none" />
        ) : rec.audio_url ? (
          <div className="text-xs text-muted-foreground">Loading audio…</div>
        ) : (
          <div className="text-xs text-muted-foreground">No audio file yet</div>
        )}
      </div>
      <div className="text-right text-[10px] text-muted-foreground font-mono">
        {rec.id.slice(0, 8)}
      </div>
    </div>
  );
}

function Recordings() {
  const { data: recs = [], isLoading } = useQuery({
    queryKey: ["recordings-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("recordings")
        .select("*, stations(name,color)")
        .order("created_at", { ascending: false })
        .limit(200);
      return (data ?? []) as Rec[];
    },
  });

  return (
    <>
      <PageHeader title="Recordings" description="Captured audio with playback" />
      <div className="p-8">
        <Card>
          <CardContent className="p-0 divide-y divide-border/60">
            {isLoading && <div className="p-8 text-center text-muted-foreground">Loading…</div>}
            {!isLoading && recs.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">No recordings yet.</div>
            )}
            {recs.map((r) => <RecordingRow key={r.id} rec={r} />)}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
