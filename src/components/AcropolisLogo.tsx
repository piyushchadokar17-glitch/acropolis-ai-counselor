import logo from "@/assets/acropolis-logo.png";
import { cn } from "@/lib/utils";

type Variant = "full" | "mark" | "lockup";

/**
 * Official Acropolis brand mark.
 * - `full`    : official logo on a soft white plate (preserves aspect ratio)
 * - `mark`    : compact pill, logo only — for tight spaces
 * - `lockup`  : official logo + subtle "CollegeGPT" sub-brand divider
 */
export function AcropolisLogo({
  className,
  variant = "lockup",
  size = "md",
}: {
  className?: string;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
}) {
  const heights = { sm: "h-7", md: "h-9", lg: "h-12" } as const;
  const padY = { sm: "py-1", md: "py-1.5", lg: "py-2" } as const;
  const padX = { sm: "px-2", md: "px-2.5", lg: "px-3" } as const;

  const plate = (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-xl bg-white/95 ring-1 ring-white/30 shadow-[0_4px_24px_-8px_oklch(0.62_0.22_285/0.55)]",
        padX[size],
        padY[size],
      )}
    >
      <img
        src={logo}
        alt="Acropolis Institute of Technology & Research"
        className={cn("w-auto select-none object-contain", heights[size])}
        draggable={false}
      />
    </div>
  );

  if (variant === "mark" || variant === "full") {
    return <div className={cn("flex items-center", className)}>{plate}</div>;
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {plate}
      <div className="hidden h-8 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent sm:block" />
      <div className="hidden flex-col leading-tight sm:flex">
        <span className="font-display text-sm font-semibold tracking-tight text-foreground">
          CollegeGPT
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          AI Admission Counselor
        </span>
      </div>
    </div>
  );
}
