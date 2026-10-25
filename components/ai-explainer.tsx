"use client";

import { useState } from "react";
import type { Explanation } from "@/lib/explain";

export function AiExplainer({
  scope,
  stationId,
  initial,
  aiEnabled,
}: {
  scope: "station" | "national";
  stationId?: string;
  initial: Explanation;
  aiEnabled: boolean;
}) {
  const [explanation, setExplanation] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rewrite() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scope, stationId }),
      });
      const payload = (await response.json()) as {
        explanation?: Explanation;
        error?: string;
      };
      if (!response.ok || !payload.explanation) {
        throw new Error(payload.error ?? "Explanation is unavailable right now.");
      }
      setExplanation(payload.explanation);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Explanation is unavailable right now.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel flex flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium text-muted">
            HazeWatch insight
          </p>
          <h2 className="mt-1.5 text-[15px] font-medium text-fog">
            Plain-language briefing
          </h2>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
            explanation.source === "gemini"
              ? "border-signal/30 bg-signal/10 text-signal"
              : "border-line bg-white/[0.03] text-muted"
          }`}
        >
          {explanation.source === "gemini" ? "Gemini rewrite" : "Rule-based"}
        </span>
      </div>

      <div aria-live="polite" className="mt-4">
        <p className="text-[16px] font-medium leading-snug tracking-[-0.01em] text-fog">
          {explanation.headline}
        </p>
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-fog/75">
          {explanation.summary}
        </p>

        <div className="mt-4 rounded-xl border border-line/70 bg-ink/40 px-3.5 py-3">
          <p className="text-[11px] font-medium text-muted">
            How to read the change
          </p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-fog/70">
            {explanation.trendNote}
          </p>
        </div>

        <ul className="mt-4 space-y-1.5">
          {explanation.precautions.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-[11.5px] leading-relaxed text-fog/65"
            >
              <span
                aria-hidden="true"
                className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-signal/70"
              />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-3.5">
          <p className="max-w-[340px] text-[11px] leading-relaxed text-muted">
            {explanation.note ??
              "Generated from verified observations only. Not an official forecast or warning."}
          </p>
          {aiEnabled ? (
            <button
              type="button"
              onClick={rewrite}
              disabled={busy}
              aria-busy={busy}
              className="shrink-0 rounded-full border border-signal/30 bg-signal/[0.08] px-3 py-1.5 text-[11px] font-medium text-signal transition-colors hover:bg-signal/[0.14] disabled:cursor-wait disabled:opacity-60"
            >
              {busy
                ? "Rewriting…"
                : explanation.source === "gemini"
                  ? "Rewrite again"
                  : "Rewrite with Gemini"}
            </button>
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="mt-2 text-[11px] text-unhealthy">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
