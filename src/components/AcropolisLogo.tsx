import logo from "@/assets/acropolis-logo.png";
import { cn } from "@/lib/utils";

export function AcropolisLogo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative grid place-items-center rounded-lg bg-white p-1 ring-1 ring-white/20 shadow-md">
        <img
          src={logo}
          alt="Acropolis Institute"
          className="h-7 w-7 object-contain"
          width={28}
          height={28}
        />
      </div>
      {showWordmark && (
        <div className="flex flex-col leading-tight">
          <span className="font-display text-base font-bold tracking-tight">
            CollegeGPT
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Acropolis · AI Counselor
          </span>
        </div>
      )}
    </div>
  );
}
