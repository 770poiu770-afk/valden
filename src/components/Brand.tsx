import Link from "next/link";

/** Valden mark: three offset freight units on a pallet line — stacked distribution volume. */
export function Mark({ size = 28, inverted = false }: { size?: number; inverted?: boolean }) {
  const a = inverted ? "#FFFFFF" : "#13335E";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="3" y="18" width="12" height="9" fill={a} />
      <rect x="17" y="18" width="12" height="9" fill={a} />
      <rect x="10" y="7" width="12" height="9" fill="#F2C230" />
      <rect x="2" y="28.5" width="28" height="2" fill={a} />
    </svg>
  );
}

export function Logo({ inverted = false, href = "/" }: { inverted?: boolean; href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="Valden — home">
      <Mark inverted={inverted} />
      <span className={`max-[359px]:sr-only text-[16px] sm:text-[19px] leading-none ${inverted ? "text-white" : "text-deep"}`} style={{ fontStretch: "125%", fontWeight: 800, letterSpacing: "0.04em" }}>
        VALDEN
      </span>
    </Link>
  );
}
