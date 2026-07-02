/** Route-transition fallback — paints instantly while the page chunk loads. */
export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-56 rounded-[8px] bg-section animate-pulse" />
      <div className="rounded-[14px] border border-border-subtle bg-surface p-4 space-y-2.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 rounded-[8px] bg-section animate-pulse" />
        ))}
      </div>
    </div>
  );
}
