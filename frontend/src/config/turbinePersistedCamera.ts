export type SavedGlbCameraView = {
  position: [number, number, number];
  target: [number, number, number];
};

type StoredPayload = SavedGlbCameraView & { modelUrl?: string; layoutKey?: string };

function isRemoteModelUrl(modelUrl: string): boolean {
  return modelUrl.startsWith("http://") || modelUrl.startsWith("https://");
}

/**
 * Per-URL key so a camera saved for one .glb (e.g. placeholder) is not reused for another (e.g. R2).
 */
export function turbineViewStorageKey(baseKey: string, modelUrl: string): string {
  let h = 0;
  for (let i = 0; i < modelUrl.length; i += 1) {
    h = (Math.imul(31, h) + modelUrl.charCodeAt(i)) | 0;
  }
  return `${baseKey}:${(h >>> 0).toString(16)}`;
}

function parseStored(
  raw: string,
  modelUrl: string,
  allowLegacyWithoutModelUrl: boolean,
  layoutKey?: string
): SavedGlbCameraView | null {
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object") return null;
    const rec = o as Record<string, unknown>;
    const p = rec.position;
    const t = rec.target;
    const storedUrl = rec.modelUrl;
    const storedLayout = rec.layoutKey;
    if (!Array.isArray(p) || !Array.isArray(t) || p.length !== 3 || t.length !== 3) {
      return null;
    }
    if (typeof storedUrl === "string" && storedUrl !== modelUrl) {
      return null;
    }
    if (storedUrl === undefined && !allowLegacyWithoutModelUrl) {
      return null;
    }
    if (layoutKey != null && layoutKey !== "") {
      if (typeof storedLayout !== "string" || storedLayout !== layoutKey) {
        return null;
      }
    }
    const position: [number, number, number] = [Number(p[0]), Number(p[1]), Number(p[2])];
    const target: [number, number, number] = [Number(t[0]), Number(t[1]), Number(t[2])];
    if (position.some((n) => !Number.isFinite(n)) || target.some((n) => !Number.isFinite(n))) {
      return null;
    }
    return { position, target };
  } catch {
    return null;
  }
}

/**
 * Reads composite key first, then legacy base key. Migrates legacy → composite when used.
 * For remote `modelUrl`, ignores legacy JSON without `modelUrl` (avoids placeholder camera on real asset).
 */
export function readTurbinePersistedView(
  baseKey: string | undefined,
  modelUrl: string,
  layoutKey?: string
): SavedGlbCameraView | null {
  if (typeof window === "undefined" || !baseKey) return null;

  const compositeKey = turbineViewStorageKey(baseKey, modelUrl);
  const allowLegacy = !isRemoteModelUrl(modelUrl);

  const compositeRaw = localStorage.getItem(compositeKey);
  if (compositeRaw) {
    const v = parseStored(compositeRaw, modelUrl, false, layoutKey);
    if (v) return v;
  }

  const legacyRaw = localStorage.getItem(baseKey);
  if (!legacyRaw) return null;
  const v = parseStored(legacyRaw, modelUrl, allowLegacy, layoutKey);
  if (!v) return null;

  writeTurbinePersistedView(baseKey, modelUrl, v, layoutKey);
  return v;
}

export function writeTurbinePersistedView(
  baseKey: string | undefined,
  modelUrl: string,
  view: SavedGlbCameraView,
  layoutKey?: string
): void {
  if (typeof window === "undefined" || !baseKey) return;
  try {
    const payload: StoredPayload = { ...view, modelUrl };
    if (layoutKey != null && layoutKey !== "") {
      payload.layoutKey = layoutKey;
    }
    const compositeKey = turbineViewStorageKey(baseKey, modelUrl);
    localStorage.setItem(compositeKey, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}
