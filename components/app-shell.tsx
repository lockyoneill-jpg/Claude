"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  BuyersIcon,
  PipelineIcon,
  PropertiesIcon,
  TodayIcon,
} from "@/components/icons";

const NAV = [
  { href: "/today", label: "Today", Icon: TodayIcon },
  { href: "/buyers", label: "Buyers", Icon: BuyersIcon },
  { href: "/pipeline", label: "Pipeline", Icon: PipelineIcon },
  { href: "/properties", label: "Properties", Icon: PropertiesIcon },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Left nav rail on desktop, bottom bar on mobile (section 10).
 *
 * The active item is marked by weight, colour and a rule — never colour
 * alone — and carries aria-current so it is announced to screen readers.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const isActive = useIsActive();

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      {/* Desktop: left rail */}
      <nav
        aria-label="Main"
        className="hidden border-r border-rule bg-surface md:flex md:w-56 md:shrink-0 md:flex-col"
      >
        <div className="border-b border-rule px-5 py-5">
          <span className="text-base font-semibold text-ink">Buyer Hub</span>
          <span className="mt-0.5 block text-sm text-muted">
            Barwon Coast Property
          </span>
        </div>

        <ul className="flex flex-col gap-0.5 p-3">
          {NAV.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "flex items-center gap-3 rounded-md px-3 py-2 text-base transition-colors",
                    active
                      ? "bg-gum-tint font-semibold text-gum"
                      : "text-ink hover:bg-paper",
                  ].join(" ")}
                >
                  <Icon />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Mobile: title bar */}
      <div className="flex items-center justify-between border-b border-rule bg-surface px-4 py-3 md:hidden">
        <span className="text-base font-semibold text-ink">Buyer Hub</span>
        <span className="text-sm text-muted">Barwon Coast Property</span>
      </div>

      {/* Extra bottom padding on mobile so the bottom bar never covers content */}
      <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>

      {/* Mobile: bottom bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-rule bg-surface md:hidden"
      >
        {NAV.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={[
                "flex flex-col items-center gap-1 px-1 py-2.5 text-sm",
                active ? "font-semibold text-gum" : "text-muted",
              ].join(" ")}
            >
              <Icon />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
