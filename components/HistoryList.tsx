"use client";

import { Clock3, ExternalLink } from "lucide-react";
import type { ModProject } from "@/types/mod";
import { formatDownloads } from "@/lib/format";

type HistoryListProps = {
  items: ModProject[];
};

export function HistoryList({ items }: HistoryListProps) {
  return (
    <aside className="rounded-lg border border-white/10 bg-zinc-950/72 p-4 shadow-2xl shadow-black/30 backdrop-blur">
      <div className="mb-4 flex items-center gap-2">
        <Clock3 className="size-5 text-emerald-300" aria-hidden="true" />
        <h2 className="text-lg font-black text-white">Последние дропы</h2>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-zinc-400">
          История появится после первой крутки.
        </div>
      ) : (
        <ol className="space-y-3">
          {items.map((mod, index) => (
            <li key={`${mod.id}-${index}`} className="group flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.035] p-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-emerald-400/15 text-sm font-black text-emerald-200">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{mod.title}</p>
                <p className="truncate text-xs text-zinc-400">
                  {mod.author} · {formatDownloads(mod.downloads)}
                </p>
              </div>
              <a
                href={mod.url}
                target="_blank"
                rel="noreferrer"
                className="grid size-9 shrink-0 place-items-center rounded-md border border-white/10 text-zinc-300 transition hover:border-emerald-300/40 hover:text-emerald-200"
                aria-label={`Открыть ${mod.title} на Modrinth`}
              >
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
