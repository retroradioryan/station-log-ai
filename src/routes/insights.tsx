import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/Chrome";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Radio, AlertCircle } from "lucide-react";
import { today } from "@/lib/log-format";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/insights")({ component: Insights });

function Insights() {
  const { data: segments = [] } = useQuery({
    queryKey: ["segments", today()],
    queryFn: async () =>
      (await supabase.from("segments").select("*, stations(name,color)").eq("segment_date", today())).data ?? [],
  });
  const [aiSummary, setAiSummary] = useState<string>("");

  const topicByStation = useMemo(() => {
    const map = new Map<string, Map<string, number>>(); // topic -> station -> count
    segments.forEach((s: any) => {
      (s.topics || []).forEach((t: string) => {
        if (!map.has(t)) map.set(t, new Map());
        const sn = s.stations?.name || "Unknown";
        map.get(t)!.set(sn, (map.get(t)!.get(sn) || 0) + 1);
      });
    });
    return [...map.entries()]
      .map(([topic, m]) => ({ topic, total: [...m.values()].reduce((a, b) => a + b, 0), stations: [...m.keys()] }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [segments]);

  const stationVolume = useMemo(() => {
    const m = new Map<string, number>();
    segments.forEach((s: any) => {
      const n = s.stations?.name || "Unknown";
      m.set(n, (m.get(n) || 0) + 1);
    });
    return [...m.entries()].map(([name, count]) => ({ name, count }));
  }, [segments]);

  const overlapStories = topicByStation.filter((t) => t.stations.length >= 2);

  const generate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-daily-report", {
        body: { date: today() },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => { setAiSummary(d?.summary || ""); toast.success("AI summary generated"); },
    onError: (e: any) => toast.error(e.message || "AI generation failed"),
  });

  return (
    <>
      <PageHeader
        title="AI Insights"
        description="Cross-station comparison, trends and breaking story detection."
        actions={
          <Button size="sm" onClick={() => generate.mutate()} disabled={generate.isPending}>
            <Sparkles className="size-4" /> {generate.isPending ? "Generating…" : "Generate AI summary"}
          </Button>
        }
      />
      <div className="p-8 space-y-6">
        {aiSummary && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="size-4 text-primary" /> Today's AI briefing</CardTitle></CardHeader>
            <CardContent><p className="text-sm leading-relaxed whitespace-pre-wrap">{aiSummary}</p></CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="size-4" /> Most discussed topics</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {topicByStation.map(({ topic, total, stations }) => (
                <div key={topic} className="flex items-center gap-3">
                  <div className="text-sm capitalize w-32 truncate">{topic}</div>
                  <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(total / topicByStation[0].total) * 100}%` }} />
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums w-12 text-right">{total}</div>
                  <div className="text-[10px] text-muted-foreground w-24 text-right truncate">{stations.length} station{stations.length>1?"s":""}</div>
                </div>
              ))}
              {topicByStation.length === 0 && <div className="text-sm text-muted-foreground">No topic data yet.</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Radio className="size-4" /> Station coverage volume</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stationVolume}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                  <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Bar dataKey="count" fill="var(--primary)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertCircle className="size-4 text-destructive" /> Breaking story detection</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {overlapStories.map((o) => (
              <div key={o.topic} className="flex items-center justify-between p-3 rounded-md border border-border/60 bg-muted/30">
                <div>
                  <div className="text-sm font-medium capitalize">{o.topic}</div>
                  <div className="text-xs text-muted-foreground">Covered by {o.stations.join(", ")}</div>
                </div>
                <Badge variant="outline" className="border-destructive/40 text-destructive">{o.total} mentions</Badge>
              </div>
            ))}
            {overlapStories.length === 0 && <div className="text-sm text-muted-foreground">No cross-station overlap detected today.</div>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
