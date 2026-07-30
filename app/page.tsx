import { Roulette } from "@/components/Roulette";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-zinc-950 text-zinc-50">
      <div className="page-shell">
        <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <header className="flex flex-col gap-5 pt-4 sm:pt-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="mb-3 inline-flex items-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                Modrinth powered drop
              </p>
              <h1 className="text-4xl font-black leading-tight text-white sm:text-6xl lg:text-7xl">
                Random Mod Roulette
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">
                Крути рулетку и находи случайные Minecraft-моды с Modrinth
              </p>
            </div>
            <p className="text-sm font-medium text-zinc-400">Powered by Modrinth API</p>
          </header>

          <Roulette />
        </section>
      </div>
    </main>
  );
}
