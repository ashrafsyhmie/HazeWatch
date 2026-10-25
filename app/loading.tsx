export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-10 sm:px-8">
      <div className="flex w-fit items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-line border-t-signal" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-fog">Loading air-quality data</p>
          <p className="mt-0.5 text-xs text-muted">Fetching the latest available snapshot.</p>
        </div>
      </div>
      <p className="sr-only" role="status">Loading air-quality data</p>
    </div>
  );
}
