"use client";

import { Crown, X } from "lucide-react";
import type { ModProject } from "@/types/mod";
import { modWord, UI_TEXT, type Language } from "@/lib/i18n";
import { InstallButton } from "@/components/InstallButton";
import { ModCard } from "@/components/ModCard";

type WinnerPanelProps = {
  mods: ModProject[];
  installVersion?: string;
  installLoader?: string;
  language: Language;
  onInstallError?: (message: string) => void;
  onClose: () => void;
};

export function WinnerPanel({
  mods,
  installVersion = "",
  installLoader = "",
  language,
  onInstallError,
  onClose
}: WinnerPanelProps) {
  const t = UI_TEXT[language];

  if (mods.length === 0) {
    return null;
  }

  return (
    <section className="winner-panel rounded-lg border border-emerald-300/35 bg-zinc-950/88 p-4 shadow-2xl shadow-emerald-950/30 backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-md bg-emerald-400 text-zinc-950">
            <Crown className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
              {t.winner.eyebrow}
            </p>
            <h2 className="text-xl font-black text-white">
              {t.winner.titlePrefix} {mods.length} {modWord(language, mods.length)}
            </h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid size-10 place-items-center rounded-md border border-white/10 text-zinc-300 transition hover:border-white/25 hover:text-white"
          aria-label={t.winner.close}
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <InstallButton
        mods={mods}
        version={installVersion}
        loader={installLoader}
        language={language}
        label={t.winner.downloadAll}
        onError={onInstallError}
        className="mb-4 w-full"
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {mods.map((mod, index) => (
          <ModCard
            key={mod.id}
            mod={mod}
            language={language}
            isWinner={index === 0}
            installVersion={installVersion}
            installLoader={installLoader}
            onInstallError={onInstallError}
            className="min-h-[360px]"
          />
        ))}
      </div>
    </section>
  );
}
