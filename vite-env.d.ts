/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SPARK_TOKEN_ADDRESS: string;
  readonly VITE_MINT_CONTROLLER_ADDRESS: string;
  readonly VITE_MEMBERSHIP_MANAGER_ADDRESS: string;
  readonly VITE_REWARD_POOL_ADDRESS: string;
  readonly VITE_USDT_ADDRESS: string;
  readonly VITE_POST_SCORING_AGENT_ADDRESS: string;
  readonly VITE_AGENT_METADATA_URI: string;
  readonly VITE_MIN_PASSING_SCORE: string;
  readonly VITE_SCORING_ENABLED: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
