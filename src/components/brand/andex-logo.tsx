import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AndexLogoProps {
  /** Collapsed sidebar — show icon mark only. */
  iconOnly?: boolean;
  className?: string;
  imageClassName?: string;
  href?: string;
  priority?: boolean;
  /** Larger variant for splash / marketing. */
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { full: "h-12 w-auto max-w-[140px]", icon: "h-9 w-9" },
  md: { full: "h-16 w-auto max-w-[180px]", icon: "h-10 w-10" },
  lg: { full: "h-24 md:h-28 w-auto max-w-[280px]", icon: "h-14 w-14" },
};

export function AndexLogo({
  iconOnly = false,
  className,
  imageClassName,
  href,
  priority = false,
  size = "md",
}: AndexLogoProps) {
  const s = sizes[size];

  const content = iconOnly ? (
    <div className={cn("relative overflow-hidden rounded-md bg-white", s.icon, className)}>
      <Image
        src="/andex-logo.png"
        alt="Andex"
        width={80}
        height={160}
        className={cn("absolute left-1/2 top-0 h-[200%] w-auto max-w-none -translate-x-1/2 object-cover object-top", imageClassName)}
        priority={priority}
      />
    </div>
  ) : (
    <Image
      src="/andex-logo.png"
      alt="Andex"
      width={280}
      height={140}
      className={cn("object-contain", s.full, className, imageClassName)}
      priority={priority}
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0">
        {content}
      </Link>
    );
  }

  return content;
}
