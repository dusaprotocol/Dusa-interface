import React, { useContext, useEffect, useState } from 'react';
import {
  faAnglesRight,
  faCheck,
  faChevronDown,
  faChevronUp,
  faCross,
  faExternalLink,
  faPowerOff,
  faWarning
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { WalletName } from '@massalabs/wallet-provider';
import clsx from 'clsx/lite';
import { Link } from 'react-router-dom';
import bearby from 'assets/img/bearby.svg';
import metamask from 'assets/img/metamask.svg';
import station from 'assets/img/station.svg';
import CopyIcon from 'components/CopyIcon';
import Dropdown from 'components/Dropdown';
import MyPools from 'components/MyPools';
import MyTokens from 'components/MyTokens';
import Skeleton from 'components/Skeleton';
import Spinner from 'components/Spinner';
import Tabs from 'components/Tabs';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import useFetchTxs from 'hooks/useFetchTxs';
import NoDCA from 'pages/DCA/components/ActiveDCA/NoDCA';
import { DCAsOwn } from 'pages/Portfolio/components/DCAs';
import { routeNames } from 'routes';
import { FEATURE_FLAGS, IS_BUILDNET, NETWORK } from 'utils/config';
import {
  buildExplorerLink,
  formatNumber,
  printAddress,
  printUSD
} from 'utils/methods';
import './index.scss';

const emojis = ['🐼', '🦩', '🐸', '🐮', '🐇', '🐤'];
const emoji = emojis[Math.floor(Math.random() * emojis.length)];

const AccountDrawer = () => {
  const {
    showDrawer,
    setShowDrawer,
    portfolioValue,
    tokensInfo,
    poolsOwn,
    autoPoolsOwn,
    tokensValue,
    poolsValue,
    rollsValue,
    isLoading,
    activeDCAs,
    // activeOrders,
    closeDrawer,
    disconnect,
    fetchAccounts,
    initClientWallet,
    providerList: providers,
    account,
    accounts,
    masBalances,
    selectedProvider,
    setSelectedProvider,
    connectedAddress,
    network,
    refetch
  } = useContext(AccountWrapperContext);

  const [activeTab, setActiveTab] = useState(0);
  const [showDropDown, setShowDropDown] = useState(false);

  const tabsItems = ['Tokens', 'Pools', 'Activity'];
  FEATURE_FLAGS.DCA && tabsItems.splice(2, 0, 'DCA');

  const { recentTxs, isGetTxsLoading, refreshTxsFn } =
    useFetchTxs(connectedAddress);

  useEffect(() => {
    if (connectedAddress) refreshTxsFn();
  }, [connectedAddress]);

  useEffect(() => {
    setShowDropDown(false);
  }, [showDrawer]);

  useEffect(() => {
    const handleClickOutside = () => setShowDropDown(false);

    window.addEventListener('click', handleClickOutside);

    return () => {
      window.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const renderActiveDCA = () => {
    if (!activeDCAs) return <Spinner />;
    if (activeDCAs.length === 0) return <NoDCA isActive />;

    return <DCAsOwn dcas={activeDCAs} refetch={() => refetch(['dcas'])} />;
  };

  // const renderActiveOrders = () => {
  //   if (!activeOrders) return <Spinner />;

  //   if (!activeOrders.length)
  //     return <div className='no-pool'>No order</div>;

  //   // return <OpenOrders activeOrders={activeOrders} setActiveOrders={setActiveOrders} />;
  // };

  const renderActivity = () => {
    if (isGetTxsLoading) return <Spinner />;

    if (!recentTxs.length)
      return (
        <div className='no-pool'>
          Your recent transactions will appear here...
        </div>
      );

    return (
      <div className='recentTxs'>
        {recentTxs.map((tx, index) => {
          return (
            <React.Fragment key={tx.hash + index}>
              <div className='recentTx'>
                <span>
                  {tx.status === 'confirmed' ? (
                    <FontAwesomeIcon icon={faCheck} color='green' />
                  ) : (
                    <FontAwesomeIcon icon={faCross} color='red' />
                  )}
                </span>
                <span>{tx.description}</span>
              </div>
              {index < recentTxs.length - 1 && <div className='line'></div>}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const accountDetails = () => {
    if (!accounts || !connectedAddress) return <Spinner />;
    return (
      <>
        <div className='account-details'>
          <div className='account-header'>
            <div className='relative profile'>
              <div className='avatar'>{emoji}</div>
              <Dropdown
                isOpen={showDropDown}
                setIsOpen={setShowDropDown}
                position='bottom'
                triggerButton={
                  <>
                    <div className='address-selection'>
                      <span>{account?.accountName}</span>
                      <span>{printAddress(connectedAddress)}</span>
                    </div>
                    <FontAwesomeIcon
                      className='icon-down'
                      icon={showDropDown ? faChevronUp : faChevronDown}
                    />
                  </>
                }
              >
                <div className='dropdown-list'>
                  {NETWORK !== network && (
                    <div className='warning-network'>
                      <FontAwesomeIcon icon={faWarning} /> Your wallet should be
                      on {NETWORK}.
                    </div>
                  )}
                  {accounts.map((acc, i) => {
                    const addr = acc.address;

                    return (
                      <div
                        className='dropdown-item'
                        key={i}
                        onClick={() => {
                          selectedProvider &&
                            initClientWallet(selectedProvider, acc, accounts);
                          setShowDropDown(false);
                        }}
                      >
                        <div className='address-selection'>
                          <span>{acc.accountName}</span>
                          <span>{printAddress(addr)}</span>
                        </div>
                        <span>
                          {masBalances &&
                            masBalances[i] &&
                            formatNumber(masBalances[i])}{' '}
                          MAS
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Dropdown>
              <CopyIcon text={connectedAddress} />
              <a
                href={buildExplorerLink(connectedAddress)}
                aria-disabled='true'
                target='_blank'
                rel='noopener noreferrer'
              >
                <FontAwesomeIcon icon={faExternalLink} size='xs' />
              </a>
            </div>
            <FontAwesomeIcon icon={faPowerOff} onClick={disconnect} />
          </div>
          <div className='total-balance-container'>
            <span className='realized-pnl'>Balance:</span>
            <span className='total-balance'>
              {isNaN(portfolioValue) ||
              isLoading(['rolls', 'poolsOwn', 'balances', 'autoPoolsOwn']) ? (
                <Skeleton style={{ width: '10ch' }} />
              ) : (
                <>${printUSD(portfolioValue, false)}</>
              )}
            </span>
            <span className='total-balance-detail'>
              (Tokens: ${printUSD(tokensValue, false)}, Pools: $
              {printUSD(poolsValue, false)}, Rolls: $
              {printUSD(rollsValue, false)})
            </span>
          </div>
          {/* <div className='graph'>
            <Spinner />
          </div> */}
          <div className='account-items-container'>
            <Tabs
              tabs={tabsItems}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              fullWidth
            />
            <div className='account-item'>
              {activeTab === 0 ? (
                <MyTokens tokensInfo={tokensInfo} />
              ) : activeTab === 1 ? (
                <MyPools
                  autoPoolsOwn={autoPoolsOwn}
                  poolsOwn={poolsOwn}
                  isLoading={isLoading(['poolsOwn', 'autoPoolsOwn'])}
                />
              ) : activeTab === 2 && FEATURE_FLAGS.DCA ? (
                <>{renderActiveDCA()}</>
              ) : (
                <>{renderActivity()}</>
              )}
            </div>
          </div>
          <div className='view-portfolio'>
            <Link
              to={routeNames.portfolio}
              onClick={() => setShowDrawer(false)}
            >
              View more on your portfolio
            </Link>
          </div>
        </div>
      </>
    );
  };

  return (
    <>
      <div className={clsx('Account', !showDrawer && 'closed-account')}>
        <div className='close-account' onClick={closeDrawer}>
          <FontAwesomeIcon icon={faAnglesRight} />
        </div>
        <div className='account-outside' onClick={closeDrawer}></div>
        <div className='account-drawer'>
          {accounts && connectedAddress ? (
            accountDetails()
          ) : (
            <div className='connect-account'>
              <h4 className='connect-account-title'>Connect a wallet</h4>

              <div className='connection-methods'>
                {[
                  {
                    name: 'Massa Station',
                    icon: station,
                    downloadLink: 'https://station.massa.net',
                    providerName: WalletName.MassaWallet
                  },
                  {
                    name: 'Bearby',
                    icon: bearby,
                    downloadLink: 'https://bearby.io',
                    providerName: WalletName.Bearby
                  },
                  {
                    name: 'Metamask (Snaps)',
                    icon: metamask,
                    downloadLink: 'https://metamask.io',
                    providerName: WalletName.Metamask
                  }
                ].map((method, i) => {
                  const provider = providers?.find(
                    (p) => p.name() === method.providerName
                  );
                  const disabled = provider === undefined;
                  if (
                    method.providerName === WalletName.Metamask &&
                    IS_BUILDNET
                  )
                    return null;

                  return (
                    <button
                      key={i}
                      className={clsx(
                        'connection-method',
                        disabled && 'disabled'
                      )}
                      style={{ fontStyle: disabled ? 'italic' : 'normal' }}
                      onClick={async () => {
                        if (disabled) {
                          window.open(method.downloadLink, '_blank');
                        } else {
                          provider.connect();
                          setSelectedProvider(provider);
                          fetchAccounts(provider);
                        }
                      }}
                    >
                      <div className='method-content'>
                        <img
                          src={method.icon}
                          alt={method.name}
                          className='w-10 h-10'
                        />
                        <span>{method.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AccountDrawer;
