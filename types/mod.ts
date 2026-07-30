export type ModProject = {
  id: string;
  slug: string;
  title: string;
  description: string;
  author: string;
  iconUrl: string | null;
  downloads: number;
  versions: string[];
  categories: string[];
  projectType: string;
  url: string;
};

export type RouletteFilters = {
  version: string;
  loader: string;
  category: string;
};

export type ModCategory = {
  name: string;
  title: string;
  icon?: string;
};

export type MinecraftGameVersion = {
  version: string;
  versionType: "release" | "snapshot" | "beta" | "alpha";
  date: string;
  major: boolean;
};

export type ModInstallVersion = {
  id: string;
  versionNumber: string;
  name: string;
  versionType: "release" | "beta" | "alpha";
  datePublished: string;
  gameVersions: string[];
  loaders: string[];
  fileName: string;
  fileSize: number;
};

export type ModInstallOptions = {
  slug: string;
  options: ModInstallVersion[];
  error?: string;
};
