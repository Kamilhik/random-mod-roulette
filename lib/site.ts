export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://random-mod-roulette-minecraft.vercel.app";

export const SITE_TITLE = "Random Mod Roulette Minecraft";

export const SITE_DESCRIPTION_RU =
  "Крути рулетку и находи случайные Minecraft-моды через Modrinth API. Выбирай версию, лоадер, категории и скачивай выпавшие моды modpack архивом.";

export const SITE_DESCRIPTION_EN =
  "Spin a Minecraft mod roulette powered by Modrinth API. Pick a version, loader, categories, and download dropped mods as a modpack archive.";

export const SITE_KEYWORDS = [
  "Minecraft mods",
  "Modrinth",
  "Random Mod Roulette",
  "Minecraft mod roulette",
  "Fabric mods",
  "Forge mods",
  "NeoForge mods",
  "Quilt mods",
  "Minecraft modpack"
];
