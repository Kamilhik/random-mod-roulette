import { NextResponse } from "next/server";
import type { MinecraftGameVersion } from "@/types/mod";

export const dynamic = "force-dynamic";

const MODRINTH_API = "https://api.modrinth.com/v2";
const USER_AGENT =
  process.env.MODRINTH_USER_AGENT ??
  "RandomModRoulette/1.0.0 (contact: example@example.com)";

type ModrinthGameVersion = {
  version: string;
  version_type: "release" | "snapshot" | "beta" | "alpha";
  date: string;
  major: boolean;
};

export async function GET() {
  try {
    const response = await fetch(`${MODRINTH_API}/tag/game_version`, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return jsonError("Не удалось загрузить версии Minecraft с Modrinth.", response.status);
    }

    const versions = ((await response.json()) as ModrinthGameVersion[]).map<MinecraftGameVersion>(
      (version) => ({
        version: version.version,
        versionType: version.version_type,
        date: version.date,
        major: version.major
      })
    );

    return NextResponse.json(
      {
        versions
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch {
    return jsonError("Не удалось связаться с Modrinth для загрузки версий Minecraft.", 502);
  }
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
