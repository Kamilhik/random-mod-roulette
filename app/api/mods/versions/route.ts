import { NextRequest, NextResponse } from "next/server";
import type { ModInstallOptions, ModInstallVersion } from "@/types/mod";

export const dynamic = "force-dynamic";

const MODRINTH_API = "https://api.modrinth.com/v2";
const USER_AGENT =
  process.env.MODRINTH_USER_AGENT ??
  "RandomModRoulette/1.0.0 (contact: example@example.com)";
const MAX_PACK_MODS = 24;
const BLOCKED_FILE_TYPES = new Set([
  "required-resource-pack",
  "optional-resource-pack",
  "sources-jar",
  "dev-jar",
  "javadoc-jar",
  "signature"
]);

type VersionFile = {
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

export async function GET(request: NextRequest) {
  const slugs = parseSlugs(request.nextUrl.searchParams.get("slugs"));

  if (slugs.length === 0) {
    return jsonError("Не указаны моды для загрузки версий.", 400);
  }

  const results = await Promise.all(slugs.map(loadInstallOptions));

  return NextResponse.json(
    {
      mods: results
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}

async function loadInstallOptions(slug: string): Promise<ModInstallOptions> {
  try {
    const encodedSlug = encodeURIComponent(slug);
    const versions = await modrinthFetch<ProjectVersion[]>(
      `/project/${encodedSlug}/version?include_changelog=false`
    );

    return {
      slug,
      options: versions
        .filter((version) => version.status === "listed" || version.status === "archived")
        .map(toInstallVersion)
        .filter((version): version is ModInstallVersion => Boolean(version))
        .sort(sortInstallVersions)
    };
  } catch {
    return {
      slug,
      options: [],
      error: "Не удалось загрузить версии этого мода."
    };
  }
}

function toInstallVersion(version: ProjectVersion): ModInstallVersion | null {
  const file =
    version.files.find((candidate) => candidate.primary && isInstallableFile(candidate)) ??
    version.files.find(isInstallableFile);

  if (!file) {
    return null;
  }

  return {
    id: version.id,
    versionNumber: version.version_number,
    name: version.name,
    versionType: version.version_type,
    datePublished: version.date_published,
    gameVersions: version.game_versions,
    loaders: version.loaders,
    fileName: file.filename,
    fileSize: file.size
  };
}

function sortInstallVersions(a: ModInstallVersion, b: ModInstallVersion): number {
  const typeDelta = versionTypePriority(a.versionType) - versionTypePriority(b.versionType);

  if (typeDelta !== 0) {
    return typeDelta;
  }

  return new Date(b.datePublished).getTime() - new Date(a.datePublished).getTime();
}

function versionTypePriority(versionType: ModInstallVersion["versionType"]): number {
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
    throw new Error(`Modrinth API returned ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function parseSlugs(value: string | null): string[] {
  return [
    ...new Set(
      (value ?? "")
        .split(",")
        .map((slug) => slug.trim())
        .filter((slug) => /^[\w!@$()`.+,"\-']{3,64}$/.test(slug))
    )
  ].slice(0, MAX_PACK_MODS);
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
