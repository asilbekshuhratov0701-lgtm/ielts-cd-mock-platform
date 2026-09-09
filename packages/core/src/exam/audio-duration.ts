const MIN_PLAUSIBLE_SEC = 5;
const MAX_PLAUSIBLE_SEC = 4 * 60 * 60;

const MPEG_VERSION = { V25: 0, RESERVED: 1, V2: 2, V1: 3 } as const;

const BITRATES_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const BITRATES_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];

const SAMPLE_RATES: Record<number, number[]> = {
  [MPEG_VERSION.V1]: [44100, 48000, 32000],
  [MPEG_VERSION.V2]: [22050, 24000, 16000],
  [MPEG_VERSION.V25]: [11025, 12000, 8000]
};

interface Mp3Frame {
  version: number;
  sampleRate: number;
  bitrateKbps: number;
  samplesPerFrame: number;
  mono: boolean;
  frameLength: number;
}

function ascii(bytes: Uint8Array, at: number, length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) out += String.fromCharCode(bytes[at + i] ?? 0);
  return out;
}

function parseMp3Frame(bytes: Uint8Array, at: number): Mp3Frame | null {
  if (at + 4 > bytes.length) return null;
  const b1 = bytes[at + 1]!;
  const b2 = bytes[at + 2]!;
  const b3 = bytes[at + 3]!;
  if (bytes[at] !== 0xff || (b1 & 0xe0) !== 0xe0) return null;

  const version = (b1 >> 3) & 0x03;
  if (version === MPEG_VERSION.RESERVED) return null;
  const layer = (b1 >> 1) & 0x03;
  if (layer !== 0x01) return null;

  const bitrateIndex = (b2 >> 4) & 0x0f;
  const sampleIndex = (b2 >> 2) & 0x03;
  if (bitrateIndex === 0 || bitrateIndex === 0x0f || sampleIndex === 0x03) return null;

  const sampleRate = SAMPLE_RATES[version]?.[sampleIndex];
  if (!sampleRate) return null;
  const table = version === MPEG_VERSION.V1 ? BITRATES_V1_L3 : BITRATES_V2_L3;
  const bitrateKbps = table[bitrateIndex]!;
  if (!bitrateKbps) return null;

  const padding = (b2 >> 1) & 0x01;
  const samplesPerFrame = version === MPEG_VERSION.V1 ? 1152 : 576;
  const frameLength =
    Math.floor(((samplesPerFrame / 8) * bitrateKbps * 1000) / sampleRate) + padding;
  if (frameLength < 24) return null;

  return {
    version,
    sampleRate,
    bitrateKbps,
    samplesPerFrame,
    mono: ((b3 >> 6) & 0x03) === 0x03,
    frameLength
  };
}

function id3v2Size(bytes: Uint8Array): number {
  if (bytes.length < 10 || ascii(bytes, 0, 3) !== "ID3") return 0;
  const size =
    ((bytes[6]! & 0x7f) << 21) |
    ((bytes[7]! & 0x7f) << 14) |
    ((bytes[8]! & 0x7f) << 7) |
    (bytes[9]! & 0x7f);
  return 10 + size + ((bytes[5]! & 0x10) !== 0 ? 10 : 0);
}

function vbrFrameCount(bytes: Uint8Array, frameStart: number, frame: Mp3Frame): number | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const xingOffset =
    frame.version === MPEG_VERSION.V1 ? (frame.mono ? 21 : 36) : frame.mono ? 13 : 21;
  const xingAt = frameStart + xingOffset;
  if (xingAt + 12 <= bytes.length) {
    const tag = ascii(bytes, xingAt, 4);
    if (tag === "Xing" || tag === "Info") {
      const flags = view.getUint32(xingAt + 4);
      if ((flags & 0x01) !== 0) {
        const frames = view.getUint32(xingAt + 8);
        if (frames > 0) return frames;
      }
      return null;
    }
  }

  const vbriAt = frameStart + 36;
  if (vbriAt + 26 <= bytes.length && ascii(bytes, vbriAt, 4) === "VBRI") {
    const frames = view.getUint32(vbriAt + 14);
    if (frames > 0) return frames;
  }
  return null;
}

