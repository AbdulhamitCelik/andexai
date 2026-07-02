import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandSize = "sm" | "md" | "lg";

interface AndexBrandProps {
  /** Collapsed sidebar — show icon mark only. */
  iconOnly?: boolean;
  className?: string;
  href?: string;
  priority?: boolean;
  size?: BrandSize;
  layout?: "horizontal" | "stacked";
  /** Append "AI" after ANDEX. */
  showAi?: boolean;
  tagline?: string;
}

const markSizes: Record<BrandSize, string> = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-[4.5rem] w-[4.5rem] md:h-20 md:w-20",
};

const wordmarkSizes: Record<BrandSize, string> = {
  sm: "text-base tracking-[0.14em]",
  md: "text-xl tracking-[0.16em]",
  lg: "text-3xl md:text-4xl tracking-[0.2em]",
};

const aiSizes: Record<BrandSize, string> = {
  sm: "text-sm tracking-[0.06em]",
  md: "text-base tracking-[0.08em]",
  lg: "text-xl md:text-2xl tracking-[0.1em]",
};

export function AndexMark({
  size = "md",
  className,
  priority = false,
}: {
  size?: BrandSize;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5 dark:ring-white/10",
        markSizes[size],
        className
      )}
    >
      <Image
        src="/andex-logo.png"
        alt=""
        width={112}
        height={224}
        className="absolute left-1/2 top-0 h-[220%] w-auto max-w-none -translate-x-1/2 object-cover object-top"
        priority={priority}
      />
    </div>
  );
}

export function AndexWordmark({
  size = "md",
  showAi = false,
  className,
  inverted = false,
}: {
  size?: BrandSize;
  showAi?: boolean;
  className?: string;
  /** Light text for splash / dark backgrounds. */
  inverted?: boolean;
}) {
  const base = inverted ? "text-white" : "text-foreground";
  const ai = inverted ? "text-white/70" : "text-muted-foreground";

  return (
    <span className={cn("inline-flex items-baseline font-bold leading-none", className)}>
      <span className={cn(wordmarkSizes[size], base)}>
        <span>ANDE</span>
        <span className="text-[#2970FF]">X</span>
      </span>
      {showAi && (
        <span className={cn("ml-1.5 font-semibold", aiSizes[size], ai)}>AI</span>
      )}
    </span>
  );
}

export function AndexBrand({
  iconOnly = false,
  className,
  href,
  priority = false,
  size = "md",
  layout = "horizontal",
  showAi = true,
  tagline,
}: AndexBrandProps) {
  const mark = <AndexMark size={size} priority={priority} />;

  if (iconOnly) {
    const content = href ? (
      <Link href={href} className="inline-flex shrink-0" title="Andex AI">
        {mark}
      </Link>
    ) : (
      mark
    );
    return content;
  }

  const wordmark = <AndexWordmark size={size} showAi={showAi} />;

  const inner =
    layout === "stacked" ? (
      <div className={cn("flex flex-col items-center gap-3 text-center", className)}>
        {mark}
        {wordmark}
        {tagline && (
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{tagline}</p>
        )}
      </div>
    ) : (
      <div className={cn("flex items-center gap-3", className)}>
        {mark}
        <div className="min-w-0">
          {wordmark}
          {tagline && (
            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground tracking-wide">
              {tagline}
            </p>
          )}
        </div>
      </div>
    );

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0 transition-opacity hover:opacity-90">
        {inner}
      </Link>
    );
  }

  return inner;
}

/** @deprecated Use AndexBrand */
export const AndexLogo = AndexBrand;
