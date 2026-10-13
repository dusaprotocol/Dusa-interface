import { useContext, useEffect, useMemo } from 'react';
import Spinner from 'components/Spinner';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { PendingLimitOrder } from 'utils/storage';
import { Order } from 'utils/trpc';
import NoOrders from './NoOrders';
import OrderItem from './OrderItem';
import './index.scss';

interface ActiveOrdersProps {
  orders: Order[] | undefined;
  ordersLoading?: PendingLimitOrder[];
  ordersRemoving?: PendingLimitOrder[];
}

const ActiveOrders = ({
  orders,
  ordersLoading = [],
  ordersRemoving = []
}: ActiveOrdersProps) => {
  const { connectedAddress, refetch } = useContext(AccountWrapperContext);

  const activeOrdersFiltered = useMemo(() => {
    return orders
      ?.filter((order) => {
        try {
          if (!order) return false;
          return (
            order.status === 'ACTIVE' &&
            !ordersRemoving.some(
              (removingOrder) =>
                removingOrder.id === order.id &&
                removingOrder.scAddress === order.limitOrderAddress
            )
          );
        } catch (error) {
          console.error('Error filtering order:', error, order);
          return false;
        }
      })
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }, [orders, ordersRemoving]);

  useEffect(() => {
    if (ordersLoading.length > 0 || ordersRemoving.length > 0) {
      const interval = setInterval(() => refetch(['orders', 'balances']), 4000);
      return () => clearInterval(interval);
    }
  }, [ordersLoading.length, ordersRemoving.length]);

  if (!connectedAddress)
    return (
      <div className='connect-wallet'>
        Connect your wallet to see your orders.
      </div>
    );
  if (!orders) return <Spinner />;

  return (
    <div className='ActiveOrders'>
      {Array.isArray(ordersLoading) &&
        ordersLoading
          .sort((a, b) => b.id - a.id)
          .map((order) => (
            <div key={`loading-${order.id}`} className='order-loading'>
              <Spinner size={20} />
              <span>Creating order #{order.id}...</span>
            </div>
          ))}

      {activeOrdersFiltered?.length ? (
        <>
          {activeOrdersFiltered.map((order, i) => {
            return (
              <OrderItem
                order={order}
                variant='active'
                buttonVariant='cancel'
                key={`active-${i}`}
              />
            );
          })}
        </>
      ) : null}

      {!activeOrdersFiltered?.length &&
      (!ordersLoading || !ordersLoading.length) ? (
        <NoOrders isActive isOrderPage />
      ) : null}
    </div>
  );
};

export default ActiveOrders;
