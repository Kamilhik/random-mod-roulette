export function formatDownloads(value: number, language: "ru" | "en" = "ru"): string {
  return new Intl.NumberFormat(language === "ru" ? "ru-RU" : "en-US", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: value >= 10000 ? 1 : 0
  }).format(value);
}

export function displayLabel(value: string): string {
  if (!value) {
    return "";
  }

  const known: Record<string, string> = {
    fabric: "Fabric",
    forge: "Forge",
    neoforge: "NeoForge",
    quilt: "Quilt"
  };

  return known[value.toLowerCase()] ?? value.replace(/-/g, " ");
}

export function getVisibleVersions(versions: string[], amount = 5): string[] {
  return [...versions]
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
    .slice(0, amount);
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}
