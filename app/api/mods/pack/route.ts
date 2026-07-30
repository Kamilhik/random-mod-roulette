import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";

export const dynamic = "force-dynamic";

const MODRINTH_API = "https://api.modrinth.com/v2";
const USER_AGENT =
  process.env.MODRINTH_USER_AGENT ??
  "RandomModRoulette/1.0.0 (contact: example@example.com)";
const MAX_PACK_MODS = 24;
const ALLOWED_LOADERS = new Set(["fabric", "forge", "neoforge", "quilt"]);
const BLOCKED_FILE_TYPES = new Set([
  "required-resource-pack",
  "optional-resource-pack",
  "sources-jar",
  "dev-jar",
  "javadoc-jar",
  "signature"
]);
const LOADER_DEPENDENCIES: Record<string, { key: string; version: string }> = {
  fabric: { key: "fabric-loader", version: "0.16.14" },
  forge: { key: "forge", version: "latest" },
  neoforge: { key: "neoforge", version: "latest" },
  quilt: { key: "quilt-loader", version: "0.29.0" }
};

type PackRequest = {
  minecraftVersion?: unknown;
  loader?: unknown;
  packName?: unknown;
  format?: unknown;
  mods?: unknown;
};

type PackModRequest = {
  slug?: unknown;
  title?: unknown;
  versionId?: unknown;
};

type VersionFile = {
  url: string;
  filename: string;
  primary: boolean;
  size: number;
  file_type: string | null;
  hashes: {
    sha1?: string;
    sha512?: string;
  };
};

type ProjectVersion = {
  id: string;
  project_id: string;
  name: string;
  version_number: string;
  version_type: "release" | "beta" | "alpha";
  status: string;
  date_published: string;
  game_versions: string[];
  loaders: string[];
  files: VersionFile[];
};

type PackIndexFile = {
  path: string;
  hashes: {
    sha1: string;
    sha512: string;
  };
  downloads: string[];
  fileSize: number;
};

type PackFormat = "mrpack" | "zip";

class PackError extends Error {
  constructor(
    public status: number,
    message: string,
    public resetAfter?: string | null
  ) {
    super(message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PackRequest;
    const minecraftVersion = parseMinecraftVersion(body.minecraftVersion);
    const loader = parseLoader(body.loader);
    const format = parseFormat(body.format);
    const mods = parseMods(body.mods);
    const versionIds = mods.map((mod) => mod.versionId);
    const versions = await getVersions(versionIds);
    const versionById = new Map(versions.map((version) => [version.id, version]));
    const files = dedupePackFiles(mods.map((mod) => {
      const version = versionById.get(mod.versionId);

      if (!version) {
        throw new PackError(404, `Не найдена версия для ${mod.title}.`);
      }

      validateCompatibility(version, minecraftVersion, loader, mod.title);

      const file =
        version.files.find((candidate) => candidate.primary && isInstallableFile(candidate)) ??
        version.files.find(isInstallableFile);

      if (!file?.hashes.sha1 || !file.hashes.sha512) {
        throw new PackError(404, `У ${mod.title} нет подходящего файла для modpack.`);
      }

      return toPackFile(file);
    }));
    const packName = sanitizePackName(
      typeof body.packName === "string" ? body.packName : "Random Mod Roulette Pack"
    );

    if (format === "zip") {
      return createZipResponse({
        packName,
        minecraftVersion,
        loader,
        files
      });
    }

    const index = createPackIndex({
      name: packName,
      minecraftVersion,
      loader,
      files
    });
    const zip = new JSZip();

    zip.file("modrinth.index.json", JSON.stringify(index, null, 2));

    const buffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: {
        level: 9
      }
    });
    const filename = `${slugify(packName)}-${minecraftVersion}-${loader}.mrpack`;
    const blob = new Blob([new Uint8Array(buffer)], {
      type: "application/x-modrinth-modpack"
    });

    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": "application/x-modrinth-modpack",
        "Content-Disposition": contentDisposition(filename),
        "Cache-Control": "no-store",
        "Content-Length": String(buffer.length)
      }
    });
  } catch (error) {
    if (error instanceof PackError) {
      if (error.status === 429) {
        const suffix = error.resetAfter ? ` Повторите через ${error.resetAfter} сек.` : "";
        return jsonError(`Modrinth временно ограничил запросы.${suffix}`, 429);
      }

      return jsonError(error.message, error.status);
    }

    return jsonError("Не удалось собрать modpack. Попробуйте другую комбинацию.", 502);
  }
}

async function createZipResponse({
  packName,
  minecraftVersion,
  loader,
  files
}: {
  packName: string;
  minecraftVersion: string;
  loader: string;
  files: PackIndexFile[];
}) {
  const zip = new JSZip();

  for (const file of files) {
    const response = await fetch(file.downloads[0], {
      headers: {
        "User-Agent": USER_AGENT
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new PackError(502, `Не удалось скачать файл ${file.path} с CDN Modrinth.`);
    }

    zip.file(file.path, new Uint8Array(await response.arrayBuffer()));
  }

  zip.file("README.txt", createZipReadme({ packName, minecraftVersion, loader, files }));

  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: {
      level: 6
    }
  });
  const filename = `${slugify(packName)}-${minecraftVersion}-${loader}.zip`;
  const blob = new Blob([new Uint8Array(buffer)], {
    type: "application/zip"
  });

  return new NextResponse(blob, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": contentDisposition(filename),
      "Cache-Control": "no-store",
      "Content-Length": String(buffer.length)
    }
  });
}

async function getVersions(versionIds: string[]): Promise<ProjectVersion[]> {
  const params = new URLSearchParams({
    ids: JSON.stringify(versionIds)
  });

  return modrinthFetch<ProjectVersion[]>(`/versions?${params.toString()}`);
}

