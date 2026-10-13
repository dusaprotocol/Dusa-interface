import React, { useContext, useEffect } from 'react';
import Spinner from 'components/Spinner';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { Order } from 'utils/trpc';
import NoOrders from '../ActiveOrders/NoOrders';
import './index.scss';
import OrderItem from 'components/ActiveOrders/OrderItem';
import { useManageOrdersStorage } from 'hooks/useManageOrdersStorage';

interface OrderHistoryProps {
  orders: Order[] | undefined;
}

const OrderHistory = ({ orders }: OrderHistoryProps) => {
  const { connectedAddress, refetch } = useContext(AccountWrapperContext);

  const ordersFiltered = (
    orders?.filter((order) => {
      try {
        if (!order) return false;
        return order.status === 'CLAIMED' || order.status === 'CANCELED';
      } catch (error) {
        console.error('Error filtering order:', error, order);
        return false;
      }
    }) || []
  ).sort((a, b) => {
    const aTime = new Date(a.timestamp).getTime();
    const bTime = new Date(b.timestamp).getTime();
    return bTime - aTime;
  });

  const { ordersRemoving, setOrdersRemoving, locallyCompletedOrders } =
    useManageOrdersStorage(ordersFiltered, connectedAddress);

  // Merge backend orders with locally completed orders
  const mergedOrders = React.useMemo(() => {
    if (!locallyCompletedOrders || locallyCompletedOrders.length === 0) {
      return ordersFiltered;
    }

    // Convert locally completed orders to Order format and filter out duplicates
    const localOrders = locallyCompletedOrders
      .filter(
        (localOrder) =>
          // Only include if not already in backend orders
          !ordersFiltered.some(
            (backendOrder) => backendOrder.id === localOrder.id
          )
      )
      .map((localOrder) => ({
        ...localOrder.orderData,
        status: localOrder.status,
        timestamp: localOrder.timestamp
      }));

    // Combine and sort by timestamp
    const combined = [...ordersFiltered, ...localOrders];
    return combined.sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      return bTime - aTime;
    });
  }, [ordersFiltered, locallyCompletedOrders]);

  useEffect(() => {
    if (ordersRemoving.length > 0) {
      if (ordersFiltered && ordersFiltered.length > 0) {
        ordersFiltered.forEach((order) => {
          if (
            ordersRemoving.includes({
              id: order.id,
              scAddress: order.limitOrderAddress
            })
          ) {
            const interval = setInterval(() => {
              if (order.status === 'ACTIVE' || order.status === 'ENDED') {
                refetch(['orders']);
              } else {
                setOrdersRemoving(
                  ordersRemoving.filter(
                    (orderRemoving) =>
                      ordersFiltered.find((o) => o.id === orderRemoving.id) ===
                      undefined
                  )
                );
                clearInterval(interval);
              }
            }, 4000);
          }
        });
      }
    }
  }, [ordersFiltered, ordersRemoving.length]);

  if (!connectedAddress)
    return (
      <div className='connect-wallet'>
        Connect your wallet to see your order history.
      </div>
    );
  if (!ordersFiltered) return <Spinner />;

  return (
    <div className='OrderHistory'>
      {mergedOrders.length === 0 ? (
        <NoOrders isActive={false} isOrderPage />
      ) : (
        <>
          {mergedOrders.map((o, i) => (
            <OrderItem order={o} key={`${o.id}-${i}`} variant='history' />
          ))}
        </>
      )}
    </div>
  );
};

export default OrderHistory;
