import { useEffect, useState } from 'react';
import eventEmitter from 'utils/eventEmitter';
import {
  getPendingLimitOrderCreation,
  getPendingLimitOrderDelete,
  PendingLimitOrder,
  setPendingLimitOrderCreationRemove,
  setPendingLimitOrderDeleteRemove,
  getLocallyCompletedOrders,
  removeLocallyCompletedOrders,
  LocallyCompletedOrder
} from 'utils/storage';
import { Order } from 'utils/trpc';

export const useManageOrdersStorage = (
  orders: Order[],
  userAddress: string
) => {
  const [ordersLoading, setOrdersLoading] = useState<PendingLimitOrder[]>([]);
  const [ordersRemoving, setOrdersRemoving] = useState<PendingLimitOrder[]>([]);
  const [locallyCompletedOrders, setLocallyCompletedOrders] = useState<
    LocallyCompletedOrder[]
  >([]);

  useEffect(() => {
    if (!userAddress) return;
    setOrdersRemoving(getPendingLimitOrderDelete(userAddress));
    setLocallyCompletedOrders(getLocallyCompletedOrders(userAddress));
  }, [userAddress]);

  useEffect(() => {
    if (!userAddress) return;
    if (orders) {
      const completedOrders = ordersLoading.filter(
        (pendingOrder) =>
          orders.find((o) => o.id === pendingOrder.id) !== undefined
      );
      if (completedOrders.length > 0)
        setPendingLimitOrderCreationRemove(userAddress, completedOrders);

      const removingOrders = ordersRemoving.filter(
        (pendingOrder) =>
          orders.find(
            (o) =>
              o.id === pendingOrder.id &&
              o.limitOrderAddress === pendingOrder.scAddress
          ) !== undefined
      );
      if (removingOrders.length > 0)
        setPendingLimitOrderDeleteRemove(userAddress, removingOrders);

      // Clean up locally completed orders that are now in backend response
      const localOrdersToRemove = locallyCompletedOrders
        .filter((localOrder) =>
          orders.find(
            (o) =>
              o.id === localOrder.id &&
              (o.status === 'CLAIMED' || o.status === 'CANCELED')
          )
        )
        .map((order) => order.id);

      if (localOrdersToRemove.length > 0) {
        removeLocallyCompletedOrders(userAddress, localOrdersToRemove);
      }
    }

    setOrdersLoading(getPendingLimitOrderCreation(userAddress));
    setOrdersRemoving(getPendingLimitOrderDelete(userAddress));
    setLocallyCompletedOrders(getLocallyCompletedOrders(userAddress));
  }, [userAddress, orders?.length]);

  useEffect(() => {
    const handleEvent = () => {
      if (!userAddress) return;
      const ordersLoading = getPendingLimitOrderCreation(userAddress);
      setOrdersLoading(ordersLoading);
    };

    eventEmitter.on('updateOrdersLoading', handleEvent);

    return () => {
      eventEmitter.off('updateOrdersLoading', handleEvent);
    };
  }, [userAddress]);

  useEffect(() => {
    const handleEvent = () => {
      if (!userAddress) return;
      const ordersRemoving = getPendingLimitOrderDelete(userAddress);
      setOrdersRemoving(ordersRemoving);
    };

    eventEmitter.on('updateOrdersRemoving', handleEvent);

    return () => {
      eventEmitter.off('updateOrdersRemoving', handleEvent);
    };
  }, [userAddress]);

  // Handle locally completed orders events
  useEffect(() => {
    const handleLocalOrderCompleted = () => {
      if (!userAddress) return;
      const updatedLocalOrders = getLocallyCompletedOrders(userAddress);
      setLocallyCompletedOrders(updatedLocalOrders);
    };

    eventEmitter.on('localOrderCompleted', handleLocalOrderCompleted);

    return () => {
      eventEmitter.off('localOrderCompleted', handleLocalOrderCompleted);
    };
  }, [userAddress]);

  return {
    ordersLoading,
    ordersRemoving,
    setOrdersRemoving,
    locallyCompletedOrders
  };
};
