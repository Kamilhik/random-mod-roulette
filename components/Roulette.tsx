"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";
import type { ModProject, RouletteFilters } from "@/types/mod";
import { shuffle } from "@/lib/format";
import { Filters } from "@/components/Filters";
import { HistoryList } from "@/components/HistoryList";
import { ModBundleCard } from "@/components/ModBundleCard";
import { RouletteSkeleton } from "@/components/RouletteSkeleton";
import { WinnerPanel } from "@/components/WinnerPanel";

type ModsResponse = {
  mods: ModProject[];
  error?: string;
};

type SpinPlan = {
  targetIndex: number;
  baseWinners: ModProject[];
};

type ReelBundle = {
  id: string;
  mods: ModProject[];
};

const MIN_DROP_COUNT = 1;
const MAX_DROP_COUNT = 24;
const REPEAT_COUNT = 8;
const TARGET_REPEAT = 5;

export function Roulette() {
  const [filters, setFilters] = useState<RouletteFilters>({ version: "", loader: "", category: "" });
  const [dropCount, setDropCount] = useState(1);
  const [reelBundles, setReelBundles] = useState<ReelBundle[]>([]);
  const [winners, setWinners] = useState<ModProject[]>([]);
  const [history, setHistory] = useState<ModProject[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [transitionMs, setTransitionMs] = useState(0);
  const [trackOffset, setTrackOffset] = useState(0);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const [spinPlan, setSpinPlan] = useState<SpinPlan | null>(null);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const activeTimerRef = useRef<number | null>(null);

  const isBusy = loading || spinning;

  const selectedFilterCount = useMemo(
    () =>
      Number(Boolean(filters.version)) +
      Number(Boolean(filters.loader)) +
      Number(Boolean(filters.category)),
    [filters]
  );

  const handleInstallError = useCallback((message: string) => {
    setError(message);
  }, []);

  const loadMods = useCallback(async () => {
    const requestCount = Math.min(60, Math.max(30, dropCount * 3));
    const params = new URLSearchParams({
      count: String(requestCount)
    });

    if (filters.version) {
      params.set("version", filters.version);
    }

    if (filters.loader) {
      params.set("loader", filters.loader);
    }

    if (filters.category) {
      params.set("category", filters.category);
    }

    const response = await fetch(`/api/mods/random?${params.toString()}`, {
      cache: "no-store"
    });
    const payload = (await response.json()) as ModsResponse;

    if (!response.ok) {
      throw new Error(payload.error || "Не удалось загрузить моды с Modrinth.");
    }

    if (!payload.mods || payload.mods.length === 0) {
      throw new Error("Modrinth не вернул подходящие моды.");
    }

    if (payload.mods.length < dropCount) {
      throw new Error(
        `Под эти фильтры нашлось только ${payload.mods.length} модов. Уменьшите количество или расширьте фильтры.`
      );
    }

    return payload.mods;
  }, [dropCount, filters]);

  const startSpin = useCallback(async () => {
    if (isBusy) {
      return;
    }

    if (activeTimerRef.current) {
      window.clearTimeout(activeTimerRef.current);
    }

    setError("");
    setWinners([]);
    setHighlightIndex(null);
    setTransitionMs(0);
    setTrackOffset(0);
    setSpinPlan(null);
    setLoading(true);

    try {
      const mods = shuffle(await loadMods());
      const bundles = createBundles(mods, dropCount);
      const targetBaseIndex = Math.floor(Math.random() * bundles.length);
      const targetIndex = TARGET_REPEAT * bundles.length + targetBaseIndex;
      const repeated = Array.from({ length: REPEAT_COUNT }, () => bundles).flat();

      cardRefs.current = [];
      setReelBundles(repeated);
      setSpinPlan({
        targetIndex,
        baseWinners: bundles[targetBaseIndex].mods
      });
      setSpinning(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось загрузить моды. Попробуйте снова."
      );
      setSpinning(false);
    } finally {
      setLoading(false);
    }
  }, [dropCount, isBusy, loadMods]);

  useEffect(() => {
    if (!spinPlan || reelBundles.length === 0) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      const targetCard = cardRefs.current[spinPlan.targetIndex];

      if (!viewport || !targetCard) {
        setError("Не удалось рассчитать позицию рулетки. Попробуйте еще раз.");
        setSpinning(false);
        return;
      }

      const viewportCenter = viewport.clientWidth / 2;
      const targetCenter = targetCard.offsetLeft + targetCard.offsetWidth / 2;
      const endOffset = viewportCenter - targetCenter;
      const duration = 4300 + Math.floor(Math.random() * 1300);

      setTransitionMs(duration);
      setTrackOffset(endOffset);

      activeTimerRef.current = window.setTimeout(() => {
        setHighlightIndex(spinPlan.targetIndex);
        setWinners(spinPlan.baseWinners);
        setHistory((items) => {
          const merged = [...spinPlan.baseWinners, ...items];
          const withoutImmediateRepeats = merged.filter(
            (mod, index) => index === 0 || mod.id !== merged[index - 1]?.id
          );

          return withoutImmediateRepeats.slice(0, 5);
        });
        setSpinning(false);
        setSpinPlan(null);
      }, duration + 120);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [reelBundles.length, spinPlan]);

  useEffect(() => {
    return () => {
      if (activeTimerRef.current) {
        window.clearTimeout(activeTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="min-w-0">
        <div className="mb-4 grid gap-3 2xl:grid-cols-[minmax(0,1fr)_12rem] 2xl:items-end">
          <Filters
            filters={filters}
            dropCount={dropCount}
            disabled={isBusy}
            onChange={setFilters}
            onDropCountChange={(count) =>
              setDropCount(Math.min(MAX_DROP_COUNT, Math.max(MIN_DROP_COUNT, Math.floor(count) || 1)))
            }
            onReset={() => setFilters({ version: "", loader: "", category: "" })}
          />

          <button
            type="button"
            disabled={isBusy}
            onClick={startSpin}
            className="spin-button inline-flex h-14 items-center justify-center gap-3 rounded-md px-7 text-base font-black text-zinc-950 shadow-2xl shadow-emerald-950/50 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Sparkles className={["size-5", spinning ? "animate-spin" : ""].join(" ")} aria-hidden="true" />
            {loading ? "Загрузка..." : spinning ? "Крутится..." : "Крутить"}
          </button>
        </div>

        {selectedFilterCount > 0 ? (
          <p className="mb-4 text-sm text-zinc-400">
            Активных фильтров: <span className="font-bold text-emerald-200">{selectedFilterCount}</span>
          </p>
        ) : null}

        {error ? (
          <div className="toast mb-4 flex items-start gap-3 rounded-lg border border-red-300/30 bg-red-500/12 p-4 text-sm text-red-100">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-black">Рулетка остановилась до старта</p>
              <p className="mt-1 text-red-100/85">{error}</p>
            </div>
          </div>
        ) : null}

        <div className="roulette-stage relative overflow-hidden rounded-lg border border-white/10 bg-zinc-950/72 py-8 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="stage-glass pointer-events-none absolute inset-0" />
          <div className="center-marker pointer-events-none absolute inset-y-3 left-1/2 z-20 w-0 -translate-x-1/2">
            <div className="absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 border-x-[13px] border-t-[22px] border-x-transparent border-t-emerald-300 drop-shadow-[0_0_16px_rgba(110,231,183,0.75)]" />
            <div className="absolute bottom-0 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[13px] border-b-[22px] border-x-transparent border-b-emerald-300 drop-shadow-[0_0_16px_rgba(110,231,183,0.75)]" />
            <div className="absolute left-1/2 top-8 h-[calc(100%-4rem)] w-px -translate-x-1/2 bg-emerald-200/70 shadow-[0_0_18px_rgba(110,231,183,0.85)]" />
          </div>

          <div className="relative z-10 overflow-hidden" ref={viewportRef}>
            {loading && reelBundles.length === 0 ? (
              <RouletteSkeleton />
            ) : reelBundles.length > 0 ? (
              <div
                ref={trackRef}
                className="flex gap-4 will-change-transform"
                style={{
                  transform: `translate3d(${trackOffset}px, 0, 0)`,
                  transition:
                    transitionMs > 0
                      ? `transform ${transitionMs}ms cubic-bezier(0.08, 0.82, 0.16, 1)`
                      : "none"
                }}
              >
                {reelBundles.map((bundle, index) => (
                  <div
                    key={`${bundle.id}-${index}`}
                    ref={(node) => {
                      cardRefs.current[index] = node;
                    }}
                    className="roulette-card shrink-0"
                  >
                    <ModBundleCard
                      mods={bundle.mods}
                      index={index % Math.max(1, Math.floor(reelBundles.length / REPEAT_COUNT))}
                      isWinner={highlightIndex === index}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="mx-auto flex min-h-[390px] max-w-2xl flex-col items-center justify-center px-6 text-center">
                <div className="grid size-16 place-items-center rounded-lg border border-emerald-300/25 bg-emerald-300/10">
                  <Sparkles className="size-8 text-emerald-200" aria-hidden="true" />
                </div>
                <h2 className="mt-5 text-2xl font-black text-white">Готово к первой крутке</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Нажмите “Крутить”, и сайт заново получит случайные моды через Modrinth API.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5">
          <WinnerPanel
            mods={winners}
            installVersion={filters.version}
            installLoader={filters.loader}
            onInstallError={handleInstallError}
            onClose={() => setWinners([])}
          />
        </div>
      </section>

      <HistoryList items={history} />
    </div>
  );
}

function createBundles(mods: ModProject[], dropCount: number): ReelBundle[] {
  const bundleSize = Math.min(Math.max(dropCount, MIN_DROP_COUNT), mods.length);
  const bundleCount = Math.min(30, Math.max(12, mods.length));

  return Array.from({ length: bundleCount }, (_, bundleIndex) => {
    const bundleMods = Array.from(
      { length: bundleSize },
      (_unused, modIndex) => mods[(bundleIndex + modIndex) % mods.length]
    );

    return {
      id: bundleMods.map((mod) => mod.id).join("-"),
      mods: bundleMods
    };
  });
}
