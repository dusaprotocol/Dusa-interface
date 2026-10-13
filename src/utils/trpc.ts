// import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import { inferProcedureOutput } from '@trpc/server';
// import { api } from './config';
import type { AppRouter } from '../../../backend/api/src/trpc';

// react-query keys
export const queryKeys = {
  pairAddress: 'pairAddress',
  totalSupply: 'totalSupply',
  tokensSorted: 'tokensSorted',
  feeParameters: 'feeParameters',
  // pairInformation: 'pairInformation'
  pairInformation: (address: string | undefined) => ['pairInformation', address]
} as const;
type QueryKeys = typeof queryKeys;
export type QueryKey = QueryKeys[keyof QueryKeys];

export const trpc = createTRPCReact<AppRouter>();
// export const trpcClient = createTRPCProxyClient<AppRouter>({
//   links: [
//     httpBatchLink({
//       url: api
//     })
//   ]
// });

export type Price = inferProcedureOutput<AppRouter['getPrice']>[number];
export type dCA = NonNullable<
  inferProcedureOutput<AppRouter['getDCAs']>
>[number];
export type Order = NonNullable<
  inferProcedureOutput<AppRouter['getOrders']>
>[number];
export type OrderExecution = Order;
export type LeaderboardItem = inferProcedureOutput<
  AppRouter['getLeaderboard']
>[number];
export type GlobalLeaderboardItemDetails = inferProcedureOutput<
  AppRouter['getGlobalLeaderboardUserDetails']
>[number];
export type TradedBin = inferProcedureOutput<
  AppRouter['getBinsTraded']
>[number];
export type Reward = NonNullable<
  inferProcedureOutput<AppRouter['getRewardPool']>
>;
export type RewardDetails = inferProcedureOutput<
  AppRouter['getUserRewardsDetails']
>[number];
export type DiscordId = inferProcedureOutput<AppRouter['getDiscordId']>;
export type DiscordUser = inferProcedureOutput<AppRouter['getDiscordUser']>;
export type Token = inferProcedureOutput<AppRouter['getToken']>;
export type Swap = inferProcedureOutput<AppRouter['getRecentSwaps']>[number];
export type Liquidity = inferProcedureOutput<
  AppRouter['getRecentLiquidity']
>[number];