function mp3Duration(bytes: Uint8Array): number | null {
  const start = id3v2Size(bytes);
  const searchEnd = Math.min(bytes.length - 4, start + 1024 * 1024);

  for (let at = start; at <= searchEnd; at += 1) {
    if (bytes[at] !== 0xff || (bytes[at + 1]! & 0xe0) !== 0xe0) continue;
    const frame = parseMp3Frame(bytes, at);
    if (!frame) continue;
    const next = at + frame.frameLength;
    if (next + 4 <= bytes.length && !parseMp3Frame(bytes, next)) continue;

    const frames = vbrFrameCount(bytes, at, frame);
    if (frames) return (frames * frame.samplesPerFrame) / frame.sampleRate;

    const hasId3v1 = bytes.length >= 128 && ascii(bytes, bytes.length - 128, 3) === "TAG" ? 128 : 0;
    const audioBytes = bytes.length - at - hasId3v1;
    if (audioBytes <= 0) return null;
    return (audioBytes * 8) / (frame.bitrateKbps * 1000);
  }
  return null;
}

function findMp4Box(
  bytes: Uint8Array,
  from: number,
  to: number,
  type: string
): { start: number; end: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let at = from;
  while (at + 8 <= to) {
    let size = view.getUint32(at);
    let headerSize = 8;
    if (size === 1) {
      if (at + 16 > to) return null;
      size = Number(view.getBigUint64(at + 8));
      headerSize = 16;
    } else if (size === 0) {
      size = to - at;
    }
    if (size < headerSize || at + size > to) return null;
    if (ascii(bytes, at + 4, 4) === type) return { start: at + headerSize, end: at + size };
    at += size;
  }
  return null;
}

function mp4Duration(bytes: Uint8Array): number | null {
  const moov = findMp4Box(bytes, 0, bytes.length, "moov");
  if (!moov) return null;
  const mvhd = findMp4Box(bytes, moov.start, moov.end, "mvhd");
  if (!mvhd) return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const version = bytes[mvhd.start];
  if (version === 1) {
    if (mvhd.start + 28 > bytes.length) return null;
    const timescale = view.getUint32(mvhd.start + 20);
    const duration = Number(view.getBigUint64(mvhd.start + 24));
    return timescale > 0 ? duration / timescale : null;
  }
  if (mvhd.start + 20 > bytes.length) return null;
  const timescale = view.getUint32(mvhd.start + 12);
  const duration = view.getUint32(mvhd.start + 16);
  return timescale > 0 ? duration / timescale : null;
}

function wavDuration(bytes: Uint8Array): number | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let byteRate = 0;
  let at = 12;
  while (at + 8 <= bytes.length) {
    const id = ascii(bytes, at, 4);
    const size = view.getUint32(at + 4, true);
    if (id === "fmt " && at + 20 <= bytes.length) byteRate = view.getUint32(at + 16, true);
    if (id === "data") {
      const dataSize = Math.min(size, bytes.length - at - 8);
      return byteRate > 0 ? dataSize / byteRate : null;
    }
    at += 8 + size + (size % 2);
  }
  return null;
}

function oggDuration(bytes: Uint8Array): number | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const segments = bytes[26] ?? 0;
  const packetAt = 27 + segments;
  if (packetAt + 16 > bytes.length) return null;

  let sampleRate = 0;
  let preSkip = 0;
  if (ascii(bytes, packetAt, 8) === "OpusHead") {
    sampleRate = 48000;
    preSkip = view.getUint16(packetAt + 10, true);
  } else if (bytes[packetAt] === 0x01 && ascii(bytes, packetAt + 1, 6) === "vorbis") {
    sampleRate = view.getUint32(packetAt + 12, true);
  }
  if (!sampleRate) return null;

  for (let at = bytes.length - 14; at >= 0; at -= 1) {
    if (ascii(bytes, at, 4) !== "OggS") continue;
    const granule = Number(view.getBigUint64(at + 6, true));
    if (granule <= 0) return null;
    return Math.max(0, granule - preSkip) / sampleRate;
  }
  return null;
}

export function plausibleDurationSec(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < MIN_PLAUSIBLE_SEC || rounded > MAX_PLAUSIBLE_SEC) return null;
  return rounded;
}

export function probeAudioDurationSec(bytes: Uint8Array): number | null {
  if (bytes.length < 32) return null;
  try {
    if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WAVE") {
      return plausibleDurationSec(wavDuration(bytes));
    }
    if (ascii(bytes, 0, 4) === "OggS") {
      return plausibleDurationSec(oggDuration(bytes));
    }
    if (ascii(bytes, 4, 4) === "ftyp") {
      return plausibleDurationSec(mp4Duration(bytes));
    }
    return plausibleDurationSec(mp3Duration(bytes));
  } catch {
    return null;
  }
}
