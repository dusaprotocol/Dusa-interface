/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  VITE_API: string;
  VITE_CHAIN_ID: number;
  VITE_CHAIN_URL: string;
  VITE_DATASTORE_API: string;
  VITE_DISCORD_CLIENT_ID: string;
  VITE_ENABLE_ALL_POINTS_DETAILS: string;
  VITE_ENABLE_AUTONOMOUS: string;
  VITE_ENABLE_CEDESTORE: string;
  VITE_ENABLE_COPY_DISTRIBUTION: string;
  VITE_ENABLE_CREATE_POOL: string;
  VITE_ENABLE_DCA: string;
  VITE_ENABLE_DEGEN_MODE: string;
  VITE_ENABLE_DUSA: string;
  VITE_ENABLE_FAUCET: string;
  VITE_ENABLE_HEADBAND: string;
  VITE_ENABLE_LIMIT: string;
  VITE_ENABLE_PAUSE_SCREEN: string;
  VITE_ENABLE_POINTS: string;
  VITE_ENABLE_POINTS_V2: string;
  VITE_ENABLE_PUBLIC_GOVERNANCE: string;
  VITE_ENABLE_REWARDS: string;
  VITE_ENABLE_SALE: string;
  VITE_ENABLE_SENTRY: string;
  VITE_ENABLE_STREAK: string;
  VITE_ENABLE_TOKEN_PLEDGE: string;
  VITE_ENABLE_TXS_FROM_DB: string;
  VITE_NETWORK_NAME: string;
  VITE_ENABLE_CORE_V2: string;
  VITE_DISABLE_V1_DEPOSIT: string;
  VITE_ENABLE_FLOOR: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
