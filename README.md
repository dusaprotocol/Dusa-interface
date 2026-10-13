# Dusa Interface

Web interface for [Dusa Protocol](https://app.dusa.io), the Liquidity Book DEX on [Massa](https://massa.net).

## Features

- **Trade**: swaps, limit orders and DCA, with TradingView charts
- **Pools**: liquidity provision on Liquidity Book pools (V1 and V2), pool creation
- **Portfolio**: balances, positions and history
- **veDUSA**: lock DUSA, vote for pools, bribes and incentives
- **Governance**: proposals and voting
- **Vester**, **Floor tokens**, **Faucet** (buildnet) and an embeddable **swap widget**

## Stack

- React 18, TypeScript, Vite
- [`@dusalabs/sdk`](https://www.npmjs.com/package/@dusalabs/sdk) and [`@massalabs/massa-web3`](https://www.npmjs.com/package/@massalabs/massa-web3)
- [`@massalabs/wallet-provider`](https://www.npmjs.com/package/@massalabs/wallet-provider) (Massa Station, Bearby, ...)
- tRPC + TanStack Query for the Dusa backend API
- Sass, Tailwind CSS

## Getting started

Requirements: Node.js 20+ and [pnpm](https://pnpm.io).

```bash
cp .env.example .env   # then fill in the values (see below)
pnpm install
pnpm dev               # http://localhost:3000
```

Other scripts:

| Command                                  | Description                                       |
| ---------------------------------------- | ------------------------------------------------- |
| `pnpm dev:buildnet` / `pnpm dev:mainnet` | Dev server using `.env.buildnet` / `.env.mainnet` |
| `pnpm build`                             | Production build into `dist/`                     |
| `pnpm preview`                           | Serve the production build locally                |
| `pnpm test`                              | Unit tests (Vitest)                               |
| `pnpm lint`                              | ESLint                                            |

## Configuration

All configuration is read from `VITE_*` environment variables (see [`.env.example`](.env.example)).
Every `VITE_*` value is bundled into the client, so **never put a secret in them**.

| Variable                           | Description                               |
| ---------------------------------- | ----------------------------------------- |
| `VITE_CHAIN_ID`                    | `0` = buildnet, `1` = mainnet             |
| `VITE_NETWORK_NAME`                | `buildnet` or `mainnet`                   |
| `VITE_CHAIN_URL`                   | Massa JSON-RPC endpoint                   |
| `VITE_GRPC_URL`                    | Massa gRPC endpoint                       |
| `VITE_API` / `VITE_API_BACKUP`     | Dusa backend tRPC endpoint (and fallback) |
| `VITE_DATASTORE_API`               | Dusa indexer endpoint                     |
| `VITE_DUSA_NODE_URL`               | Dusa Massa node                           |
| `VITE_DISCORD_CLIENT_ID`           | Discord application ID (Discord login)    |
| `VITE_ENABLE_*` / `VITE_DISABLE_*` | Feature flags                             |

## TradingView charts

Charts use the [TradingView Advanced Charts](https://www.tradingview.com/advanced-charts/) library, which is
licensed by TradingView and is **not** included in this repository.

On `pnpm install`, `scripts/install_tradingview.sh` (or `.bat` on Windows) fetches the library when
`GH_ACCESS_TOKEN` grants access to a repository containing it, and copies it into `src/charting_library`
and `public/` (both git-ignored). Without the token the step is skipped and the app runs without charts.
To use your own copy, request access from TradingView and place the `charting_library` and `datafeeds`
folders in those locations.

## Deployment

The app is a static site: deploy the content of `dist/` behind an SPA fallback to `index.html`.
[`netlify.toml`](netlify.toml) contains the redirect and security headers used in production.

## License

[MIT](LICENSE). Third-party libraries keep their own licenses; the TradingView library is excluded.
