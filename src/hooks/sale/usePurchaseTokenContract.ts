import { createElement, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Contract, parseUnits } from 'ethers';
import { toast } from 'react-toastify';
import PurchaseTokenContractABI from 'abis/PurchaseTokenContract.json';
import TxToast from 'components/TxToast';
import { PURCHASE_TOKEN_CONTRACT_ADDRESS } from 'utils/configSale';
import { USDC } from 'utils/tokens';
import useWeb3 from './useWeb3';

const usePurchaseTokenContract = (saleContract: string) => {
  const { account, signer } = useWeb3();
  const [pendingApproveAllowance, setPendingApproveAllowance] = useState(false);

  const contract = useMemo(() => {
    if (!signer) return undefined;
    return new Contract(
      PURCHASE_TOKEN_CONTRACT_ADDRESS,
      PurchaseTokenContractABI,
      signer
    );
  }, [signer]);

  const allowanceQuery = useQuery(
    ['allowanceQuery', account, contract, saleContract],
    async (): Promise<bigint | undefined> => {
      if (!account || !contract) return undefined;
      return await contract.allowance(account, saleContract);
    },
    {
      enabled: !!account && !!contract
    }
  );
  const allowance = allowanceQuery.data;
  const refetchAllowance = allowanceQuery.refetch;

  useEffect(() => {
    if (account) refetchAllowance();
  }, [account, refetchAllowance]);

  const approveAllowance = async (amount: number) => {
    if (!amount) throw new Error('Amount not specified');
    if (!contract) throw new Error('Sale contract not initialized');

    const amountWei = parseUnits(amount.toString(), USDC.decimals);
    const tx = await contract.approve(saleContract, amountWei).then((tx) => {
      setPendingApproveAllowance(true);
      toast.loading(
        createElement(TxToast, {
          title: 'Approve Allowance',
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
      .then(() => {
        toast.dismiss();
        toast.success('Approve allowance confirmed');
        refetchAllowance();
        setPendingApproveAllowance(false);
      })
      .catch(() => {
        toast.dismiss();
        toast.error('Approve allowance failed');
        setPendingApproveAllowance(false);
      });
  };

  return {
    allowance,
    isAllowanceLoading: allowanceQuery.isLoading,
    refetchAllowance,
    pendingApproveAllowance,
    approveAllowance
  };
};

export default usePurchaseTokenContract;
