"use client";

import { useMemo, useState } from "react";
import { Download, Loader2, PackagePlus, X } from "lucide-react";
import { modWord, UI_TEXT, type Language } from "@/lib/i18n";
import type { ModInstallOptions, ModInstallVersion, ModProject } from "@/types/mod";

type InstallButtonProps = {
  mod?: ModProject;
  mods?: ModProject[];
  language: Language;
  version?: string;
  loader?: string;
  label?: string;
  onError?: (message: string) => void;
  className?: string;
};

type VersionsPayload = {
  mods?: ModInstallOptions[];
  error?: string;
};

type PackFormat = "mrpack" | "zip";

const LOADER_ORDER = ["fabric", "forge", "neoforge", "quilt"];

export function InstallButton({
  mod,
  mods,
  language,
  version = "",
  loader = "",
  label,
  onError,
  className = ""
}: InstallButtonProps) {
  const t = UI_TEXT[language];
  const installMods = useMemo(() => {
    const source = mods ?? (mod ? [mod] : []);
    return [...new Map(source.map((item) => [item.slug, item])).values()];
  }, [mod, mods]);
  const [open, setOpen] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [installingFormat, setInstallingFormat] = useState<PackFormat | null>(null);
  const [options, setOptions] = useState<ModInstallOptions[]>([]);
  const [minecraftVersion, setMinecraftVersion] = useState(version);
  const [selectedLoader, setSelectedLoader] = useState(loader);
  const [selectedVersionIds, setSelectedVersionIds] = useState<Record<string, string>>({});
  const [modalError, setModalError] = useState("");

  const allOptions = useMemo(() => options.flatMap((item) => item.options), [options]);
  const minecraftVersions = useMemo(
    () => unique(allOptions.flatMap((item) => item.gameVersions)).sort(sortVersions),
    [allOptions]
  );
  const loaders = useMemo(
    () =>
      unique(allOptions.flatMap((item) => item.loaders))
        .filter((item) => LOADER_ORDER.includes(item))
        .sort((a, b) => LOADER_ORDER.indexOf(a) - LOADER_ORDER.indexOf(b)),
    [allOptions]
  );
  const hasMissingSelection = installMods.some((item) => {
    const compatible = getCompatibleOptions(item.slug);
    return compatible.length === 0 || !selectedVersionIds[item.slug];
  });

  async function openPicker() {
    if (installMods.length === 0) {
      return;
    }

    setOpen(true);
    setModalError("");
    onError?.("");

    if (options.length > 0) {
      return;
    }

    setLoadingOptions(true);

    try {
      const params = new URLSearchParams({
        slugs: installMods.map((item) => item.slug).join(",")
      });
      const response = await fetch(`/api/mods/versions?${params.toString()}`, {
        cache: "no-store"
      });
      const payload = (await response.json()) as VersionsPayload;

      if (!response.ok) {
        throw new Error(language === "ru" ? payload.error ?? t.install.versionsFailed : t.install.versionsFailed);
      }

      const loadedOptions = payload.mods ?? [];
      const loadedInstallOptions = loadedOptions.flatMap((item) => item.options);
      const nextMinecraftVersion =
        pickPreferredVersion(loadedInstallOptions, version) ??
        loadedInstallOptions[0]?.gameVersions[0] ??
        "";
      const nextLoader =
        pickPreferredLoader(loadedInstallOptions, loader) ??
        LOADER_ORDER.find((item) => loadedInstallOptions.some((option) => option.loaders.includes(item))) ??
        "";

      setOptions(loadedOptions);
      setMinecraftVersion(nextMinecraftVersion);
      setSelectedLoader(nextLoader);
      setSelectedVersionIds(pickDefaultVersionIds(loadedOptions, nextMinecraftVersion, nextLoader));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t.install.genericVersionsFailed;
      setModalError(message);
      onError?.(message);
    } finally {
      setLoadingOptions(false);
    }
  }

  function updateMinecraftVersion(nextMinecraftVersion: string) {
    setMinecraftVersion(nextMinecraftVersion);
    setSelectedVersionIds((current) =>
      repairSelectedVersionIds(options, nextMinecraftVersion, selectedLoader, current)
    );
  }

  function updateLoader(nextLoader: string) {
    setSelectedLoader(nextLoader);
    setSelectedVersionIds((current) =>
      repairSelectedVersionIds(options, minecraftVersion, nextLoader, current)
    );
  }

  async function downloadPack(format: PackFormat) {
    if (installingFormat || hasMissingSelection) {
      return;
    }

    setInstallingFormat(format);
    setModalError("");
    onError?.("");

    try {
      const response = await fetch("/api/mods/pack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          packName:
            installMods.length === 1
              ? `${installMods[0].title} Pack`
              : "Random Mod Roulette Pack",
          format,
          minecraftVersion,
          loader: selectedLoader,
          mods: installMods.map((item) => ({
            slug: item.slug,
            title: item.title,
            versionId: selectedVersionIds[item.slug]
          }))
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(language === "ru" ? payload?.error ?? t.install.packFailed : t.install.packFailed);
      }

      const blob = await response.blob();
      const filename =
        parseFilename(response.headers.get("Content-Disposition")) ?? `random-mod-roulette.${format}`;
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : t.install.archiveFailed;
      setModalError(message);
      onError?.(message);
    } finally {
      setInstallingFormat(null);
    }
  }

  function getCompatibleOptions(slug: string): ModInstallVersion[] {
    return (
      options
        .find((item) => item.slug === slug)
        ?.options.filter(
          (item) =>
            item.gameVersions.includes(minecraftVersion) && item.loaders.includes(selectedLoader)
        ) ?? []
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        disabled={Boolean(installingFormat) || installMods.length === 0}
        className={[
          "install-button inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-black text-zinc-950 transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-65",
          className
        ].join(" ")}
      >
        <PackagePlus className="size-4" aria-hidden="true" />
        {label ?? (installMods.length > 1 ? t.install.openMany : t.install.openSingle)}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-lg border border-emerald-300/25 bg-zinc-950 shadow-2xl shadow-black/60">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 p-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
                  {t.install.setup}
                </p>
                <h3 className="truncate text-xl font-black text-white">
                  {installMods.length === 1
                    ? installMods[0].title
                    : `${installMods.length} ${modWord(language, installMods.length)}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-10 shrink-0 place-items-center rounded-md border border-white/10 text-zinc-300 transition hover:border-white/25 hover:text-white"
                aria-label={t.install.close}
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div className="max-h-[calc(90vh-8rem)] overflow-y-auto p-4">
              {loadingOptions ? (
                <div className="grid min-h-64 place-items-center text-zinc-300">
                  <div className="flex items-center gap-3 text-sm font-bold">
                    <Loader2 className="size-5 animate-spin text-emerald-300" aria-hidden="true" />
                    {t.install.loadingVersions}
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm font-semibold text-zinc-200">
                      {t.filters.version}
                      <select
                        value={minecraftVersion}
                        onChange={(event) => updateMinecraftVersion(event.target.value)}
                        className="field"
                      >
                        {minecraftVersions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-2 text-sm font-semibold text-zinc-200">
                      {t.filters.loader}
                      <select
                        value={selectedLoader}
                        onChange={(event) => updateLoader(event.target.value)}
                        className="field"
                      >
                        {loaders.map((item) => (
                          <option key={item} value={item}>
                            {displayLoader(item)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-3">
                    {installMods.map((item) => {
                      const compatible = getCompatibleOptions(item.slug);
                      const selectedVersionId = selectedVersionIds[item.slug] ?? "";

                      return (
                        <div
                          key={item.slug}
                          className="rounded-lg border border-white/10 bg-white/[0.035] p-3"
                        >
                          <div className="mb-2 flex items-center gap-3">
                            <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border border-white/10 bg-zinc-900">
                              {item.iconUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.iconUrl} alt="" className="size-full object-cover" />
                              ) : (
                                <PackagePlus className="size-5 text-emerald-300" aria-hidden="true" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-white">{item.title}</p>
                              <p className="text-xs text-zinc-400">{item.slug}</p>
                            </div>
                          </div>

                          {compatible.length > 0 ? (
                            <select
                              value={selectedVersionId}
                              onChange={(event) =>
                                setSelectedVersionIds((current) => ({
                                  ...current,
                                  [item.slug]: event.target.value
                                }))
                              }
                              className="field"
                            >
                              {compatible.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.versionNumber} · {option.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="rounded-md border border-red-300/25 bg-red-500/10 p-3 text-sm font-semibold text-red-100">
                              {t.install.noFile}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {modalError ? (
                    <div className="rounded-md border border-red-300/25 bg-red-500/10 p-3 text-sm font-semibold text-red-100">
                      {modalError}
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-zinc-400">
                {t.install.footer(installMods.length)}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={
                    loadingOptions ||
                    Boolean(installingFormat) ||
                    hasMissingSelection ||
                    !minecraftVersion ||
                    !selectedLoader
                  }
                  onClick={() => downloadPack("mrpack")}
                  className="install-button inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-black text-zinc-950 transition disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {installingFormat === "mrpack" ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Download className="size-4" aria-hidden="true" />
                  )}
                  {installingFormat === "mrpack" ? t.install.downloadingMrpack : t.install.downloadMrpack}
                </button>

                <button
                  type="button"
                  disabled={
                    loadingOptions ||
                    Boolean(installingFormat) ||
                    hasMissingSelection ||
                    !minecraftVersion ||
                    !selectedLoader
                  }
                  onClick={() => downloadPack("zip")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/10 bg-zinc-900 px-5 text-sm font-black text-zinc-100 transition hover:border-emerald-300/35 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {installingFormat === "zip" ? (
                    <Loader2 className="size-4 animate-spin text-emerald-300" aria-hidden="true" />
                  ) : (
                    <Download className="size-4 text-emerald-300" aria-hidden="true" />
                  )}
                  {installingFormat === "zip" ? t.install.downloadingZip : t.install.downloadZip}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function pickPreferredVersion(options: ModInstallVersion[], preferred: string): string | null {
  if (preferred && options.some((option) => option.gameVersions.includes(preferred))) {
    return preferred;
  }

  return unique(options.flatMap((option) => option.gameVersions)).sort(sortVersions)[0] ?? null;
}

function pickPreferredLoader(options: ModInstallVersion[], preferred: string): string | null {
  if (preferred && options.some((option) => option.loaders.includes(preferred))) {
    return preferred;
  }

  return (
    LOADER_ORDER.find((loader) => options.some((option) => option.loaders.includes(loader))) ?? null
  );
}

function pickDefaultVersionIds(
  options: ModInstallOptions[],
  minecraftVersion: string,
  loader: string
): Record<string, string> {
  return Object.fromEntries(
    options.map((item) => [
      item.slug,
      item.options.find(
        (option) => option.gameVersions.includes(minecraftVersion) && option.loaders.includes(loader)
      )?.id ?? ""
    ])
  );
}

function repairSelectedVersionIds(
  options: ModInstallOptions[],
  minecraftVersion: string,
  loader: string,
  current: Record<string, string>
): Record<string, string> {
  return Object.fromEntries(
    options.map((item) => {
      const compatible = item.options.filter(
        (option) => option.gameVersions.includes(minecraftVersion) && option.loaders.includes(loader)
      );
      const currentStillValid = compatible.some((option) => option.id === current[item.slug]);

      return [item.slug, currentStillValid ? current[item.slug] : compatible[0]?.id ?? ""];
    })
  );
}

function unique(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

function sortVersions(a: string, b: string): number {
  return b.localeCompare(a, undefined, { numeric: true });
}

function displayLoader(value: string): string {
  const labels: Record<string, string> = {
    fabric: "Fabric",
    forge: "Forge",
    neoforge: "NeoForge",
    quilt: "Quilt"
  };

  return labels[value] ?? value;
}

function parseFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) {
    return null;
  }

  const encodedMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (encodedMatch?.[1]) {
    return decodeURIComponent(encodedMatch[1]);
  }

  const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i);

  return quotedMatch?.[1] ?? null;
}
