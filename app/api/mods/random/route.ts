import { NextRequest, NextResponse } from "next/server";
import type { ModProject } from "@/types/mod";

export const dynamic = "force-dynamic";

const MODRINTH_API = "https://api.modrinth.com/v2";
const USER_AGENT =
  process.env.MODRINTH_USER_AGENT ??
  "RandomModRoulette/1.0.0 (contact: example@example.com)";
const ALLOWED_LOADERS = new Set(["fabric", "forge", "neoforge", "quilt"]);
const SEARCH_INDEXES = ["downloads", "follows", "newest", "updated"] as const;

type SearchIndex = (typeof SEARCH_INDEXES)[number];

type ModrinthProject = {
  id?: string;
  project_id?: string;
  slug?: string;
  title?: string;
  description?: string;
  author?: string;
  project_type?: string;
  icon_url?: string | null;
  downloads?: number;
  versions?: string[];
  game_versions?: string[];
  categories?: string[];
  display_categories?: string[];
  loaders?: string[];
  team?: string;
  organization?: string | { name?: string } | null;
};

type SearchResponse = {
  hits: ModrinthProject[];
  total_hits: number;
  offset: number;
  limit: number;
};

type TeamMember = {
  team_id?: string;
  role?: string;
  ordering?: number;
  user?: {
    username?: string;
    name?: string | null;
  };
};

class ModrinthError extends Error {
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
    const count = parseCount(searchParams.get("count"));
    const version = parseVersion(searchParams.get("version"));
    const loader = parseLoader(searchParams.get("loader"));
    const category = parseCategory(searchParams.get("category"));
    const hasFilters = Boolean(version || loader || category);

    const rawProjects = hasFilters
      ? await getSearchProjects({ count, version, loader, category })
      : await getRandomProjects(count);

    if (rawProjects.length === 0) {
      return jsonError("Под эти фильтры не нашлось модов. Попробуйте другой набор.", 404);
    }

    const authorByTeam = await getAuthorMap(rawProjects);
    const mods = normalizeProjects(rawProjects, authorByTeam).slice(0, count);

    if (mods.length === 0) {
      return jsonError("Modrinth вернул проекты, но среди них не было Minecraft-модов.", 404);
    }

