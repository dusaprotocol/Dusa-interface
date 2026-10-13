import { autopoolConfigs } from 'utils/constants';
import { getWmasIfMas } from 'utils/coreMethods';
import {
  fetchAllTokensBalance,
  fetchPoolAddress,
  fetchStratSC,
  fetchTokenBalance,
  fetchTokenTotalSupply,
  fetchUserLiquidityBins,
  fetchVaultSC
} from 'utils/datastoreFetcher';
import { sumBinAmounts, sumVaults } from 'utils/methods';
import { Pool, pools } from 'utils/pools';
import { Bin, Token } from 'utils/types';

interface UseFetchALProps {
  token0: Token | undefined;
  token1: Token | undefined;
  binStep: number;
  userAddress: string;
}

const fetchUserALBins = async (
  pool: Pool,
  vault: string,
  userAddress: string
) => {
  const { token0, token1, binStep } = pool;

  const totalSupply = await fetchTokenTotalSupply(vault);
  const ownTokenBalance = await fetchTokenBalance(vault, userAddress);
  if (!ownTokenBalance) return [];

  const stratSC = await fetchStratSC(vault);
  const pairAddress = await fetchPoolAddress(pool);
  const stratLiquidity = await fetchUserLiquidityBins(
    stratSC,
    pairAddress,
    token0,
    token1,
    binStep
  );

  const [reserve0, reserve1] = await fetchAllTokensBalance(
    [token0.address, token1.address],
    stratSC
  );

  const bins: Bin[] = stratLiquidity.map((bin) => {
    const shareAmount0 =
      ((bin.amount0 + reserve0 / 10n) * ownTokenBalance) / totalSupply; // amount0 * shareRatio -> shareRatio = ownTokenBalance / totalSupply
    const shareAmount1 =
      ((bin.amount1 + reserve1 / 10n) * ownTokenBalance) / totalSupply; // amount1 * shareRatio -> shareRatio = ownTokenBalance / totalSupply
    return {
      ...bin,
      amount0: bin.amount0 !== 0n ? shareAmount0 : 0n,
      amount1: bin.amount1 !== 0n ? shareAmount1 : 0n
    };
  });

  return bins;
};

export const fetchAL = async ({
  token0,
  token1,
  binStep,
  userAddress
}: UseFetchALProps) => {
  if (!token0 || !token1) throw new Error('Tokens not found');

  const t0 = getWmasIfMas(token0);
  const t1 = getWmasIfMas(token1);
  const vaultsPromises = Promise.allSettled(
    autopoolConfigs.map(async (type) => {
      const address = await fetchVaultSC(t0.address, t1.address, type);
      const bins = await fetchUserALBins(
        { token0: t0, token1: t1, binStep },
        address,
        userAddress
      );
      if (!bins.length) return;
      return { address, bins, type };
    })
  );

  const vaults = (await vaultsPromises).filter(
    (promise) => promise.status === 'fulfilled' && promise.value
  ) as PromiseFulfilledResult<{
    address: string;
    bins: Bin[];
    type: number;
  }>[];

  return vaults.map((promise) => promise.value);
};

export const fetchALBatch = async (userAddress: string) =>
  Promise.all(
    pools.map(async (pool) => {
      const vaults = await fetchAL({ ...pool, userAddress });
      const { amount0, amount1 } = sumBinAmounts(sumVaults(vaults));
      return { ...pool, amount0, amount1, fees0: 0n, fees1: 0n };
    })
  );
