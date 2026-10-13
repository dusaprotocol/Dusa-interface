import React, { useContext, useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import ActiveOrders from 'components/ActiveOrders';
import ExecutedOrders from 'components/ExecutedOrders';
import OrderHistory from 'components/OrderHistory';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { useFetchDCAs } from 'hooks/useFetchDCAs';
import { useManageOrdersStorage } from 'hooks/useManageOrdersStorage';
import ActiveDCA from 'pages/DCA/components/ActiveDCA';
import DCAHistory from 'pages/DCA/components/DCAHistory';
import { FEATURE_FLAGS } from 'utils/config';
// import OrderModal from '../OrderModal';
import './index.scss';

dayjs.extend(relativeTime);

const ActiveOrderDCACard = () => {
  const mainTabs = ['Orders', 'DCA'] as const;
  type MainTabType = (typeof mainTabs)[number];

  const orderSubTabs = ['Active', 'Executed', 'History'] as const;
  type OrderSubTabType = (typeof orderSubTabs)[number];

  const dcaSubTabs = ['Active', 'History'] as const;
  type DCASubTabType = (typeof dcaSubTabs)[number];

  const [mainTab, setMainTab] = useState<MainTabType>(
    FEATURE_FLAGS.LIMIT ? 'Orders' : 'DCA'
  );
  const [orderSubTab, setOrderSubTab] = useState<OrderSubTabType>('Active');
  const [dcaSubTab, setDcaSubTab] = useState<DCASubTabType>('Active');

  const { connectedAddress, orders, refetch, isLoading } = useContext(
    AccountWrapperContext
  );

  const { dcas } = useFetchDCAs(connectedAddress);

  const { ordersLoading, ordersRemoving } = useManageOrdersStorage(
    orders,
    connectedAddress
  );

  // Helper functions to calculate order counts
  const getActiveOrdersCount = () => {
    if (!orders) return 0;
    return orders.filter((order) => {
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
        console.error('Error filtering active order:', error, order);
        return false;
      }
    }).length;
  };

  const getExecutedOrdersCount = () => {
    if (!orders) return 0;
    return orders.filter((order) => {
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
        console.error('Error filtering executed order:', error, order);
        return false;
      }
    }).length;
  };

  const getOrderHistoryCount = () => {
    if (!orders) return 0;
    return orders.filter((order) => {
      try {
        if (!order) return false;
        return (
          order.status === 'CLAIMED' ||
          order.status === 'CANCELED' ||
          ordersRemoving.some(
            (removingOrder) =>
              removingOrder.id === order.id &&
              removingOrder.scAddress === order.limitOrderAddress
          )
        );
      } catch (error) {
        console.error('Error filtering history order:', error, order);
        return false;
      }
    }).length;
  };

  // Helper function to get current sub-tabs based on main tab
  const getCurrentSubTabs = () => {
    if (mainTab === 'Orders') {
      return orderSubTabs.filter((tab) => {
        // Filter based on feature flags
        if (!FEATURE_FLAGS.LIMIT) return false;
        return true;
      });
    } else {
      return dcaSubTabs.filter((tab) => {
        // Filter based on feature flags
        if (!FEATURE_FLAGS.DCA) return false;
        return true;
      });
    }
  };

  const getCurrentSubTab = () => {
    return mainTab === 'Orders' ? orderSubTab : dcaSubTab;
  };

  const handleSubTabClick = (subTab: string) => {
    if (mainTab === 'Orders') {
      setOrderSubTab(subTab as OrderSubTabType);
    } else {
      setDcaSubTab(subTab as DCASubTabType);
    }
  };

  // Render content based on current main tab and sub-tab
  const renderContent = () => {
    if (mainTab === 'Orders' && FEATURE_FLAGS.LIMIT) {
      switch (orderSubTab) {
        case 'Active':
          return (
            <ActiveOrders
              orders={orders}
              ordersLoading={ordersLoading}
              ordersRemoving={ordersRemoving}
            />
          );
        case 'Executed':
          return (
            <ExecutedOrders orders={orders} ordersRemoving={ordersRemoving} />
          );
        case 'History':
          return <OrderHistory orders={orders} />;
        default:
          return null;
      }
    } else if (mainTab === 'DCA' && FEATURE_FLAGS.DCA) {
      switch (dcaSubTab) {
        case 'Active':
          return (
            <ActiveDCA
              dcas={dcas}
              refetch={() => refetch(['dcas'])}
              isLoading={isLoading(['dcas'])}
            />
          );
        case 'History':
          return (
            <DCAHistory
              dcas={dcas}
              isLoading={isLoading(['dcas'])}
              refetch={() => refetch(['dcas'])}
            />
          );
        default:
          return null;
      }
    }
    return null;
  };

  const displayMainTabs =
    mainTabs.filter((tab) => {
      if (tab === 'Orders' && FEATURE_FLAGS.LIMIT) return true;
      if (tab === 'DCA' && FEATURE_FLAGS.DCA) return true;
      return false;
    }).length > 1;

  return (
    <div className='OrderCard'>
      {displayMainTabs && (
        <div className='main-tabs'>
          {mainTabs
            .filter((tab) => {
              if (tab === 'Orders' && !FEATURE_FLAGS.LIMIT) return false;
              if (tab === 'DCA' && !FEATURE_FLAGS.DCA) return false;
              return true;
            })
            .map((tab) => (
              <button
                key={tab}
                onClick={() => setMainTab(tab)}
                className={mainTab === tab ? 'active-main-tab' : ''}
              >
                {tab}
              </button>
            ))}
        </div>
      )}

      <div className='sub-tabs'>
        {getCurrentSubTabs().map((subTab) => (
          <button
            key={subTab}
            onClick={() => handleSubTabClick(subTab)}
            className={getCurrentSubTab() === subTab ? 'active-sub-tab' : ''}
          >
            {subTab === 'Active' && mainTab === 'Orders'
              ? `Active Orders (${getActiveOrdersCount()})`
              : subTab === 'Executed' && mainTab === 'Orders'
                ? `Executed Orders (${getExecutedOrdersCount()})`
                : subTab === 'History' && mainTab === 'Orders'
                  ? `Order History (${getOrderHistoryCount()})`
                  : subTab === 'Active' && mainTab === 'DCA'
                    ? 'Active DCA'
                    : subTab === 'History' && mainTab === 'DCA'
                      ? 'DCA History'
                      : subTab}
          </button>
        ))}
      </div>

      <div className='tab-content'>{renderContent()}</div>
    </div>
  );
};

export default ActiveOrderDCACard;