    return NextResponse.json(
      {
        mods,
        count: mods.length
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    if (error instanceof ModrinthError) {
      if (error.status === 429) {
        const suffix = error.resetAfter ? ` Повторите через ${error.resetAfter} сек.` : "";
        return jsonError(`Modrinth временно ограничил запросы.${suffix}`, 429);
      }

      return jsonError(error.message, error.status >= 400 ? error.status : 502);
    }

    return jsonError("Не удалось связаться с Modrinth. Проверьте сеть и попробуйте снова.", 502);
  }
}

async function getRandomProjects(count: number): Promise<ModrinthProject[]> {
  const projects = new Map<string, ModrinthProject>();
  const requestCount = Math.min(100, Math.max(30, count * 2));

  for (let attempt = 0; attempt < 3 && projects.size < count; attempt += 1) {
    const response = await modrinthFetch<ModrinthProject[] | ModrinthProject>(
      `/projects_random?count=${requestCount}`
    );
    const candidates = Array.isArray(response) ? response : [response];

    for (const project of candidates) {
      if (project.project_type === "mod") {
        const id = project.id ?? project.project_id ?? project.slug;
        if (id) {
          projects.set(id, project);
        }
      }
    }
  }

  if (projects.size < count) {
    const fallback = await getSearchProjects({ count, version: "", loader: "", category: "" });

    for (const project of fallback) {
      const id = project.id ?? project.project_id ?? project.slug;
      if (id) {
        projects.set(id, project);
      }
    }
  }

  return [...projects.values()].slice(0, count);
}

async function getSearchProjects({
  count,
  version,
  loader,
  category
}: {
  count: number;
  version: string;
  loader: string;
  category: string;
}): Promise<ModrinthProject[]> {
  const facets = buildFacets(version, loader, category);
  const firstPage = await fetchSearch({ facets, limit: 1, offset: 0 });

  if (firstPage.total_hits === 0) {
    return [];
  }

  const limit = Math.min(100, Math.max(count, 30, Math.min(firstPage.total_hits, count * 2)));
  const maxOffset = Math.max(0, firstPage.total_hits - limit);
  const offset = maxOffset > 0 ? Math.floor(Math.random() * (maxOffset + 1)) : 0;
  const index = SEARCH_INDEXES[Math.floor(Math.random() * SEARCH_INDEXES.length)];
  const page = await fetchSearch({ facets, limit, offset, index });

  return page.hits.filter((project) => project.project_type === "mod").slice(0, count);
}

async function fetchSearch({
  facets,
  limit,
  offset,
  index
}: {
  facets: string[][];
  limit: number;
  offset: number;
  index?: SearchIndex;
}): Promise<SearchResponse> {
  const params = new URLSearchParams({
    facets: JSON.stringify(facets),
    limit: String(limit),
    offset: String(offset)
  });

  if (index) {
    params.set("index", index);
  }

  return modrinthFetch<SearchResponse>(`/search?${params.toString()}`);
}

function buildFacets(version: string, loader: string, category: string): string[][] {
  const facets = [["project_type:mod"]];

  if (version) {
    facets.push([`versions:${version}`]);
  }

  if (loader) {
    facets.push([`categories:${loader}`]);
  }

  if (category) {
    facets.push([`categories:${category}`]);
  }

  return facets;
}

async function getAuthorMap(projects: ModrinthProject[]): Promise<Map<string, string>> {
  const teamIds = [
    ...new Set(
      projects
        .filter((project) => !project.author && project.team)
        .map((project) => project.team as string)
    )
  ];

  if (teamIds.length === 0) {
    return new Map();
  }

  try {
    const params = new URLSearchParams({
      ids: JSON.stringify(teamIds)
    });
    const teams = await modrinthFetch<TeamMember[][]>(`/teams?${params.toString()}`);
    const authorByTeam = new Map<string, string>();

    for (const members of teams) {
      const sortedMembers = [...members].sort(
        (a, b) => (a.ordering ?? Number.MAX_SAFE_INTEGER) - (b.ordering ?? Number.MAX_SAFE_INTEGER)
      );
      const owner =
        sortedMembers.find((member) => member.role?.toLowerCase() === "owner") ?? sortedMembers[0];
      const username = owner?.user?.username ?? owner?.user?.name ?? "";

      if (owner?.team_id && username) {
        authorByTeam.set(owner.team_id, username);
      }
    }

    return authorByTeam;
  } catch {
    return new Map();
  }
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

    throw new ModrinthError(response.status, message, resetAfter);
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

function normalizeProjects(
  projects: ModrinthProject[],
  authorByTeam: Map<string, string>
): ModProject[] {
  const normalized = new Map<string, ModProject>();

  for (const project of projects) {
    const mod = normalizeProject(project, authorByTeam);

    if (mod) {
      normalized.set(mod.id, mod);
    }
  }

  return [...normalized.values()];
}

function normalizeProject(
  project: ModrinthProject,
  authorByTeam: Map<string, string>
): ModProject | null {
  if (project.project_type !== "mod") {
    return null;
  }

  const id = project.id ?? project.project_id;
  const slug = project.slug;

  if (!id || !slug) {
    return null;
  }

  const categories = unique([
    ...(project.loaders ?? []),
    ...(project.display_categories ?? []),
    ...(project.categories ?? [])
  ]);
  const versions = project.game_versions ?? project.versions ?? [];
  const organizationName =
    typeof project.organization === "string" ? project.organization : project.organization?.name;
  const author =
    project.author ??
    (project.team ? authorByTeam.get(project.team) : undefined) ??
    organizationName ??
    "Unknown creator";

  return {
    id,
    slug,
    title: project.title?.trim() || "Без названия",
    description: project.description?.trim() || "Описание не указано.",
    author,
    iconUrl: project.icon_url ?? null,
    downloads: Number.isFinite(project.downloads) ? Number(project.downloads) : 0,
    versions: versions.filter(Boolean),
    categories,
    projectType: "mod",
    url: `https://modrinth.com/mod/${slug}`
  };
}

function unique(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function parseCount(value: string | null): number {
  const parsed = Number(value ?? 30);

  if (!Number.isFinite(parsed)) {
    return 30;
  }

  return Math.min(60, Math.max(1, Math.floor(parsed)));
}

function parseVersion(value: string | null): string {
  const version = value?.trim() ?? "";

  if (!version) {
    return "";
  }

  if (!/^[0-9A-Za-z._-]+$/.test(version)) {
    throw new ModrinthError(400, "Некорректная версия Minecraft.");
  }

  return version;
}

function parseLoader(value: string | null): string {
  const loader = value?.trim().toLowerCase() ?? "";

  if (!loader) {
    return "";
  }

  if (!ALLOWED_LOADERS.has(loader)) {
    throw new ModrinthError(400, "Некорректный loader. Выберите Fabric, Forge, NeoForge или Quilt.");
  }

  return loader;
}

function parseCategory(value: string | null): string {
  const category = value?.trim().toLowerCase() ?? "";

  if (!category) {
    return "";
  }

  if (!/^[a-z0-9-]{2,48}$/.test(category)) {
    throw new ModrinthError(400, "Некорректная категория Modrinth.");
  }

  return category;
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
