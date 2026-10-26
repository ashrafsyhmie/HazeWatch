"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/stations", label: "Stations" },
  { href: "/history", label: "Monthly data" },
  { href: "/methodology", label: "Our method" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="joy-site-header">
      <div className="joy-bar">
        <Link href="/" className="joy-brand">
          <span className="joy-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="7" fill="#f2b64c" />
              <g stroke="#f2b64c" strokeWidth="2.4" strokeLinecap="round">
                <path d="M16 3v3M16 26v3M3 16h3M26 16h3M6.8 6.8l2 2M23.2 23.2l2 2M25.2 6.8l-2 2M8.8 23.2l-2 2" />
              </g>
            </svg>
          </span>
          <span>HazeWatch<small>A clearer sky for everyone</small></span>
        </Link>
        <nav aria-label="Main">
          {pathname === "/" ? <a href="#your-station" className="joy-active">Your station</a> : null}
          {NAV.filter((item) => pathname !== "/" || item.href !== "/").map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href || (item.href === "/stations" && pathname.startsWith("/stations/")) ? "page" : undefined}
              className={pathname === item.href || (item.href === "/stations" && pathname.startsWith("/stations/")) ? "joy-active" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
