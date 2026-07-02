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
  /** Append "AI" after the logo wordmark. */
  showAi?: boolean;
  tagline?: string;
}

/** Full logo image height (icon + ANDEX from asset). */
const logoHeights: Record<BrandSize, string> = {
  sm: "h-7",
  md: "h-9",
  lg: "h-14 md:h-16",
};

const aiText: Record<BrandSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-lg md:text-xl",
};

const markSizes: Record<BrandSize, string> = {
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

/** Cropped icon mark for collapsed sidebar. */
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
    <div className={cn("relative shrink-0 overflow-hidden rounded-md", markSizes[size], className)}>
      <Image
        src="/andex-logo.png"
        alt="Andex"
        width={96}
        height={192}
        className="absolute left-1/2 top-0 h-[185%] w-auto max-w-none -translate-x-1/2 object-cover object-top"
        priority={priority}
      />
    </div>
  );
}

/** Full logo asset (icon + ANDEX) with optional AI suffix. */
export function AndexLogoImage({
  size = "md",
  showAi = false,
  className,
  priority = false,
}: {
  size?: BrandSize;
  showAi?: boolean;
  className?: string;
  priority?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-end gap-1", className)}>
      <Image
        src="/andex-logo.png"
        alt="Andex"
        width={240}
        height={120}
        className={cn("w-auto shrink-0 object-contain", logoHeights[size])}
        priority={priority}
      />
      {showAi && (
        <span className={cn("pb-px font-bold leading-none text-[#2970FF]", aiText[size])}>AI</span>
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
  if (iconOnly) {
    const mark = <AndexMark size={size} priority={priority} />;
    if (href) {
      return (
        <Link href={href} className="inline-flex shrink-0" title="Andex AI">
          {mark}
        </Link>
      );
    }
    return mark;
  }

  const logo = <AndexLogoImage size={size} showAi={showAi} priority={priority} />;

  const inner =
    layout === "stacked" ? (
      <div className={cn("flex flex-col items-center gap-2 text-center", className)}>
        {logo}
        {tagline && (
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{tagline}</p>
        )}
      </div>
    ) : (
      <div className={cn("inline-flex flex-col", className)}>
        {logo}
        {tagline && (
          <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground tracking-wide">
            {tagline}
          </p>
        )}
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
