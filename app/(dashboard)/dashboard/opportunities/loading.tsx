/** Route-transition fallback — paints instantly while the page chunk loads. */
export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-52 rounded-[8px] bg-section animate-pulse" />
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 rounded-[14px] bg-section animate-pulse" />
        ))}
      </div>
    </div>
  );
}
