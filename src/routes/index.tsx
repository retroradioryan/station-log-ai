import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Waveform } from "@/components/layout/Chrome";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Radio, Sparkles, Clock, TrendingUp, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SEGMENT_COLOR, SEGMENT_LABEL, fmtTime, today } from "@/lib/log-format";

export const Route = createFileRoute("/")({ component: Dashboard });

function Stat({ label, value, sub, icon: Icon, accent }: { label: string; value: string | number; sub?: string; icon: any; accent?: string }) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-px ${accent || "bg-primary/40"}`} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
            <div className="text-3xl font-semibold mt-2 tabular-nums">{value}</div>
            {sub ? <div className="text-xs text-muted-foreground mt-1">{sub}</div> : null}
          </div>
          <Icon className="size-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { data: stations = [] } = useQuery({
    queryKey: ["stations"],
    queryFn: async () => (await supabase.from("stations").select("*").order("name")).data ?? [],
  });
  const { data: segments = [] } = useQuery({
    queryKey: ["segments", today()],
    queryFn: async () =>
      (await supabase
        .from("segments")
        .select("*, stations(name,color)")
        .eq("segment_date", today())
        .order("segment_time")).data ?? [],
  });

  const activeStations = stations.filter((s: any) => s.active).length;
  const hoursProcessed = (segments.length * 5) / 60;
  const topicCounts = new Map<string, number>();
  const peopleCounts = new Map<string, number>();
  segments.forEach((s: any) => {
    (s.topics || []).forEach((t: string) => topicCounts.set(t, (topicCounts.get(t) || 0) + 1));
    (s.people || []).forEach((p: string) => peopleCounts.set(p, (peopleCounts.get(p) || 0) + 1));
  });
  const trending = [...topicCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const people = [...peopleCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Live newsroom intelligence across your monitored stations."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/logs"><FileText className="size-4" /> Daily Logs</Link>
            </Button>
            <Button size="sm"><Download className="size-4" /> Export</Button>
          </>
        }
      />
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Active stations" value={activeStations} sub={`${stations.length} configured`} icon={Radio} />
          <Stat label="Hours processed today" value={hoursProcessed.toFixed(1)} sub="rolling 24h" icon={Clock} accent="bg-chart-2/50" />
          <Stat label="Segments detected" value={segments.length} sub="across all stations" icon={Sparkles} accent="bg-chart-3/50" />
          <Stat label="Trending topics" value={trending.length} sub="last monitored window" icon={TrendingUp} accent="bg-chart-4/50" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent activity</CardTitle>
              <Waveform bars={28} className="h-6" />
            </CardHeader>
            <CardContent className="space-y-2">
              {segments.slice(0, 8).map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className="text-xs tabular-nums text-muted-foreground w-14">{fmtTime(s.segment_time)}</div>
                  <span className="size-1.5 rounded-full" style={{ background: s.stations?.color || "#888" }} />
                  <div className="text-xs text-muted-foreground w-28 truncate">{s.stations?.name}</div>
                  <Badge variant="outline" className={`${SEGMENT_COLOR[s.segment_type]} text-[10px]`}>{SEGMENT_LABEL[s.segment_type]}</Badge>
                  <div className="flex-1 text-sm truncate">{s.title}</div>
                </div>
              ))}
              {segments.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">No segments yet today.</div>}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="size-4" /> Trending topics</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {trending.map(([t, n]) => (
                  <Badge key={t} variant="secondary" className="capitalize">{t} <span className="ml-1.5 text-muted-foreground tabular-nums">{n}</span></Badge>
                ))}
                {trending.length === 0 && <div className="text-xs text-muted-foreground">No topics yet.</div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="size-4" /> Most discussed</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {people.map(([p, n]) => (
                  <div key={p} className="flex items-center justify-between text-sm">
                    <span>{p}</span><span className="text-muted-foreground tabular-nums">{n}</span>
                  </div>
                ))}
                {people.length === 0 && <div className="text-xs text-muted-foreground">No mentions yet.</div>}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