function validateCompatibility(
  version: ProjectVersion,
  minecraftVersion: string,
  loader: string,
  title: string
) {
  if (!version.game_versions.includes(minecraftVersion)) {
    throw new PackError(400, `${title} не поддерживает Minecraft ${minecraftVersion}.`);
  }

  if (!version.loaders.includes(loader)) {
    throw new PackError(400, `${title} не поддерживает loader ${loader}.`);
  }
}

function createPackIndex({
  name,
  minecraftVersion,
  loader,
  files
}: {
  name: string;
  minecraftVersion: string;
  loader: string;
  files: PackIndexFile[];
}) {
  const dependencies: Record<string, string> = {
    minecraft: minecraftVersion
  };
  const loaderDependency = LOADER_DEPENDENCIES[loader];

  if (loaderDependency) {
    dependencies[loaderDependency.key] = loaderDependency.version;
  }

  return {
    formatVersion: 1,
    game: "minecraft",
    versionId: `${slugify(name)}-${Date.now()}`,
    name,
    summary: "Generated by Random Mod Roulette",
    files,
    dependencies
  };
}

function toPackFile(file: VersionFile): PackIndexFile {
  const filename = sanitizeFilename(file.filename);

  return {
    path: `mods/${filename}`,
    hashes: {
      sha1: file.hashes.sha1 as string,
      sha512: file.hashes.sha512 as string
    },
    downloads: [file.url],
    fileSize: file.size
  };
}

function dedupePackFiles(files: PackIndexFile[]): PackIndexFile[] {
  return [...new Map(files.map((file) => [file.path, file])).values()];
}

function createZipReadme({
  packName,
  minecraftVersion,
  loader,
  files
}: {
  packName: string;
  minecraftVersion: string;
  loader: string;
  files: PackIndexFile[];
}): string {
  return [
    packName,
    "",
    `Minecraft: ${minecraftVersion}`,
    `Loader: ${loader}`,
    "",
    "Файлы модов находятся в папке mods/.",
    "Перенесите папку mods или ее содержимое в профиль Minecraft с выбранным loader.",
    "",
    "Mods:",
    ...files.map((file) => `- ${file.path} (${file.fileSize} bytes)`)
  ].join("\n");
}

function isInstallableFile(file: VersionFile): boolean {
  const lowerFilename = file.filename.toLowerCase();

  if (file.file_type && BLOCKED_FILE_TYPES.has(file.file_type)) {
    return false;
  }

  return lowerFilename.endsWith(".jar") || lowerFilename.endsWith(".litemod");
}

async function modrinthFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${MODRINTH_API}${path}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await readErrorBody(response);
    const resetAfter = response.headers.get("X-Ratelimit-Reset");
    const message =
      body?.description ??
      body?.error ??
      `Modrinth API вернул ошибку ${response.status}. Попробуйте снова.`;

    throw new PackError(response.status, message, resetAfter);
  }

  return response.json() as Promise<T>;
}

async function readErrorBody(response: Response): Promise<{ error?: string; description?: string } | null> {
  try {
    return (await response.json()) as { error?: string; description?: string };
  } catch {
    return null;
  }
}

function parseMinecraftVersion(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new PackError(400, "Выберите версию Minecraft для modpack.");
  }

  const version = value.trim();

  if (!/^[0-9A-Za-z._-]+$/.test(version)) {
    throw new PackError(400, "Некорректная версия Minecraft.");
  }

  return version;
}

function parseLoader(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new PackError(400, "Выберите loader для modpack.");
  }

  const loader = value.trim().toLowerCase();

  if (!ALLOWED_LOADERS.has(loader)) {
    throw new PackError(400, "Некорректный loader.");
  }

  return loader;
}

function parseFormat(value: unknown): PackFormat {
  if (value === undefined || value === null || value === "" || value === "mrpack") {
    return "mrpack";
  }

  if (value === "zip") {
    return "zip";
  }

  throw new PackError(400, "Некорректный формат архива.");
}

function parseMods(value: unknown): Array<{ slug: string; title: string; versionId: string }> {
  if (!Array.isArray(value)) {
    throw new PackError(400, "Не указаны моды для modpack.");
  }

  const mods = value
    .map((item) => parseMod(item as PackModRequest))
    .filter((item): item is { slug: string; title: string; versionId: string } => Boolean(item));

  if (mods.length === 0) {
    throw new PackError(400, "Не выбрано ни одного мода для modpack.");
  }

  return [...new Map(mods.map((mod) => [`${mod.slug}:${mod.versionId}`, mod])).values()].slice(
    0,
    MAX_PACK_MODS
  );
}

function parseMod(value: PackModRequest): { slug: string; title: string; versionId: string } | null {
  if (
    typeof value?.slug !== "string" ||
    typeof value?.title !== "string" ||
    typeof value?.versionId !== "string"
  ) {
    return null;
  }

  const slug = value.slug.trim();
  const title = value.title.trim() || slug;
  const versionId = value.versionId.trim();

  if (!/^[\w!@$()`.+,"\-']{3,64}$/.test(slug) || !/^[A-Za-z0-9]{4,32}$/.test(versionId)) {
    return null;
  }

  return {
    slug,
    title,
    versionId
  };
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[\\/:*?"<>|]/g, "_").slice(0, 160) || "mod.jar";
}

function sanitizePackName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "").trim().slice(0, 80) || "Random Mod Roulette Pack";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "random-mod-pack";
}

function contentDisposition(filename: string): string {
  const fallback = filename.replace(/[^\x20-\x7E]/g, "_");
  const encoded = encodeURIComponent(filename).replace(/['()]/g, escape);

  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      error: message
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
