"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { UI_TEXT, type Language } from "@/lib/i18n";
import type { MinecraftGameVersion, ModCategory, RouletteFilters } from "@/types/mod";

type FiltersProps = {
  filters: RouletteFilters;
  dropCount: number;
  language: Language;
  action?: ReactNode;
  disabled?: boolean;
  onChange: (filters: RouletteFilters) => void;
  onDropCountChange: (count: number) => void;
  onReset: () => void;
};

type VersionVisibility = Record<MinecraftGameVersion["versionType"], boolean>;

const LOADERS = [
  { value: "", label: "" },
  { value: "fabric", label: "Fabric" },
  { value: "forge", label: "Forge" },
  { value: "neoforge", label: "NeoForge" },
  { value: "quilt", label: "Quilt" }
];

export function Filters({
  filters,
  dropCount,
  language,
  action,
  disabled = false,
  onChange,
  onDropCountChange,
  onReset
}: FiltersProps) {
  const t = UI_TEXT[language];
  const [gameVersions, setGameVersions] = useState<MinecraftGameVersion[]>([]);
  const [gameVersionsLoading, setGameVersionsLoading] = useState(true);
  const [versionVisibility, setVersionVisibility] = useState<VersionVisibility>({
    release: true,
    snapshot: false,
    beta: false,
    alpha: false
  });
  const [categories, setCategories] = useState<ModCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const visibleGameVersions = useMemo(
    () => gameVersions.filter((version) => versionVisibility[version.versionType]),
    [gameVersions, versionVisibility]
  );

  useEffect(() => {
    let active = true;

    async function loadFilters() {
      try {
        const [versionsResponse, categoriesResponse] = await Promise.all([
          fetch("/api/mods/game-versions", {
            cache: "no-store"
          }),
          fetch("/api/mods/categories", {
            cache: "no-store"
          })
        ]);
        const versionsPayload = (await versionsResponse.json()) as {
          versions?: MinecraftGameVersion[];
        };
        const categoriesPayload = (await categoriesResponse.json()) as { categories?: ModCategory[] };

        if (!active) {
          return;
        }

        if (versionsResponse.ok) {
          setGameVersions(versionsPayload.versions ?? []);
        }

        if (categoriesResponse.ok) {
          setCategories(categoriesPayload.categories ?? []);
        }
      } finally {
        if (active) {
          setGameVersionsLoading(false);
          setCategoriesLoading(false);
        }
      }
    }

    loadFilters();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (
      filters.version &&
      gameVersions.length > 0 &&
      !visibleGameVersions.some((version) => version.version === filters.version)
    ) {
      onChange({ ...filters, version: "" });
    }
  }, [filters, gameVersions.length, onChange, visibleGameVersions]);

  function toggleVersionType(versionType: MinecraftGameVersion["versionType"], checked: boolean) {
    setVersionVisibility((current) => {
      const next = {
        ...current,
        [versionType]: checked
      };

      return Object.values(next).some(Boolean) ? next : current;
    });
  }

  return (
    <div className="control-panel w-full rounded-lg border border-white/10 bg-zinc-950/72 p-3 shadow-2xl shadow-black/25 backdrop-blur sm:p-4">
      <div className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-[minmax(12rem,1.2fr)_minmax(9rem,0.8fr)_minmax(12rem,1.15fr)_8rem_minmax(11rem,0.85fr)] xl:items-end">
        <label className="filter-field">
          <span>{t.filters.version}</span>
          <select
            aria-label={t.filters.version}
            value={filters.version}
            disabled={disabled || gameVersionsLoading}
            onChange={(event) => onChange({ ...filters, version: event.target.value })}
            className="field"
          >
            <option value="">{gameVersionsLoading ? t.filters.loading : t.filters.anyVersion}</option>
            {visibleGameVersions.map((version) => (
              <option key={version.version} value={version.version}>
                {version.version}
                {version.versionType !== "release" ? ` ${version.versionType}` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span>{t.filters.loader}</span>
          <select
            aria-label={t.filters.loader}
            value={filters.loader}
            disabled={disabled}
            onChange={(event) => onChange({ ...filters, loader: event.target.value })}
            className="field"
          >
            {LOADERS.map((loader) => (
              <option key={loader.value || "any"} value={loader.value}>
                {loader.label || t.filters.anyLoader}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span>{t.filters.category}</span>
          <select
            aria-label={t.filters.category}
            value={filters.category}
            disabled={disabled || categoriesLoading}
            onChange={(event) => onChange({ ...filters, category: event.target.value })}
            className="field"
          >
            <option value="">{categoriesLoading ? t.filters.loading : t.filters.anyCategory}</option>
            {categories.map((category) => (
              <option key={category.name} value={category.name}>
                {category.title}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span>{t.filters.modsInCrate}</span>
          <input
            aria-label={t.filters.modsInCrate}
            type="number"
            min={1}
            max={24}
            value={dropCount}
            disabled={disabled}
            onChange={(event) => onDropCountChange(Number(event.target.value))}
            className="field"
          />
        </label>

        {action ? <div className="flex min-w-0 self-end">{action}</div> : null}
      </div>

      <div className="mt-3 flex flex-col gap-3 border-t border-white/10 pt-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <VersionTypeToggle
            label={t.filters.versionTypes.release}
            checked={versionVisibility.release}
            disabled={disabled || gameVersionsLoading}
            onChange={(checked) => toggleVersionType("release", checked)}
          />
          <VersionTypeToggle
            label={t.filters.versionTypes.snapshot}
            checked={versionVisibility.snapshot}
            disabled={disabled || gameVersionsLoading}
            onChange={(checked) => toggleVersionType("snapshot", checked)}
          />
          <VersionTypeToggle
            label={t.filters.versionTypes.beta}
            checked={versionVisibility.beta}
            disabled={disabled || gameVersionsLoading}
            onChange={(checked) => toggleVersionType("beta", checked)}
          />
          <VersionTypeToggle
            label={t.filters.versionTypes.alpha}
            checked={versionVisibility.alpha}
            disabled={disabled || gameVersionsLoading}
            onChange={(checked) => toggleVersionType("alpha", checked)}
          />
        </div>

        <button
          type="button"
          disabled={disabled || (!filters.version && !filters.loader && !filters.category)}
          onClick={onReset}
          className="inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md border border-white/10 bg-zinc-900 px-4 text-sm font-bold text-zinc-100 transition hover:border-white/25 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          {t.filters.reset}
        </button>
      </div>
    </div>
  );
}

function VersionTypeToggle({
  label,
  checked,
  disabled,
  onChange
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-white/10 bg-zinc-900/80 px-3 text-xs font-black uppercase text-zinc-200 transition has-[:checked]:border-emerald-300/45 has-[:checked]:bg-emerald-400/15 has-[:checked]:text-emerald-100 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="size-3 accent-emerald-300"
      />
      <span className="whitespace-nowrap">{label}</span>
    </label>
  );
}
