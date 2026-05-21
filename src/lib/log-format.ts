import { format } from "date-fns";

export const fmtTime = (t: string) => t.slice(0, 5);
export const fmtDate = (d: string | Date) => format(typeof d === "string" ? new Date(d) : d, "EEE, dd MMM yyyy");
export const today = () => new Date().toISOString().slice(0, 10);

export const SEGMENT_LABEL: Record<string, string> = {
  news: "News",
  interview: "Interview",
  music: "Music",
  ad: "Ad break",
  sports: "Sports",
  weather: "Weather",
  travel: "Travel",
  listener_call: "Listener call",
  political: "Political",
  entertainment: "Entertainment",
  discussion: "Discussion",
  other: "Other",
};

export const SEGMENT_COLOR: Record<string, string> = {
  news: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  interview: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  music: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  ad: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  sports: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  weather: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  travel: "bg-teal-500/15 text-teal-300 border-teal-500/30",
  listener_call: "bg-pink-500/15 text-pink-300 border-pink-500/30",
  political: "bg-red-500/15 text-red-300 border-red-500/30",
  entertainment: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
  discussion: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  other: "bg-muted text-muted-foreground border-border",
};
