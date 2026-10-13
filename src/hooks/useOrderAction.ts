import { useMemo, useContext } from 'react';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import eventEmitter from 'utils/eventEmitter';
import { findLimitOrderPoolByAddress } from 'utils/methods';
import { setLocallyCompletedOrder, LocallyCompletedOrder } from 'utils/storage';
import { WMAS } from 'utils/tokens';
import {
  buildCancelOrderTx,
  buildClaimOrderTx
} from 'utils/transactionBuilder';
import { Order } from 'utils/trpc';
import { useSendTransaction } from './useSendTransaction';

export const useOrderAction = (order: Order) => {
  const { connectedAddress } = useContext(AccountWrapperContext);

  const isMasIn = useMemo(() => {
    const pool = findLimitOrderPoolByAddress(order.poolAddress);
    if (!pool) return false;
    return (order.isSellOrder ? pool.token0 : pool.token1).equals(WMAS);
  }, [order.poolAddress, order.isSellOrder]);

  const saveLocallyCompletedOrder = (status: 'CLAIMED' | 'CANCELED') => {
    if (!connectedAddress) return;

    const localOrder: LocallyCompletedOrder = {
      id: order.id,
      limitOrderAddress: order.limitOrderAddress,
      status,
      timestamp: new Date().toISOString(),
      orderData: { ...order, status } // Store complete order data with updated status
    };

    setLocallyCompletedOrder(connectedAddress, localOrder);
    eventEmitter.emit('localOrderCompleted');
  };

  const { submitTx: claimOrderBase, pending: isClaimPending } =
    useSendTransaction({
      data: buildClaimOrderTx(order.id, order.limitOrderAddress, !isMasIn),
      onTxConfirmed: () => saveLocallyCompletedOrder('CLAIMED')
    });

  const { submitTx: cancelOrderBase, pending: isCancelPending } =
    useSendTransaction({
      data: buildCancelOrderTx(order.id, order.limitOrderAddress, isMasIn),
      onTxConfirmed: () => saveLocallyCompletedOrder('CANCELED')
    });

  const claimOrder = async () => {
    await claimOrderBase();
  };

  const cancelOrder = async () => {
    await cancelOrderBase();
  };

  return {
    isClaimPending,
    claimOrder,
    isCancelPending,
    cancelOrder
  };
};
