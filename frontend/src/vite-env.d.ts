/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional absolute API base for split frontend/backend deploys (e.g. https://api.tudominio.com/api) */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
