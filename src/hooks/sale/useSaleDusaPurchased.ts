import { useMemo, useCallback } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Contract } from 'ethers';
import SaleContractABI from 'abis/SaleContract.json';
import {
  SALE_SC_ADDRESSES_Ethereum,
  DUSA_LOCKED_TOKENS_MASSA
} from 'utils/configSale';
import { fetchTokenBalance } from 'utils/datastoreFetcher';
import useWeb3 from './useWeb3';

export type SaleResult = {
  name: string;
  amount: bigint;
  chain: 'Ethereum' | 'Massa';
};

const SALE_NAMES = ['Seed', 'Public 1', 'Public 2'];

const useSaleDusaPurchased = (userAddress?: string) => {
  const { account, signer, readOnlyProvider } = useWeb3();
  const provider = signer ?? readOnlyProvider;

  const ethereumSales = Object.values(SALE_SC_ADDRESSES_Ethereum);
  const massaTokens = Object.values(DUSA_LOCKED_TOKENS_MASSA);

  const queries = useQueries({
    queries: [
      ...ethereumSales.map((addr) => ({
        queryKey: ['dusaPurchased', 'Ethereum', addr, account],
        queryFn: async (): Promise<bigint> => {
          const contract = new Contract(addr, SaleContractABI, provider);
          return (await contract.balanceOf(account)) as bigint;
        },
        enabled: !!provider && !!account,
        refetchInterval: 10_000
      })),
      ...massaTokens.map((tokenAddr) => ({
        queryKey: ['dusaPurchased', 'Massa', tokenAddr, userAddress],
        queryFn: (): Promise<bigint> =>
          fetchTokenBalance(
            tokenAddr,
            userAddress ?? '',
            true
          ) as Promise<bigint>,
        enabled: !!userAddress,
        refetchInterval: 10_000
      }))
    ]
  });

  const isLoading = queries.some((q) => q.isLoading && q.isFetching);

  const rawData = queries.map((q) => q.data ?? 0n);

  const dusaPurchased = useMemo<SaleResult[] | undefined>(() => {
    if (isLoading) return undefined;

    const results: SaleResult[] = [];

    ethereumSales.forEach((_, i) => {
      results.push({
        name: SALE_NAMES[i] ?? `Sale ${i}`,
        amount: rawData[i],
        chain: 'Ethereum'
      });
    });

    massaTokens.forEach((_, i) => {
      results.push({
        name: SALE_NAMES[i] ?? `Sale ${i}`,
        amount: rawData[ethereumSales.length + i],
        chain: 'Massa'
      });
    });

    return results;
  }, [isLoading, ...rawData]);

  const refetchDusaPurchased = useCallback(() => {
    queries.forEach((q) => q.refetch());
  }, [queries]);

  return {
    dusaPurchased,
    isLoading,
    refetchDusaPurchased
  };
};

export default useSaleDusaPurchased;
