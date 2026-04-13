/**
 * Turbine GLB source: set `VITE_TURBINE_GLB_URL` to an HTTPS object URL (S3, R2, etc.),
 * or leave unset to use the file under `public/`.
 * The bucket must allow CORS GET from your app origin.
 */
export const TURBINE_GLB_URL =
  (import.meta.env.VITE_TURBINE_GLB_URL as string | undefined)?.trim() ||
  "/assets/models/hushanturbine.glb";
