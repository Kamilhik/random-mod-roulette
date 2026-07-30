"use client";

import { useEffect, useState } from "react";
import { Globe2 } from "lucide-react";
import { Roulette } from "@/components/Roulette";
import { UI_TEXT, type Language } from "@/lib/i18n";

const LANGUAGES: Array<{ value: Language; label: string }> = [
  { value: "ru", label: "RU" },
  { value: "en", label: "EN" }
];

export function AppShell() {
  const [language, setLanguage] = useState<Language>("ru");
  const t = UI_TEXT[language];

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("random-mod-roulette-language");

    if (savedLanguage === "ru" || savedLanguage === "en") {
      setLanguage(savedLanguage);
      document.documentElement.lang = savedLanguage;
    }
  }, []);

  function changeLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    window.localStorage.setItem("random-mod-roulette-language", nextLanguage);
    document.documentElement.lang = nextLanguage;
  }

  return (
    <main className="min-h-screen overflow-hidden bg-zinc-950 text-zinc-50">
      <div className="page-shell">
        <section className="mx-auto flex w-full max-w-[1520px] flex-col gap-6 px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10">
          <header className="flex flex-col gap-5 pt-3 sm:pt-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="mb-3 inline-flex items-center gap-2 rounded-md border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
                {t.badge}
              </p>
              <h1 className="max-w-5xl text-5xl font-black leading-[0.98] text-white sm:text-6xl lg:whitespace-nowrap xl:text-7xl">
                {t.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-300 sm:text-lg">
                {t.subtitle}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-3 lg:flex-col lg:items-end">
              <div
                className="language-switch inline-flex h-10 items-center gap-1 rounded-lg border border-white/10 bg-zinc-950/80 p-1 shadow-xl shadow-black/25"
                aria-label={t.language}
              >
                <span className="grid size-8 place-items-center text-emerald-200">
                  <Globe2 className="size-4" aria-hidden="true" />
                </span>
                {LANGUAGES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => changeLanguage(item.value)}
                    className={[
                      "h-8 rounded-md px-3 text-xs font-black transition",
                      language === item.value
                        ? "bg-emerald-300 text-zinc-950"
                        : "text-zinc-300 hover:bg-white/[0.08] hover:text-white"
                    ].join(" ")}
                    aria-pressed={language === item.value}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="text-sm font-semibold text-zinc-400">{t.powered}</p>
            </div>
          </header>

          <Roulette language={language} />
        </section>
      </div>
    </main>
  );
}
