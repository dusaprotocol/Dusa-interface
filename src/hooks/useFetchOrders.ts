import { trpc } from 'utils/trpc';

export const useFetchOrders = (userAddress: string) => {
  const queryParameters = { userAddress };
  const queryOptions = {
    enabled: !!userAddress
  };
  const {
    data: orderDetails,
    refetch,
    isLoading,
    isFetched
  } = trpc.getOrders.useQuery(queryParameters, queryOptions);

  const orders =
    orderDetails?.map((order) => ({
      ...order,
      timestamp: new Date(order.timestamp)
    })) || [];

  return { orders, refetch, isLoading, isFetched };
};
