import { mkdir, writeFile } from "node:fs/promises";
import { createHash, createHmac } from "node:crypto";
import path from "node:path";

export interface StoredMedia {
  key: string;
  url: string;
}

const CONTENT_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  mpeg: "audio/mpeg",
  mpga: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  webm: "audio/webm",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  pdf: "application/pdf"
};

function contentTypeFor(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

function r2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

function hmac(key: string | Buffer, value: string): Buffer {
  return createHmac("sha256", key).update(value).digest();
}

function sha256hex(data: Uint8Array | string): string {
  return createHash("sha256").update(data).digest("hex");
}

function encodeKeyPath(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

async function putToR2(cfg: R2Config, key: string, body: Uint8Array): Promise<void> {
  const region = "auto";
  const service = "s3";
  const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${cfg.bucket}/${encodeKeyPath(key)}`;

  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256hex(body);

  const canonicalHeaders =
    `host:${host}\n` + `x-amz-content-sha256:${payloadHash}\n` + `x-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join("\n");

  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256hex(canonicalRequest)
  ].join("\n");

  const kDate = hmac(`AWS4${cfg.secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${host}${canonicalUri}`, {
    method: "PUT",
    headers: {
      Authorization: authorization,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      "content-type": contentTypeFor(key)
    },
    body: new Blob([body as BlobPart])
  });

  if (!res.ok) {
    throw new Error(`R2 upload failed (${res.status}): ${await res.text()}`);
  }
}

async function saveToLocalDisk(key: string, bytes: Uint8Array): Promise<void> {
  const dir = path.join(process.cwd(), "public", "media");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, key), bytes);
}

export async function saveMediaObject(key: string, bytes: Uint8Array): Promise<StoredMedia> {
  const cfg = r2Config();
  if (cfg) {
    await putToR2(cfg, key, bytes);
  } else {
    await saveToLocalDisk(key, bytes);
  }
  return { key, url: mediaPublicUrl(key) };
}

export function mediaPublicUrl(key: string): string {
  const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");
  return base ? `${base}/${key}` : `/media/${key}`;
}

export function safeKeySegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}
