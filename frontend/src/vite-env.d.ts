/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TURBINE_GLB_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
