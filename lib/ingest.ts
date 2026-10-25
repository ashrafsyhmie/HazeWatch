import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchApimsBundle } from "@/lib/apims";
import { fetchForecastStatus } from "@/lib/mycmaq";
import { fetchMonthlyPollution } from "@/lib/opendosm";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { IngestResult, IngestSourceResult } from "@/lib/types";

const CHUNK = 400;

function chunks<T>(items: T[], size = CHUNK): T[][] {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

async function logRun(
  supabase: SupabaseClient,
  sourceId: string,
  work: () => Promise<Omit<IngestSourceResult, "source">>,
): Promise<IngestSourceResult> {
  const startedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("ingestion_runs")
    .insert({ source_id: sourceId, started_at: startedAt, status: "running" })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Could not record ingestion run: ${error?.message ?? "unknown"}`);
  }
  const runId = (data as { id: string }).id;

  try {
    const result = await work();
    await supabase
      .from("ingestion_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: result.status,
        accepted: result.accepted,
        rejected: result.rejected,
        error: result.message ?? null,
      })
      .eq("id", runId);
    return { source: sourceId, ...result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ingestion error";
    await supabase
      .from("ingestion_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: "failed",
        error: message,
      })
      .eq("id", runId);
    return { source: sourceId, status: "failed", accepted: 0, rejected: 0, message };
  }
}

async function ingestApims(supabase: SupabaseClient) {
  const bundle = await fetchApimsBundle();
  const now = new Date().toISOString();

  const locationRows = bundle.stations.map((station) => ({
    source_id: "doe-apims",
    external_id: station.externalId,
    name: station.name,
    state_name: station.stateName,
    state_id: station.stateId,
    country_code: "MY",
    latitude: station.latitude,
    longitude: station.longitude,
    status: "active",
    last_seen_at: now,
  }));

  const { data: storedLocations, error: locationError } = await supabase
    .from("locations")
    .upsert(locationRows, { onConflict: "source_id,external_id" })
    .select("id, external_id");
  if (locationError) throw new Error(locationError.message);

  const idByExternal = new Map(
    ((storedLocations ?? []) as { id: string; external_id: string }[]).map((row) => [
      row.external_id,
      row.id,
    ]),
  );

  const observationRows = bundle.observations
    .map((observation) => {
      const locationId = idByExternal.get(observation.externalId);
      if (!locationId) return null;
      return {
        location_id: locationId,
        metric: "api",
        value: observation.api,
        unit: "index",
        index_scheme: "MY-API",
        observed_at: observation.observedAt,
        retrieved_at: now,
        source_class: observation.sourceClass,
        source_symbol: observation.symbol,
        quality: "ok",
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  let stored = 0;
  for (const batch of chunks(observationRows)) {
    const { error } = await supabase
      .from("observations")
      .upsert(batch, { onConflict: "location_id,metric,observed_at" });
    if (error) throw new Error(error.message);
    stored += batch.length;
  }

  return {
    status: bundle.stateErrors.length > 0 ? ("partial" as const) : ("success" as const),
    accepted: stored,
    rejected: bundle.rejected,
    message:
      bundle.stateErrors.length > 0
        ? `History unavailable for ${bundle.stateErrors.length} state(s)`
        : undefined,
  };
}

async function ingestForecast(supabase: SupabaseClient) {
  const status = await fetchForecastStatus({ fresh: true });
  if (!status.available || !status.cycleId) {
    return {
      status: "failed" as const,
      accepted: 0,
      rejected: 0,
      message: status.error ?? "Forecast source unavailable",
    };
  }

  const { error } = await supabase.from("forecast_runs").upsert(
    {
      source_id: "metmalaysia-mycmaq",
      external_cycle_id: status.cycleId,
      initialized_at: status.initializedAt,
      issued_at: null,
      retrieved_at: status.retrievedAt,
      source_url: status.mapUrl,
      meta: {
        manifestUrl: status.manifestUrl,
        lastFrameLabel: status.lastFrameLabel,
        pollutants: status.pollutants,
        frameCount: status.frameCount,
        error: status.error,
      },
    },
    { onConflict: "source_id,external_cycle_id" },
  );

  if (error) throw new Error(error.message);
  return {
    status: status.error ? ("partial" as const) : ("success" as const),
    accepted: 1,
    rejected: 0,
    message: status.error,
  };
}

async function ingestMonthly(supabase: SupabaseClient) {
  const rows = await fetchMonthlyPollution({ fresh: true });
  const now = new Date().toISOString();
  const payload = rows.map((row) => ({
    source_id: "opendosm",
    country_code: "MY",
    month: row.month,
    pollutant: row.pollutant,
    concentration: row.concentration,
    unit: row.unit,
    retrieved_at: now,
  }));

  let stored = 0;
  for (const batch of chunks(payload, 500)) {
    const { error } = await supabase
      .from("monthly_air_pollution")
      .upsert(batch, {
        onConflict: "source_id,country_code,month,pollutant",
      });
    if (error) throw new Error(error.message);
    stored += batch.length;
  }

  return {
    status: "success" as const,
    accepted: stored,
    rejected: 0,
  };
}

export async function runIngestion(): Promise<IngestResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const startedAt = new Date().toISOString();
  const results: IngestSourceResult[] = [];

  // Separate logs and try/catch per source so one broken provider does not
  // prevent the others from being stored.
  for (const [sourceId, work] of [
    ["doe-apims", () => ingestApims(supabase)],
    ["metmalaysia-mycmaq", () => ingestForecast(supabase)],
    ["opendosm", () => ingestMonthly(supabase)],
  ] as const) {
    results.push(await logRun(supabase, sourceId, work));
  }

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    results,
  };
}
