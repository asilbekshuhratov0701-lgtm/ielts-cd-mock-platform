import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface StoredMedia {
  key: string;
  url: string;
}

export async function saveMediaObject(key: string, bytes: Uint8Array): Promise<StoredMedia> {
  const dir = path.join(process.cwd(), "public", "media");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, key), bytes);
  return { key, url: mediaPublicUrl(key) };
}

export function mediaPublicUrl(key: string): string {
  const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");
  return base ? `${base}/${key}` : `/media/${key}`;
}

export function safeKeySegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}
