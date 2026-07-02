/** Route-transition fallback — paints instantly while the page chunk loads. */
export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-4 w-32 rounded bg-section animate-pulse" />
      <div className="flex items-center gap-3">
        <div className="h-7 w-64 rounded-[8px] bg-section animate-pulse" />
        <div className="h-5 w-16 rounded-full bg-section animate-pulse" />
      </div>
      <div className="h-8 w-full max-w-xl rounded-[8px] bg-section animate-pulse" />
      <div className="rounded-[14px] border border-border-subtle bg-surface p-4 space-y-2.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-9 rounded-[8px] bg-section animate-pulse" />
        ))}
      </div>
    </div>
  );
}
