"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { MinecraftGameVersion, ModCategory, RouletteFilters } from "@/types/mod";

type FiltersProps = {
  filters: RouletteFilters;
  dropCount: number;
  disabled?: boolean;
  onChange: (filters: RouletteFilters) => void;
  onDropCountChange: (count: number) => void;
  onReset: () => void;
};

type VersionVisibility = Record<MinecraftGameVersion["versionType"], boolean>;

const LOADERS = [
  { value: "", label: "Любой loader" },
  { value: "fabric", label: "Fabric" },
  { value: "forge", label: "Forge" },
  { value: "neoforge", label: "NeoForge" },
  { value: "quilt", label: "Quilt" }
];

export function Filters({
  filters,
  dropCount,
  disabled = false,
  onChange,
  onDropCountChange,
  onReset
}: FiltersProps) {
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
    <div className="w-full rounded-lg border border-white/10 bg-white/[0.04] p-3 shadow-xl shadow-black/20 backdrop-blur">
      <div className="grid w-full items-start gap-3 min-[560px]:grid-cols-2 xl:grid-cols-[minmax(9.5rem,1fr)_minmax(8.5rem,0.8fr)_minmax(11rem,1.1fr)_7rem_auto]">
        <div className="min-w-0 flex flex-col gap-2 text-xs font-black uppercase tracking-[0.04em] text-zinc-300">
          Версия Minecraft
          <select
            aria-label="Версия Minecraft"
            value={filters.version}
            disabled={disabled || gameVersionsLoading}
            onChange={(event) => onChange({ ...filters, version: event.target.value })}
            className="field"
          >
            <option value="">{gameVersionsLoading ? "Загрузка..." : "Любая версия"}</option>
            {visibleGameVersions.map((version) => (
              <option key={version.version} value={version.version}>
                {version.version}
                {version.versionType !== "release" ? ` ${version.versionType}` : ""}
              </option>
            ))}
          </select>

          <div className="grid gap-1.5 min-[420px]:grid-cols-2">
            <VersionTypeToggle
              label="Релизы"
              checked={versionVisibility.release}
              disabled={disabled || gameVersionsLoading}
              onChange={(checked) => toggleVersionType("release", checked)}
            />
            <VersionTypeToggle
              label="Снапшоты"
              checked={versionVisibility.snapshot}
              disabled={disabled || gameVersionsLoading}
              onChange={(checked) => toggleVersionType("snapshot", checked)}
            />
            <VersionTypeToggle
              label="Beta"
              checked={versionVisibility.beta}
              disabled={disabled || gameVersionsLoading}
              onChange={(checked) => toggleVersionType("beta", checked)}
            />
            <VersionTypeToggle
              label="Alpha"
              checked={versionVisibility.alpha}
              disabled={disabled || gameVersionsLoading}
              onChange={(checked) => toggleVersionType("alpha", checked)}
            />
          </div>
        </div>

      <label className="min-w-0 flex flex-col gap-2 text-xs font-black uppercase tracking-[0.04em] text-zinc-300">
        Loader
        <select
          value={filters.loader}
          disabled={disabled}
          onChange={(event) => onChange({ ...filters, loader: event.target.value })}
          className="field"
        >
          {LOADERS.map((loader) => (
            <option key={loader.value || "any"} value={loader.value}>
              {loader.label}
            </option>
          ))}
        </select>
      </label>

      <label className="min-w-0 flex flex-col gap-2 text-xs font-black uppercase tracking-[0.04em] text-zinc-300">
        Категория Modrinth
        <select
          value={filters.category}
          disabled={disabled || categoriesLoading}
          onChange={(event) => onChange({ ...filters, category: event.target.value })}
          className="field"
        >
          <option value="">{categoriesLoading ? "Загрузка..." : "Любая категория"}</option>
          {categories.map((category) => (
            <option key={category.name} value={category.name}>
              {category.title}
            </option>
          ))}
        </select>
      </label>

      <label className="min-w-0 flex flex-col gap-2 text-xs font-black uppercase tracking-[0.04em] text-zinc-300">
        Модов в ящике
        <input
          type="number"
          min={1}
          max={24}
          value={dropCount}
          disabled={disabled}
          onChange={(event) => onDropCountChange(Number(event.target.value))}
          className="field"
        />
      </label>

      <button
        type="button"
        disabled={disabled || (!filters.version && !filters.loader && !filters.category)}
        onClick={onReset}
        className="inline-flex h-11 items-center justify-center gap-2 self-end whitespace-nowrap rounded-md border border-white/10 bg-zinc-900 px-4 text-sm font-bold text-zinc-100 transition hover:border-white/25 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-45 min-[560px]:col-span-2 xl:col-span-1"
      >
        <RotateCcw className="size-4" aria-hidden="true" />
        Сбросить
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
    <label className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-white/10 bg-zinc-900/80 px-2 text-[0.68rem] font-black uppercase tracking-[0.04em] text-zinc-200 transition has-[:checked]:border-emerald-300/45 has-[:checked]:bg-emerald-400/15 has-[:checked]:text-emerald-100 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="size-3 accent-emerald-300"
      />
      {label}
    </label>
  );
}
