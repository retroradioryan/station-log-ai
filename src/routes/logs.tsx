import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/Chrome";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Download, Copy, FileDown, Mail, Search, Filter, FileText, Loader2 } from "lucide-react";
import { SEGMENT_COLOR, SEGMENT_LABEL, fmtTime, fmtDate, today } from "@/lib/log-format";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/logs")({ component: Logs });

function Logs() {
  const [date, setDate] = useState(today());
  const [q, setQ] = useState("");
  const { data: segments = [] } = useQuery({
    queryKey: ["segments", date],
    queryFn: async () =>
      (await supabase
        .from("segments")
        .select("*, stations(name,color)")
        .eq("segment_date", date)
        .order("segment_time")).data ?? [],
  });

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    if (!term) return segments;
    return segments.filter((s: any) =>
      [s.title, s.summary, ...(s.people || []), ...(s.topics || [])]
        .filter(Boolean).join(" ").toLowerCase().includes(term)
    );
  }, [segments, q]);

  const byStation = useMemo(() => {
    const m = new Map<string, { station: any; items: any[] }>();
    filtered.forEach((s: any) => {
      const key = s.station_id;
      if (!m.has(key)) m.set(key, { station: s.stations, items: [] });
      m.get(key)!.items.push(s);
    });
    return [...m.values()].sort((a, b) => a.station.name.localeCompare(b.station.name));
  }, [filtered]);

  const exportTxt = () => {
    const text = byStation
      .map(({ station, items }) =>
        `${station.name.toUpperCase()}\n\n` +
        items.map((i: any) => `${fmtTime(i.segment_time)}  ${SEGMENT_LABEL[i.segment_type]} — ${i.title}${i.summary ? `\n        ${i.summary}` : ""}`).join("\n") + "\n"
      ).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `station-log-${date}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const rows = [["station","time","type","title","summary","people","topics","confidence"]];
    filtered.forEach((s: any) => rows.push([
      s.stations?.name, fmtTime(s.segment_time), s.segment_type, s.title,
      s.summary || "", (s.people||[]).join("|"), (s.topics||[]).join("|"), s.confidence ?? "",
    ]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `station-log-${date}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const copyAll = async () => {
    const text = byStation
      .map(({ station, items }) =>
        `${station.name}\n` + items.map((i: any) => `${fmtTime(i.segment_time)}  ${i.title}`).join("\n")
      ).join("\n\n");
    await navigator.clipboard.writeText(text);
    toast.success("Log copied");
  };

  return (
    <>
      <PageHeader
        title="Daily Logs"
        description={fmtDate(date)}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={copyAll}><Copy className="size-4" /> Copy</Button>
            <Button variant="outline" size="sm" onClick={exportCsv}><FileDown className="size-4" /> CSV</Button>
            <Button variant="outline" size="sm" onClick={exportTxt}><Download className="size-4" /> TXT</Button>
            <Button size="sm"><Mail className="size-4" /> Email digest</Button>
          </>
        }
      />
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-2 sticky top-[88px] z-10 bg-background/80 backdrop-blur py-2 -mx-2 px-2 rounded-md">
          <div className="relative flex-1 max-w-md">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, topic, person…" className="pl-9" />
          </div>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
          <Button variant="outline" size="sm"><Filter className="size-4" /> Filters</Button>
        </div>

        <div className="space-y-8">
          {byStation.map(({ station, items }) => (
            <section key={station?.name}>
              <div className="flex items-center gap-3 mb-3">
                <span className="size-2 rounded-full" style={{ background: station?.color }} />
                <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{station?.name}</h2>
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground tabular-nums">{items.length} segments</span>
              </div>
              <Card>
                <CardContent className="p-0 divide-y divide-border/60">
                  {items.map((s: any) => (
                    <div key={s.id} className="grid grid-cols-[80px_120px_1fr_80px] gap-4 px-5 py-3 hover:bg-accent/40 transition-colors">
                      <div className="text-sm tabular-nums text-foreground/90">{fmtTime(s.segment_time)}</div>
                      <Badge variant="outline" className={`${SEGMENT_COLOR[s.segment_type]} text-[10px] w-fit`}>{SEGMENT_LABEL[s.segment_type]}</Badge>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{s.title}</div>
                        {s.summary && <div className="text-xs text-muted-foreground truncate">{s.summary}</div>}
                        {(s.people?.length || s.topics?.length) ? (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {(s.people || []).slice(0, 3).map((p: string) => <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>)}
                            {(s.topics || []).slice(0, 3).map((t: string) => <Badge key={t} variant="outline" className="text-[10px] capitalize">{t}</Badge>)}
                          </div>
                        ) : null}
                      </div>
                      <div className="text-right text-xs text-muted-foreground tabular-nums">
                        {s.confidence ? `${Math.round(s.confidence * 100)}%` : "—"}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          ))}
          {byStation.length === 0 && (
            <div className="text-center text-muted-foreground py-16">No segments for this date.</div>
          )}
        </div>
      </div>
    </>
  );
}
