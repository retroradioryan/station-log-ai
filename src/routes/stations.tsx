import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/Chrome";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Radio, Trash2, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/stations")({ component: Stations });

const stationSchema = z.object({
  name: z.string().trim().min(1).max(80),
  stream_url: z.string().trim().url().max(500),
  country: z.string().trim().max(60).optional(),
  genre: z.string().trim().max(60).optional(),
  monitoring_start: z.string(),
  monitoring_end: z.string(),
  color: z.string().optional(),
});

function StationDialog({ station, onClose }: { station?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: station?.name ?? "",
    stream_url: station?.stream_url ?? "",
    country: station?.country ?? "Ireland",
    genre: station?.genre ?? "",
    monitoring_start: station?.monitoring_start?.slice(0, 5) ?? "16:00",
    monitoring_end: station?.monitoring_end?.slice(0, 5) ?? "18:00",
    color: station?.color ?? "#f59e0b",
    tags: station?.tags?.join(", ") ?? "",
  });
  const save = useMutation({
    mutationFn: async () => {
      const parsed = stationSchema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.errors[0].message);
      const payload = { ...parsed.data, tags: form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) };
      if (station) {
        const { error } = await supabase.from("stations").update(payload).eq("id", station.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("stations").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stations"] });
      toast.success(station ? "Station updated" : "Station added");
      onClose();
    },
    onError: (e: any) => toast.error(e.message || "Failed to save"),
  });

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{station ? "Edit station" : "Add station"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Country</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
        </div>
        <div><Label>Stream URL</Label><Input value={form.stream_url} onChange={(e) => setForm({ ...form, stream_url: e.target.value })} placeholder="https://..." /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Genre</Label><Input value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} /></div>
          <div><Label>Tags (comma sep.)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Start</Label><Input type="time" value={form.monitoring_start} onChange={(e) => setForm({ ...form, monitoring_start: e.target.value })} /></div>
          <div><Label>End</Label><Input type="time" value={form.monitoring_end} onChange={(e) => setForm({ ...form, monitoring_end: e.target.value })} /></div>
          <div><Label>Color</Label><Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-9 p-1" /></div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save station"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Stations() {
  const qc = useQueryClient();
  const { data: stations = [] } = useQuery({
    queryKey: ["stations"],
    queryFn: async () => (await supabase.from("stations").select("*").order("name")).data ?? [],
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const toggle = async (s: any) => {
    await supabase.from("stations").update({ active: !s.active }).eq("id", s.id);
    qc.invalidateQueries({ queryKey: ["stations"] });
  };
  const remove = async (s: any) => {
    if (!confirm(`Remove ${s.name}?`)) return;
    await supabase.from("stations").delete().eq("id", s.id);
    qc.invalidateQueries({ queryKey: ["stations"] });
    toast.success("Removed");
  };

  return (
    <>
      <PageHeader
        title="Stations"
        description={`${stations.length} configured · ${stations.filter((s: any) => s.active).length} active`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="size-4" /> Add station</Button></DialogTrigger>
            <StationDialog onClose={() => setOpen(false)} />
          </Dialog>
        }
      />
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {stations.map((s: any) => (
            <Card key={s.id} className="relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: s.color || "var(--primary)" }} />
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-md grid place-items-center" style={{ background: `${s.color || "#f59e0b"}22`, color: s.color || "#f59e0b" }}>
                      <Radio className="size-5" />
                    </div>
                    <div>
                      <div className="font-semibold leading-tight">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.country} · {s.genre || "—"}</div>
                    </div>
                  </div>
                  <Switch checked={s.active} onCheckedChange={() => toggle(s)} />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant={s.active ? "default" : "secondary"} className="gap-1">
                    <span className={`size-1.5 rounded-full ${s.active ? "bg-emerald-400 live-dot" : "bg-zinc-500"}`} />
                    {s.active ? "Monitoring" : "Paused"}
                  </Badge>
                  <Badge variant="outline">{s.monitoring_start?.slice(0,5)}–{s.monitoring_end?.slice(0,5)}</Badge>
                </div>
                <div className="text-xs text-muted-foreground truncate font-mono">{s.stream_url}</div>
                <div className="flex flex-wrap gap-1">
                  {(s.tags || []).map((t: string) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                </div>
                <div className="flex gap-2 pt-2 border-t border-border/50">
                  <Dialog open={editing?.id === s.id} onOpenChange={(o) => setEditing(o ? s : null)}>
                    <DialogTrigger asChild><Button variant="ghost" size="sm"><Pencil className="size-3.5" /> Edit</Button></DialogTrigger>
                    {editing?.id === s.id && <StationDialog station={s} onClose={() => setEditing(null)} />}
                  </Dialog>
                  <Button variant="ghost" size="sm" className="text-destructive ml-auto" onClick={() => remove(s)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {stations.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-16">No stations yet. Add one to start monitoring.</div>
          )}
        </div>
      </div>
    </>
  );
}
