/**
 * Inline icons.
 *
 * Kept as plain SVG rather than an icon library: there are only a handful,
 * and the brief locks the dependency list. All of them inherit `currentColor`
 * so they take the colour of the text they sit beside.
 *
 * Icons here are always paired with a word — colour and shape never carry
 * meaning on their own (section 10).
 */

type IconProps = {
  className?: string;
};

const base = "h-5 w-5 shrink-0";

export function TodayIcon({ className = base }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2.75" y="4.25" width="14.5" height="13" rx="2" />
      <path d="M2.75 8.25h14.5M6.75 2.75v3M13.25 2.75v3" />
    </svg>
  );
}

export function BuyersIcon({ className = base }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="7.75" cy="7" r="2.75" />
      <path d="M2.5 16.25c0-2.9 2.35-4.5 5.25-4.5s5.25 1.6 5.25 4.5" />
      <path d="M13.5 4.6a2.75 2.75 0 0 1 0 5.3M15 11.9c1.65.42 2.75 1.7 2.75 3.6" />
    </svg>
  );
}

export function PipelineIcon({ className = base }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2.5" y="3.5" width="4" height="13" rx="1.25" />
      <rect x="8" y="3.5" width="4" height="9" rx="1.25" />
      <rect x="13.5" y="3.5" width="4" height="6" rx="1.25" />
    </svg>
  );
}

export function PropertiesIcon({ className = base }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.75 8.5 10 3l7.25 5.5" />
      <path d="M4.5 9.75v6.75h11V9.75" />
      <path d="M8.25 16.5v-4h3.5v4" />
    </svg>
  );
}

/** Used on the "Check in" flag. */
export function FlagIcon({ className = "h-3.5 w-3.5 shrink-0" }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 14.5V2.5" />
      <path d="M4 3.25h7.5l-1.5 2.5 1.5 2.5H4" />
    </svg>
  );
}
