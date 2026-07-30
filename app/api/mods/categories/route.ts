import { NextResponse } from "next/server";
import type { ModCategory } from "@/types/mod";

export const dynamic = "force-dynamic";

const MODRINTH_API = "https://api.modrinth.com/v2";
const USER_AGENT =
  process.env.MODRINTH_USER_AGENT ??
  "RandomModRoulette/1.0.0 (contact: example@example.com)";

type ModrinthCategory = {
  name: string;
  project_type: string;
  header: string;
  icon?: string;
};

export async function GET() {
  try {
    const response = await fetch(`${MODRINTH_API}/tag/category`, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return jsonError("Не удалось загрузить категории Modrinth.", response.status);
    }

    const categories = ((await response.json()) as ModrinthCategory[])
      .filter((category) => category.project_type === "mod" && category.header === "categories")
      .map<ModCategory>((category) => ({
        name: category.name,
        title: titleCase(category.name),
        icon: category.icon
      }))
      .sort((a, b) => a.title.localeCompare(b.title));

    return NextResponse.json(
      {
        categories
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch {
    return jsonError("Не удалось связаться с Modrinth для загрузки категорий.", 502);
  }
}

function titleCase(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
