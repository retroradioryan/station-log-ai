import { cn } from "@/lib/utils";

export function Waveform({ bars = 32, className, active = true }: { bars?: number; className?: string; active?: boolean }) {
  return (
    <div className={cn("flex items-center gap-[2px] h-8", className)}>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "w-[2px] rounded-full bg-primary/70",
            active && "wave-bar"
          )}
          style={{
            height: `${20 + ((i * 37) % 80)}%`,
            animationDelay: `${(i % 8) * 0.08}s`,
          }}
        />
      ))}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-20">
      <div className="px-8 py-5 flex items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground mb-1">
            Station Log
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground mt-1">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
