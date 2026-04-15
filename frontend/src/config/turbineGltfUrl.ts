/**
 * Long-term: set `VITE_TURBINE_GLB_URL` to a stable HTTPS URL (S3, R2, Azure Blob, CloudFront, etc.).
 * Same value in dev (`.env`) and in CI/hosting env for production builds.
 *
 * Fallback (no env): `/assets/models/hushanturbine.glb` under `public/` — useful for offline dev only;
 * that path is gitignored for large files, so production should always use the env URL.
 *
 * CORS: production must allow `GET` from your app origin. In **dev**, `http://192.168.x.x:5173` is not
 * the same origin as `localhost` for R2 CORS — we use `/__turbine-glb` (Vite proxy → env URL) so LAN
 * access works without editing bucket CORS.
 */
const fromEnv = (import.meta.env.VITE_TURBINE_GLB_URL as string | undefined)?.trim();
const localFallback = "/assets/models/hushanturbine.glb";

if (import.meta.env.PROD && !fromEnv) {
  console.warn(
    "[turbineGltfUrl] VITE_TURBINE_GLB_URL is unset — using local path; set the env var to your hosted .glb for production."
  );
}

function resolveTurbineGltfUrl(): string {
  if (!fromEnv) return localFallback;
  if (import.meta.env.PROD) return fromEnv;
  if (/^https?:\/\//i.test(fromEnv)) {
    return "/__turbine-glb";
  }
  return fromEnv;
}

export const TURBINE_GLB_URL = resolveTurbineGltfUrl();
