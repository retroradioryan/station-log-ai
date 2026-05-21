import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Waveform } from "@/components/layout/Chrome";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Mic, Signal, Timer } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/live")({ component: Live });

const TRANSCRIPT_LINES = [
  "…and we'll be back with the headlines after this short break.",
  "Joining me now in studio is crime correspondent Stephen Breen.",
  "Stephen, what can you tell us about the arrest in Dublin this afternoon?",
  "Well it's a significant development, Gardaí confirmed the operation around 2pm.",
  "Two men in their thirties have been detained for questioning.",
  "We're hearing housing figures will be released in the next hour.",
  "Listeners, the lines are open — what's the cost of living doing to your household?",
];

function Live() {
  const { data: stations = [] } = useQuery({
    queryKey: ["stations"],
    queryFn: async () => (await supabase.from("stations").select("*").eq("active", true).order("name")).data ?? [],
  });
  const [tick, setTick] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const i = setInterval(() => { setTick((t) => t + 1); setElapsed((s) => s + 1); }, 2200);
    return () => clearInterval(i);
  }, []);

  return (
    <>
      <PageHeader
        title="Live Monitor"
        description="Streaming, transcribing and tagging in real time."
        actions={
          <Badge variant="outline" className="gap-2 text-[10px] uppercase tracking-widest border-destructive/60 text-destructive">
            <span className="size-1.5 rounded-full bg-destructive live-dot" /> Live
          </Badge>
        }
      />
      <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {stations.map((s: any, idx: number) => {
          const line = TRANSCRIPT_LINES[(tick + idx) % TRANSCRIPT_LINES.length];
          return (
            <Card key={s.id} className="overflow-hidden">
              <div className="h-0.5" style={{ background: s.color || "var(--primary)" }} />
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-md grid place-items-center" style={{ background: `${s.color || "#f59e0b"}22`, color: s.color || "#f59e0b" }}>
                    <Mic className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{s.name}</CardTitle>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                      <Signal className="size-3" /> 128 kbps · stable
                      <Timer className="size-3 ml-2" /> {Math.floor(elapsed / 60)}m {elapsed % 60}s
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="gap-1 border-emerald-500/40 text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-400 live-dot" /> Recording
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <Waveform bars={48} className="h-10" />
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Now discussing</div>
                  <div className="text-sm font-medium">{["Dublin arrest","Cost of living panel","Coalition tensions","Music block"][idx % 4]}</div>
                </div>
                <div className="rounded-md bg-muted/40 border border-border/60 p-3 text-sm leading-relaxed min-h-[64px]">
                  <Activity className="size-3 inline mr-1.5 text-primary" />
                  <span className="text-muted-foreground">{line}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {["politics","dublin","crime","live"].map((t) => <Badge key={t} variant="secondary" className="text-[10px] capitalize">{t}</Badge>)}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-border/50">
                  <div><div className="text-xs text-muted-foreground">Speech conf.</div><div className="text-sm font-semibold tabular-nums">94%</div></div>
                  <div><div className="text-xs text-muted-foreground">Health</div><div className="text-sm font-semibold text-emerald-400">Good</div></div>
                  <div><div className="text-xs text-muted-foreground">Presenter</div><div className="text-sm font-semibold">— guessing —</div></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {stations.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-16">No active stations. Enable monitoring in Stations.</div>
        )}
      </div>
    </>
  );
}
