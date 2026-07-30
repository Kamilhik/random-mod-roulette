"use client";

export function RouletteSkeleton() {
  return (
    <div className="flex gap-4 px-[max(1rem,calc((100vw-72rem)/2))]">
      {Array.from({ length: 7 }, (_, index) => (
        <div key={index} className="skeleton-card shrink-0 rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <div className="mb-4 flex gap-3">
            <div className="skeleton size-14 rounded-lg" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="skeleton h-4 w-4/5 rounded" />
              <div className="skeleton h-3 w-1/2 rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="skeleton h-3 rounded" />
            <div className="skeleton h-3 w-11/12 rounded" />
            <div className="skeleton h-3 w-2/3 rounded" />
          </div>
          <div className="mt-8 grid gap-2">
            <div className="skeleton h-4 w-1/2 rounded" />
            <div className="skeleton h-7 rounded" />
            <div className="skeleton h-10 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
