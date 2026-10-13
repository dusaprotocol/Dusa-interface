import { useContext, useEffect } from 'react';
import Spinner from 'components/Spinner';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { Order } from 'utils/trpc';
import NoOrders from '../ActiveOrders/NoOrders';
import OrderItem from '../ActiveOrders/OrderItem';
import './index.scss';
import { PendingLimitOrder } from 'utils/storage';

interface ExecutedOrdersProps {
  orders: Order[] | undefined;
  ordersRemoving?: PendingLimitOrder[];
}

const ExecutedOrders = ({
  orders,
  ordersRemoving = []
}: ExecutedOrdersProps) => {
  const { connectedAddress, refetch } = useContext(AccountWrapperContext);

  const endedOrdersFiltered = orders
    ?.filter((order) => {
      try {
        if (!order) return false;
        return (
          order.status === 'ENDED' &&
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

  useEffect(() => {
    if (ordersRemoving.length > 0) {
      const interval = setInterval(() => refetch(['orders', 'balances']), 4000);
      return () => clearInterval(interval);
    }
  }, [ordersRemoving.length]);

  if (!connectedAddress)
    return (
      <div className='connect-wallet'>
        Connect your wallet to see your executed orders.
      </div>
    );
  if (!endedOrdersFiltered) return <Spinner />;

  return (
    <div className='ExecutedOrders'>
      {endedOrdersFiltered?.length ? (
        <>
          {endedOrdersFiltered.map((order, i) => {
            return (
              <OrderItem
                order={order}
                variant='active'
                buttonText='Claim order'
                buttonVariant='claim'
                key={`ended-${i}`}
              />
            );
          })}
        </>
      ) : (
        <NoOrders isActive={false} isOrderPage />
      )}
    </div>
  );
};

export default ExecutedOrders;
