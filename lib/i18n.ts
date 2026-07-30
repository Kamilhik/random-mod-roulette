export type Language = "ru" | "en";

export const UI_TEXT = {
  ru: {
    badge: "Modrinth powered drop",
    title: "Random Mod Roulette",
    subtitle: "Крути рулетку и находи случайные Minecraft-моды с Modrinth",
    powered: "Powered by Modrinth API",
    language: "Язык",
    filters: {
      version: "Версия Minecraft",
      anyVersion: "Любая версия",
      loading: "Загрузка...",
      loader: "Лоадер",
      anyLoader: "Любой лоадер",
      category: "Категория Modrinth",
      anyCategory: "Любая категория",
      modsInCrate: "Модов в ящике",
      reset: "Сбросить",
      versionTypes: {
        release: "Релизы",
        snapshot: "Снапшоты",
        beta: "Бета",
        alpha: "Альфа"
      }
    },
    roulette: {
      spin: "Крутить",
      loading: "Загрузка...",
      spinning: "Крутится...",
      activeFilters: "Активных фильтров",
      errorTitle: "Рулетка остановилась до старта",
      emptyTitle: "Готово к первой крутке",
      emptyDescription:
        "Нажмите “Крутить”, и сайт заново получит случайные моды через Modrinth API.",
      notEnoughMods: (count: number) =>
        `Под эти фильтры нашлось только ${count} модов. Уменьшите количество или расширьте фильтры.`,
      loadFailed: "Не удалось загрузить моды с Modrinth.",
      emptyApi: "Modrinth не вернул подходящие моды.",
      genericLoadFailed: "Не удалось загрузить моды. Попробуйте снова.",
      positionFailed: "Не удалось рассчитать позицию рулетки. Попробуйте еще раз."
    },
    bundle: {
      crate: "Ящик",
      modSingular: "мод",
      modFew: "мода",
      modMany: "модов",
      andMore: "И еще",
      totalDownloads: "скачиваний суммарно",
      mixed: "Смешанный набор"
    },
    modCard: {
      by: "от",
      downloads: "скачиваний",
      noCategories: "Без категорий",
      noVersions: "Версии не указаны",
      open: "Открыть на Modrinth"
    },
    winner: {
      eyebrow: "Победители",
      titlePrefix: "Выпало",
      close: "Скрыть победителя",
      downloadAll: "Скачать весь дроп как modpack"
    },
    history: {
      title: "Последние дропы",
      empty: "История появится после первой крутки.",
      open: "Открыть на Modrinth"
    },
    install: {
      openSingle: "Скачать .mrpack",
      openMany: "Скачать modpack",
      setup: "Настройка modpack",
      close: "Закрыть установку",
      loadingVersions: "Загружаю версии модов...",
      noFile: "Нет файла под эту версию Minecraft и loader.",
      footer: (count: number) =>
        `Форматы: .mrpack для лаунчеров или .zip с готовыми файлами, ${count} ${modWordRu(count)}`,
      downloadingMrpack: "Собираю...",
      downloadMrpack: "Скачать .mrpack",
      downloadingZip: "Качаю файлы...",
      downloadZip: "Скачать ZIP",
      versionsFailed: "Не удалось загрузить версии модов.",
      genericVersionsFailed: "Не удалось загрузить версии для установки.",
      packFailed: "Не удалось собрать modpack.",
      archiveFailed: "Не удалось скачать архив."
    }
  },
  en: {
    badge: "Modrinth powered drop",
    title: "Random Mod Roulette",
    subtitle: "Spin the roulette and discover random Minecraft mods from Modrinth",
    powered: "Powered by Modrinth API",
    language: "Language",
    filters: {
      version: "Minecraft version",
      anyVersion: "Any version",
      loading: "Loading...",
      loader: "Loader",
      anyLoader: "Any loader",
      category: "Modrinth category",
      anyCategory: "Any category",
      modsInCrate: "Mods per crate",
      reset: "Reset",
      versionTypes: {
        release: "Releases",
        snapshot: "Snapshots",
        beta: "Beta",
        alpha: "Alpha"
      }
    },
    roulette: {
      spin: "Spin",
      loading: "Loading...",
      spinning: "Spinning...",
      activeFilters: "Active filters",
      errorTitle: "Roulette stopped before launch",
      emptyTitle: "Ready for the first spin",
      emptyDescription: "Press “Spin” and the site will fetch fresh random mods from Modrinth.",
      notEnoughMods: (count: number) =>
        `Only ${count} mods matched these filters. Lower the crate size or widen the filters.`,
      loadFailed: "Could not load mods from Modrinth.",
      emptyApi: "Modrinth did not return suitable mods.",
      genericLoadFailed: "Could not load mods. Try again.",
      positionFailed: "Could not calculate the roulette position. Try again."
    },
    bundle: {
      crate: "Crate",
      modSingular: "mod",
      modFew: "mods",
      modMany: "mods",
      andMore: "And",
      totalDownloads: "total downloads",
      mixed: "Mixed bundle"
    },
    modCard: {
      by: "by",
      downloads: "downloads",
      noCategories: "No categories",
      noVersions: "Versions not listed",
      open: "Open on Modrinth"
    },
    winner: {
      eyebrow: "Winners",
      titlePrefix: "Dropped",
      close: "Hide winners",
      downloadAll: "Download whole drop as modpack"
    },
    history: {
      title: "Recent drops",
      empty: "History appears after the first spin.",
      open: "Open on Modrinth"
    },
    install: {
      openSingle: "Download .mrpack",
      openMany: "Download modpack",
      setup: "Modpack setup",
      close: "Close installer",
      loadingVersions: "Loading mod versions...",
      noFile: "No file for this Minecraft version and loader.",
      footer: (count: number) =>
        `Formats: .mrpack for launchers or .zip with ready files, ${count} ${
          count === 1 ? "mod" : "mods"
        }`,
      downloadingMrpack: "Building...",
      downloadMrpack: "Download .mrpack",
      downloadingZip: "Downloading files...",
      downloadZip: "Download ZIP",
      versionsFailed: "Could not load mod versions.",
      genericVersionsFailed: "Could not load install versions.",
      packFailed: "Could not build modpack.",
      archiveFailed: "Could not download archive."
    }
  }
} as const;

export function modWordRu(count: number): string {
  const normalized = Math.abs(count) % 100;
  const lastDigit = normalized % 10;

  if (normalized > 10 && normalized < 20) {
    return "модов";
  }

  if (lastDigit === 1) {
    return "мод";
  }

  if (lastDigit > 1 && lastDigit < 5) {
    return "мода";
  }

  return "модов";
}

export function modWord(language: Language, count: number): string {
  if (language === "ru") {
    return modWordRu(count);
  }

  return count === 1 ? "mod" : "mods";
}
