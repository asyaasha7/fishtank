/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KATANA_RPC: string
  readonly VITE_KATANA_CHAIN_ID: string
  readonly VITE_FISHTANK_ADDR: string
  readonly VITE_ETHERSCAN_API_KEY: string
  readonly VITE_CDP_ENABLED: string
  readonly VITE_X402_NETWORK: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
