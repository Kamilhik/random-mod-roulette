import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MODRINTH_API = "https://api.modrinth.com/v2";
const USER_AGENT =
  process.env.MODRINTH_USER_AGENT ??
  "RandomModRoulette/1.0.0 (contact: example@example.com)";
const ALLOWED_LOADERS = new Set(["fabric", "forge", "neoforge", "quilt"]);
const BLOCKED_FILE_TYPES = new Set([
  "required-resource-pack",
  "optional-resource-pack",
  "sources-jar",
  "dev-jar",
  "javadoc-jar",
  "signature"
]);

type VersionFile = {
  url: string;
  filename: string;
  primary: boolean;
  size: number;
  file_type: string | null;
};

type ProjectVersion = {
  id: string;
  name: string;
  version_number: string;
  version_type: "release" | "beta" | "alpha";
  status: string;
  date_published: string;
  game_versions: string[];
  loaders: string[];
  files: VersionFile[];
};

type InstallTarget = {
  version: ProjectVersion;
  file: VersionFile;
};

class ModrinthInstallError extends Error {
  constructor(
    public status: number,
    message: string,
    public resetAfter?: string | null
  ) {
    super(message);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const slug = parseSlug(searchParams.get("slug"));
    const version = parseVersion(searchParams.get("version"));
    const loader = parseLoader(searchParams.get("loader"));
    const versions = await getProjectVersions(slug, version, loader);
    const target = pickInstallTarget(versions);

    if (!target) {
      return jsonError(
        "Для этого мода не найден устанавливаемый .jar под выбранные фильтры.",
        404
      );
    }

    const fileResponse = await fetch(target.file.url, {
      headers: {
        "User-Agent": USER_AGENT
      },
      cache: "no-store"
    });

    if (!fileResponse.ok || !fileResponse.body) {
      return jsonError("Не удалось скачать файл мода с CDN Modrinth.", 502);
    }

    const filename = sanitizeFilename(target.file.filename || `${slug}.jar`);
    const headers = new Headers({
      "Content-Type": fileResponse.headers.get("Content-Type") ?? "application/java-archive",
      "Content-Disposition": contentDisposition(filename),
      "Cache-Control": "no-store",
      "X-Modrinth-Version": target.version.version_number,
      "X-Modrinth-Loader": target.version.loaders.join(",")
    });
    const length = fileResponse.headers.get("Content-Length");

    if (length) {
      headers.set("Content-Length", length);
    }

    return new NextResponse(fileResponse.body, {
      status: 200,
      headers
    });
  } catch (error) {
    if (error instanceof ModrinthInstallError) {
      if (error.status === 429) {
        const suffix = error.resetAfter ? ` Повторите через ${error.resetAfter} сек.` : "";
        return jsonError(`Modrinth временно ограничил запросы.${suffix}`, 429);
      }

      return jsonError(error.message, error.status >= 400 ? error.status : 502);
    }

    return jsonError("Не удалось подготовить установку мода. Попробуйте снова.", 502);
  }
}

async function getProjectVersions(
  slug: string,
  version: string,
  loader: string
): Promise<ProjectVersion[]> {
  const params = new URLSearchParams({
    include_changelog: "false"
  });

  if (version) {
    params.set("game_versions", JSON.stringify([version]));
  }

  if (loader) {
    params.set("loaders", JSON.stringify([loader]));
  }

  const encodedSlug = encodeURIComponent(slug);
  return modrinthFetch<ProjectVersion[]>(`/project/${encodedSlug}/version?${params.toString()}`);
}

function pickInstallTarget(versions: ProjectVersion[]): InstallTarget | null {
  const sortedVersions = [...versions]
    .filter((version) => version.status === "listed" || version.status === "archived")
    .sort((a, b) => {
      const releaseDelta = versionTypePriority(a.version_type) - versionTypePriority(b.version_type);

      if (releaseDelta !== 0) {
        return releaseDelta;
      }

      return new Date(b.date_published).getTime() - new Date(a.date_published).getTime();
    });

  for (const version of sortedVersions) {
    const file =
      version.files.find((candidate) => candidate.primary && isInstallableFile(candidate)) ??
      version.files.find(isInstallableFile);

    if (file) {
      return {
        version,
        file
      };
    }
  }

  return null;
}

function versionTypePriority(versionType: ProjectVersion["version_type"]): number {
  if (versionType === "release") {
    return 0;
  }

  if (versionType === "beta") {
    return 1;
  }

  return 2;
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

    throw new ModrinthInstallError(response.status, message, resetAfter);
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

function parseSlug(value: string | null): string {
  const slug = value?.trim() ?? "";

  if (!slug) {
    throw new ModrinthInstallError(400, "Не указан мод для установки.");
  }

  if (!/^[\w!@$()`.+,"\-']{3,64}$/.test(slug)) {
    throw new ModrinthInstallError(400, "Некорректный slug мода.");
  }

  return slug;
}

function parseVersion(value: string | null): string {
  const version = value?.trim() ?? "";

  if (!version) {
    return "";
  }

  if (!/^[0-9A-Za-z._-]+$/.test(version)) {
    throw new ModrinthInstallError(400, "Некорректная версия Minecraft.");
  }

  return version;
}

function parseLoader(value: string | null): string {
  const loader = value?.trim().toLowerCase() ?? "";

  if (!loader) {
    return "";
  }

  if (!ALLOWED_LOADERS.has(loader)) {
    throw new ModrinthInstallError(400, "Некорректный loader.");
  }

  return loader;
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[\\/:*?"<>|]/g, "_").slice(0, 160) || "mod.jar";
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
