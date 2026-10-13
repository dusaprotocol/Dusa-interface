import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Contract } from 'ethers';
import SaleContractABI from 'abis/SaleContract.json';
import {
  SALE_SC_ADDRESSES_Ethereum,
  SALE_TOKEN_SC_ADDRESSES_MASSA
} from 'utils/configSale';
import { fetchTokenBalance } from 'utils/datastoreFetcher';
import { DAI } from 'utils/tokens';
import useWeb3 from './useWeb3';

const useSalesContracts = () => {
  const { signer, readOnlyProvider } = useWeb3();
  const provider = signer ?? readOnlyProvider;

  const EthereumSales = Object.values(SALE_SC_ADDRESSES_Ethereum);
  const EthereumQueries = useQueries({
    queries: EthereumSales.flatMap((addr) => ({
      queryKey: ['dusaBalanceRemaining', addr],
      queryFn: async () => {
        const contract = new Contract(addr, SaleContractABI, provider);
        return (await contract.balanceOf(addr)) as bigint;
      },
      enabled: !!provider,
      refetchInterval: 10_000
    }))
  });

  const massaSales = Object.values(SALE_TOKEN_SC_ADDRESSES_MASSA);
  const massaQueries = useQueries({
    queries: massaSales.flatMap((sale) => {
      const qs = [
        {
          queryKey: ['massaBalance', sale.USDC],
          queryFn: () => fetchTokenBalance(DAI.address, sale.USDC, true),
          refetchInterval: 10_000
        }
      ];
      if ('MAS' in sale) {
        qs.push({
          queryKey: ['massaBalance', sale.MAS!],
          queryFn: () => fetchTokenBalance(DAI.address, sale.MAS!, true),
          refetchInterval: 10_000
        });
      }
      return qs;
    })
  });

  const allQueries = [...EthereumQueries, ...massaQueries];
  const anyLoading = allQueries.some((q) => q.isLoading);
  const allData = allQueries.map((q) => q.data ?? 0n);

  const sum_sales_dusa_remaining = useMemo<bigint | undefined>(() => {
    if (anyLoading) return undefined;
    return allData.reduce((acc, curr) => acc + curr, 0n);
  }, [anyLoading, ...allData]);

  return {
    sum_sales_dusa_remaining,
    isLoading: anyLoading
  };
};

export default useSalesContracts;
