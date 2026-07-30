"use client";

import { Boxes, Download, PackagePlus } from "lucide-react";
import type { ModProject } from "@/types/mod";
import { displayLabel, formatDownloads } from "@/lib/format";
import { modWord, UI_TEXT, type Language } from "@/lib/i18n";

type ModBundleCardProps = {
  mods: ModProject[];
  index: number;
  language: Language;
  isWinner?: boolean;
};

const LOADER_NAMES = new Set(["fabric", "forge", "neoforge", "quilt"]);

export function ModBundleCard({ mods, index, language, isWinner = false }: ModBundleCardProps) {
  const t = UI_TEXT[language];
  const visibleMods = mods.slice(0, 12);
  const extraCount = Math.max(0, mods.length - visibleMods.length);
  const downloads = mods.reduce((total, mod) => total + mod.downloads, 0);
  const loaders = [
    ...new Set(
      mods.flatMap((mod) =>
        mod.categories.filter((category) => LOADER_NAMES.has(category.toLowerCase()))
      )
    )
  ].slice(0, 4);

  return (
    <article
      className={[
        "bundle-card relative flex h-full flex-col overflow-hidden rounded-lg border bg-zinc-950/90 p-4 shadow-2xl shadow-black/40 backdrop-blur",
        isWinner
          ? "winner-glow border-emerald-300/90 ring-2 ring-emerald-300/40"
          : "border-white/10"
      ].join(" ")}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-lime-300 via-emerald-300 to-cyan-300" />

      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-md bg-emerald-300 text-zinc-950">
            <Boxes className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200">
              {t.bundle.crate} #{index + 1}
            </p>
            <h3 className="text-lg font-black text-white">
              {mods.length} {modWord(language, mods.length)}
            </h3>
          </div>
        </div>
        <PackagePlus className="size-5 shrink-0 text-emerald-200" aria-hidden="true" />
      </div>

      <div className="bundle-icon-grid mb-3">
        {visibleMods.map((mod) => (
          <div
            key={mod.id}
            className="grid aspect-square place-items-center overflow-hidden rounded-md border border-white/10 bg-zinc-900"
            title={mod.title}
          >
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
              <Boxes className="size-5 text-emerald-300" aria-hidden="true" />
            )}
          </div>
        ))}
        {extraCount > 0 ? (
          <div className="grid aspect-square place-items-center rounded-md border border-emerald-300/25 bg-emerald-300/12 text-sm font-black text-emerald-100">
            +{extraCount}
          </div>
        ) : null}
      </div>

      <div className="min-h-20 space-y-1">
        {mods.slice(0, 4).map((mod) => (
          <p key={mod.id} className="truncate text-sm font-bold text-zinc-200">
            {mod.title}
          </p>
        ))}
        {mods.length > 4 ? (
          <p className="text-xs font-semibold text-zinc-400">
            {language === "ru"
              ? `${t.bundle.andMore} ${mods.length - 4} ${modWord(language, mods.length - 4)}`
              : `${t.bundle.andMore} ${mods.length - 4} more ${modWord(language, mods.length - 4)}`}
          </p>
        ) : null}
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <Download className="size-4 text-emerald-300" aria-hidden="true" />
          <span>
            {formatDownloads(downloads, language)} {t.bundle.totalDownloads}
          </span>
        </div>

        <div className="flex min-h-7 flex-wrap gap-1.5">
          {loaders.length > 0 ? (
            loaders.map((loader) => (
              <span key={loader} className="chip chip-loader">
                {displayLabel(loader)}
              </span>
            ))
          ) : (
            <span className="chip">{t.bundle.mixed}</span>
          )}
        </div>
      </div>
    </article>
  );
}
