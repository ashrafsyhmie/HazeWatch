"use client";

import { useState } from "react";
import { categoryStyle } from "@/lib/categories";
import { AUDIENCES, guidanceFor, type AudienceKey } from "@/lib/guidance";
import type { CategoryKey } from "@/lib/types";

export function HealthGuidance({ category }: { category: CategoryKey }) {
  const [audience, setAudience] = useState<AudienceKey>("everyone");
  const style = categoryStyle(category);
  const guidance = guidanceFor(category, audience);
  const selected = AUDIENCES.find((item) => item.key === audience);

  return (
    <section className="panel flex h-full flex-col p-5 sm:p-6" aria-labelledby="guidance-title">
      <p className="text-[11px] font-medium text-muted">Health guidance</p>
      <h2 id="guidance-title" className="mt-1.5 text-[15px] font-medium text-fog">
        What to do at this reading
      </h2>

      <div role="radiogroup" aria-label="Who is this guidance for" className="mt-4 flex flex-wrap gap-2">
        {AUDIENCES.map((item) => {
          const active = item.key === audience;
          return (
            <button
              key={item.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setAudience(item.key)}
              className={`min-h-11 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                active
                  ? "border-signal/35 bg-signal/10 text-signal"
                  : "border-line bg-surface text-muted hover:border-signal/30 hover:text-signal"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {selected ? <p className="mt-2 text-[11px] text-muted">{selected.hint}</p> : null}

      {guidance ? (
        <div className="mt-4 rounded-xl border border-line/70 bg-ink/40 px-4 py-3.5" aria-live="polite">
          <p className="flex items-center gap-2 text-[11px] font-medium text-muted">
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: style.hex }}
            />
            {style.label} band
          </p>
          <p className="mt-2 text-[13.5px] font-medium leading-snug text-fog">{guidance.headline}</p>
          <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-fog/75">
            {guidance.actions.map((action) => (
              <li key={action} className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-signal/70"
                />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-line/70 bg-ink/40 px-4 py-3.5 text-[12px] leading-relaxed text-muted">
          This station has no current reading, so there is nothing to base guidance on. Check a
          nearby station or the official DOE portal.
        </p>
      )}

      <p className="mt-auto pt-4 text-[11px] leading-relaxed text-muted">
        General precautions for each official API band. This is not medical advice. Follow DOE,
        MOH and local authority advisories, and see a doctor if you feel unwell.
      </p>
    </section>
  );
}
