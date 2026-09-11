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

/**
 * The agent app shell: a left nav rail, always visible.
 *
 * Desktop only, deliberately (see CLAUDE.md). The agent is selling at an open
 * home, not doing data entry, so there are no phone layouts here. Below about
 * 960px the page scrolls horizontally rather than reflowing.
 *
 * The active item is marked by weight, colour and a filled background — never
 * colour alone — and carries aria-current so it is announced to screen readers.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-full min-w-[960px]">
      <nav
        aria-label="Main"
        className="flex w-56 shrink-0 flex-col border-r border-rule bg-surface"
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

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
