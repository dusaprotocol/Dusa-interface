import { createElement, useMemo, useState } from 'react';
import {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
  useQuery
} from '@tanstack/react-query';
import { Contract, parseUnits } from 'ethers';
import { toast } from 'react-toastify';
import SaleContractABI from 'abis/SaleContract.json';
import TxToast from 'components/TxToast';
import { printBigintIsh } from 'utils/methods';
import { DUSA_LOCKED_SEED, USDC } from 'utils/tokens';
import useWeb3 from './useWeb3';

const useSaleContract = (
  saleContract: string,
  amount?: number,
  setAmount?: (amount?: number) => void,
  refetchAllowance?: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<bigint | undefined, unknown>>
) => {
  const { account, signer, readOnlyProvider } = useWeb3();
  const [pendingInvest, setPendingInvest] = useState(false);

  const ethProvider = signer ?? readOnlyProvider;

  const contract = useMemo(() => {
    return new Contract(saleContract, SaleContractABI, ethProvider);
  }, [saleContract, ethProvider]);

  const tokenPriceQuery = useQuery(
    ['tokenPrice', contract],
    () => contract.tokenPrice(),
    { enabled: !!contract }
  );
  const tokenPrice: bigint = tokenPriceQuery.data;

  const amountOutEstimate = useMemo(() => {
    if (!amount || !tokenPrice) return undefined;
    const amountWei = parseUnits(amount.toString(), USDC.decimals);
    return (amountWei * BigInt(10 ** USDC.decimals)) / tokenPrice;
  }, [amount, tokenPrice]);

  const tokenPurchasedQuery = useQuery(
    ['tokenPurchased', contract, account],
    async (): Promise<bigint | undefined> => {
      if (!contract) return undefined;
      if (!account) return undefined;
      return await contract?.balanceOf(account);
    },
    {
      enabled: !!contract && !!account
    }
  );
  const tokenPurchased = tokenPurchasedQuery.data;

  const invest = async (amnt: number, massaAddress: string) => {
    if (!contract) throw new Error('Sale contract not initialized');
    if (!amnt) throw new Error('Amount not specified');
    const amountWei = parseUnits(amnt.toString(), USDC.decimals);
    const tx = await contract.buyTokens(amountWei, massaAddress).then((tx) => {
      setPendingInvest(true);
      toast.loading(
        createElement(TxToast, {
          title: 'Buy Tokens',
          txId: tx.hash,
          isEthereum: true
        }),
        { autoClose: false }
      );
      return tx;
    });
    if (!tx) toast.error('Transaction canceled by user');

    return await tx
      .wait()
      .then((e: any) => {
        const amntOut = BigInt(parseInt(e.logs[1].data, 16));
        toast.dismiss();
        toast.success(
          `Tx confirmed, you purchased ${printBigintIsh(DUSA_LOCKED_SEED, amntOut)} DUSA`
        );
        setAmount?.(undefined);
        refetchAllowance?.();
        setPendingInvest(false);
      })
      .catch(() => {
        toast.dismiss();
        toast.error('Tx failed');
        setPendingInvest(false);
      });
  };

  return {
    amountOutEstimate,
    pendingInvest,
    invest,
    tokenPurchased,
    refetchTokenPurchased: tokenPurchasedQuery.refetch
  };
};

export default useSaleContract;
