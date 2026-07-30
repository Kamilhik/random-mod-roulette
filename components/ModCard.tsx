"use client";

import { Download, ExternalLink, Pickaxe } from "lucide-react";
import type { ModProject } from "@/types/mod";
import { displayLabel, formatDownloads, getVisibleVersions } from "@/lib/format";
import { InstallButton } from "@/components/InstallButton";

type ModCardProps = {
  mod: ModProject;
  isWinner?: boolean;
  compact?: boolean;
  className?: string;
  installVersion?: string;
  installLoader?: string;
  onInstallError?: (message: string) => void;
};

const LOADER_NAMES = new Set(["fabric", "forge", "neoforge", "quilt"]);

export function ModCard({
  mod,
  isWinner = false,
  compact = false,
  className = "",
  installVersion = "",
  installLoader = "",
  onInstallError
}: ModCardProps) {
  const loaders = mod.categories
    .filter((category) => LOADER_NAMES.has(category.toLowerCase()))
    .slice(0, 4);
  const versions = getVisibleVersions(mod.versions, compact ? 3 : 5);

  return (
    <article
      className={[
        "mod-card group relative flex h-full flex-col overflow-hidden rounded-lg border bg-zinc-950/88 p-4 shadow-2xl shadow-black/40 backdrop-blur",
        isWinner
          ? "winner-glow border-emerald-300/90 ring-2 ring-emerald-300/40"
          : "border-white/10 hover:border-emerald-300/50",
        compact ? "gap-3" : "gap-4",
        className
      ].join(" ")}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-lime-300 to-cyan-300 opacity-80" />

      <div className="flex min-w-0 items-start gap-3">
        <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-zinc-900 shadow-inner">
          {mod.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mod.iconUrl}
              alt=""
              className="size-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <Pickaxe className="size-7 text-emerald-300" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 min-h-11 text-base font-extrabold leading-snug text-white">
            {mod.title}
          </h3>
          <p className="mt-1 truncate text-xs font-medium text-zinc-400">by {mod.author}</p>
        </div>
      </div>

      <p className="line-clamp-3 min-h-14 text-sm leading-5 text-zinc-300">{mod.description}</p>

      <div className="mt-auto flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <Download className="size-4 text-emerald-300" aria-hidden="true" />
          <span>{formatDownloads(mod.downloads)} скачиваний</span>
        </div>

        <div className="flex min-h-7 flex-wrap gap-1.5">
          {(loaders.length > 0 ? loaders : mod.categories.slice(0, 3)).map((category) => (
            <span key={category} className="chip chip-loader">
              {displayLabel(category)}
            </span>
          ))}
          {loaders.length === 0 && mod.categories.length === 0 ? (
            <span className="chip">Без категорий</span>
          ) : null}
        </div>

        <div className="flex min-h-7 flex-wrap gap-1.5">
          {versions.length > 0 ? (
            versions.map((version) => (
              <span key={version} className="chip">
                {version}
              </span>
            ))
          ) : (
            <span className="chip">Версии не указаны</span>
          )}
        </div>

        <div className="grid gap-2">
          <InstallButton
            mod={mod}
            version={installVersion}
            loader={installLoader}
            onError={onInstallError}
          />

          <a
            href={mod.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-300/30 bg-emerald-400/12 px-3 text-sm font-bold text-emerald-100 transition hover:border-emerald-200 hover:bg-emerald-400/20"
          >
            Открыть на Modrinth
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}
