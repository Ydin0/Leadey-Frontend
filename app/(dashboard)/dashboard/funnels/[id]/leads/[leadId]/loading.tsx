/** Route-transition fallback — paints instantly while the page chunk loads. */
export default function Loading() {
  return (
    <div className="-m-6 h-[calc(100vh-3.5rem)] flex flex-col bg-page">
      <div className="shrink-0 border-b border-border-subtle bg-surface px-6 py-4 space-y-3">
        <div className="h-4 w-40 rounded bg-section animate-pulse" />
        <div className="h-7 w-72 rounded-[8px] bg-section animate-pulse" />
      </div>
      <div className="flex flex-1 min-h-0">
        <aside className="w-[364px] shrink-0 border-r border-border-subtle p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-[14px] bg-section animate-pulse" />
          ))}
        </aside>
        <section className="flex-1 p-7 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-[14px] bg-section animate-pulse" />
          ))}
        </section>
      </div>
    </div>
  );
}
