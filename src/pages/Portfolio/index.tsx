import React, { useContext, useEffect, useRef, useState } from 'react';
import { faCalendar } from '@fortawesome/free-regular-svg-icons';
import {
  faExternalLinkAlt,
  faPlus,
  faPaperPlane,
  faRefresh,
  faSearch,
  faShare,
  faUsers,
  faX
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx/lite';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ConnectButton from 'components/ConnectButton';
import CopyIcon from 'components/CopyIcon';
import LinkIcon from 'components/LinkIcon';
import MyPools from 'components/MyPools';
import MyTokens from 'components/MyTokens';
import PageHeader from 'components/PageHeader';
import PoolName from 'components/PoolName';
import ReferralModal from 'components/ReferralModal';
import ShareModal from 'components/ShareModal';
import Skeleton from 'components/Skeleton';
import Spinner from 'components/Spinner';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import useFetchAccount from 'hooks/useFetchAccount';
import useFetchTxs from 'hooks/useFetchTxs';
import ErrorPage from 'pages/ErrorPage';
import { routeNames } from 'routes';
import { FEATURE_FLAGS } from 'utils/config';
import { getWmasIfMas } from 'utils/coreMethods';
import {
  buildExplorerLink,
  isAddressValid,
  printAddress,
  printUSD
} from 'utils/methods';
import {
  getImportedPools,
  getPoolsCreated,
  updateImportedPools
} from 'utils/storage';
import { Pool, PoolWithAddress, Transaction } from 'utils/types';
import { DCAsOwn } from './components/DCAs';
import SendTokenModal from './components/SendTokenModal';
import './index.scss';
import NoDCA from 'pages/DCA/components/ActiveDCA/NoDCA';

dayjs.extend(relativeTime);

const Portfolio = () => {
  const [searchAddress, setSearchAddress] = useState('');
  const [isInputFocused, setInputFocused] = useState(false);
  const [poolsImported, setPoolsImported] = useState(getImportedPools());
  const [showRelativeTime, setShowRelativeTime] = useState(true);
  const [showSendTokenModal, setShowSendTokenModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const toggleRelativeTime = () => setShowRelativeTime(!showRelativeTime);

  const history = useNavigate();
  const inputRef = useRef(null);
  const { userAddress } = useParams();
  const connectedAccount = useContext(AccountWrapperContext);
  const { connectedAddress } = connectedAccount;
  const userAccount = useFetchAccount(userAddress || '');
  const address = userAddress || connectedAddress;
  const isSelf = !userAddress || userAddress === connectedAddress;
  const {
    tokensInfo,
    poolsOwn,
    autoPoolsOwn,
    activeDCAs,
    locks,
    locksValue,
    portfolioValue,
    tokensValue,
    rollsValue,
    poolsValue,
    autopoolsValue,
    isLoading,
    refetch
  } = userAddress ? userAccount : connectedAccount;
  const poolsCreated = !userAddress ? getPoolsCreated() : [];

  const { recentTxs, isGetTxsLoading, refreshTxsFn } = useFetchTxs(address);

  // useEffect(() => {
  //   if (!userAddress) return;
  //   userAccount.trigger();
  // }, [userAddress]);

  // useEffect(() => {
  //   if (!address) return;
  //   refreshTxsFn();
  // }, [address]);

  const renderTxs = () => {
    return (
      <>
        {!isGetTxsLoading && !recentTxs.length ? (
          <span className='no-recent-tx'>No recent transactions</span>
        ) : (
          <div className='table-wrapper'>
            <table>
              <thead className='pf-tx-head'>
                <tr>
                  <th>Tx hash</th>
                  <th className='pf-tx-head-age'>
                    <span>Age</span>
                    <FontAwesomeIcon
                      icon={faCalendar}
                      onClick={toggleRelativeTime}
                    />
                  </th>
                  <th>Status</th>
                  <th>To</th>
                  <th>Method</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody className='pf-txs'>
                {isGetTxsLoading
                  ? Array.from({ length: 10 }, (_, i) => (
                      <tr key={i}>
                        {['12ch', '12ch', '8ch', '12ch', '5ch', '30ch'].map(
                          (width, index) => (
                            <td key={width + index}>
                              <Skeleton style={{ width }} />
                            </td>
                          )
                        )}
                      </tr>
                    ))
                  : recentTxs.map((tx, index) => {
                      return (
                        <TransactionItem
                          key={index}
                          tx={tx}
                          showRelativeTime={showRelativeTime}
                        />
                      );
                    })}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  };

  const assets = [
    { text: 'Tokens', value: tokensValue },
    { text: 'Rolls', value: rollsValue },
    { text: 'Locks', value: locksValue },
    { text: 'Pools', value: poolsValue }
  ];

  FEATURE_FLAGS.AUTONOMOUS_LIQUIDITY &&
    assets.push({ text: 'Auto Pools', value: autopoolsValue });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      history(routeNames.portfolioUser.replace(':userAddress', searchAddress));
      setSearchAddress('');
    }
  };

  const handleKeysPress = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (inputRef.current) {
        (inputRef.current as HTMLInputElement).focus();
      }
    }
  };

  // Detect if user is on Mac
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  useEffect(() => {
    document.addEventListener('keydown', handleKeysPress);

    return () => {
      document.removeEventListener('keydown', handleKeysPress);
    };
  }, []);

  return (
    <div className='Portfolio'>
      <PageHeader title='Portfolio' description='Your assets and positions'>
        <div className='page-header-portfolio'>
          <div
            className='Portfolio-search'
            onKeyDown={() => {
              inputRef.current &&
                (inputRef.current as HTMLInputElement).focus();
            }}
          >
            <FontAwesomeIcon
              icon={faSearch}
              onClick={() =>
                inputRef.current &&
                (inputRef.current as HTMLInputElement).focus()
              }
            />
            <input
              ref={inputRef}
              type='text'
              placeholder='Enter an address'
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              value={searchAddress}
            />
            {isInputFocused ? (
              <span
                onMouseDown={(e) => {
                  e.preventDefault();
                  history(`/portfolio/${searchAddress}`);
                  setSearchAddress('');
                }}
              >
                Enter
              </span>
            ) : (
              <span
                onClick={() =>
                  inputRef.current &&
                  (inputRef.current as HTMLInputElement).focus()
                }
              >
                {isMac ? 'CMD + K' : 'CTRL + K'}
              </span>
            )}
          </div>

          {userAddress && isAddressValid(userAddress) && (
            <div className='pf-view'>
              <div>{printAddress(userAddress)}</div>
              <CopyIcon text={userAddress} />
              <FontAwesomeIcon
                icon={faX}
                onClick={() => history(routeNames.portfolio)}
              />
            </div>
          )}
        </div>
      </PageHeader>
      <div className='pf-container'>
        {userAddress && !isAddressValid(userAddress) ? (
          <ErrorPage />
        ) : !address ? (
          <div className='empty-pf'>
            <ConnectButton stretch={false} />
          </div>
        ) : (
          <>
            <div className='flex flex-col gap-2'>
              <div className='flex gap-2 pf-margin'>
                <a
                  className='flex items-center gap-2 bg-[var(--hover-bg)] hover:bg-[var(--secondary-color)] px-4 py-2 rounded-lg cursor-pointer'
                  href={buildExplorerLink(address)}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  <img
                    src='https://explorer.massa.net/favicon.png'
                    alt='massa explorer favicon png'
                    className='w-4 h-4'
                  />
                  Explorer page
                  <FontAwesomeIcon
                    icon={faExternalLinkAlt}
                    className='text-sm'
                  />
                </a>
              </div>
              <div className='pf-content pf-margin'>
                <div className='pf-section'>
                  <div className='flex justify-between items-center'>
                    <span className='pf-section-item-title'>
                      {!userAddress && 'Your'} Tokens
                    </span>
                    {isSelf && tokensInfo && tokensInfo.length > 0 && (
                      <button
                        className='flex items-center gap-2 bg-[var(--hover-bg)] hover:bg-[var(--secondary-color)] mr-2 px-3 py-2 rounded-lg text-sm cursor-pointer'
                        onClick={() => setShowSendTokenModal(true)}
                      >
                        <FontAwesomeIcon
                          icon={faPaperPlane}
                          className='text-sm'
                        />
                        Send Tokens
                      </button>
                    )}
                  </div>
                  <div className='pf-section-tokens'>
                    <MyTokens
                      tokensInfo={tokensInfo}
                      trackAccount={userAddress !== undefined}
                    />
                  </div>
                </div>
                {poolsCreated.length > 0 && (
                  <div className='pf-section'>
                    <span className='pf-section-item-title'>
                      Your Pools Created
                    </span>
                    <div className='pf-section-tokens'>
                      <MyPoolsCreated
                        poolsCreated={poolsCreated}
                        poolsImported={poolsImported}
                        setPoolsImported={setPoolsImported}
                      />
                    </div>
                  </div>
                )}
                <div className='pf-section'>
                  <span className='pf-section-item-title'>
                    {!userAddress && 'Your'} Pools
                  </span>
                  <MyPools
                    poolsOwn={poolsOwn}
                    autoPoolsOwn={autoPoolsOwn}
                    isLoading={isLoading(['poolsOwn', 'autoPoolsOwn'])}
                    isSelf={isSelf}
                  />
                </div>

                <div className='pf-section'>
                  <span className='pf-section-item-title'>Total Portfolio</span>
                  <span className='balanceInDollar'>
                    <>
                      {isNaN(portfolioValue) ||
                      isLoading([
                        'balances',
                        'poolsOwn',
                        'autoPoolsOwn',
                        'rolls'
                      ]) ? (
                        <Skeleton style={{ width: '10ch' }} />
                      ) : (
                        <span>${printUSD(portfolioValue, true)}</span>
                      )}
                      {assets.map((asset, i) => {
                        if (asset.value === 0) return null;

                        return (
                          <div key={i}>
                            <span>{asset.text}</span>
                            <span>${printUSD(asset.value, true)}</span>
                          </div>
                        );
                      })}
                    </>
                  </span>
                </div>
              </div>
            </div>

            <div className='pf-content pf-margin'>
              <div className='recent-transactions-container'>
                <div className='recent-refresh'>
                  <span>Recent Transactions</span>
                  <FontAwesomeIcon icon={faRefresh} onClick={refreshTxsFn} />
                </div>
                <div className='recent-transactions'>{renderTxs()}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {showSendTokenModal && (
        <SendTokenModal
          showModal={showSendTokenModal}
          setShowModal={setShowSendTokenModal}
          tokensInfo={tokensInfo}
        />
      )}
    </div>
  );
};

export default Portfolio;

// prettier-ignore
const TransactionItem = ({ tx, showRelativeTime }: { tx: Transaction, showRelativeTime: boolean }) => {
  return (
    <tr className='pf-tx-head'>
      <td className='pf-hash'>
        <LinkIcon link={buildExplorerLink(tx.hash)} external text={printAddress(tx.hash)} />
      </td>
      <td>{showRelativeTime ? dayjs(tx.timestamp).fromNow() : dayjs(tx.timestamp).format('YYYY-MM-DD HH:mm:ss')}</td>
      <td className={tx.status === 'failed' ? 'red' : 'green'}>{tx.status}</td>
      <td className='pf-to'>
        <span>{printAddress(tx.to)}</span>
        <CopyIcon text={tx.to} />
      </td>
      <td>{tx.targetFunction}</td>
      <td>{tx.description}</td>
    </tr>
  );
};

const MyPoolsCreated = ({
  poolsCreated,
  poolsImported,
  setPoolsImported
}: {
  poolsCreated: PoolWithAddress[];
  poolsImported: PoolWithAddress[];
  setPoolsImported: React.Dispatch<React.SetStateAction<PoolWithAddress[]>>;
}) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [poolToShare, setPoolToShare] = useState<PoolWithAddress>();

  return (
    <>
      <div className='AssetsOwned'>
        <div className='assets-owned-container'>
          {poolsCreated.map((pool, index) => {
            const token0 = getWmasIfMas(pool.token0);
            const token1 = getWmasIfMas(pool.token1);
            const isPoolImported = poolsImported.some((poolImported) => {
              return (
                poolImported.token0.address === token0.address &&
                poolImported.token1.address === token1.address &&
                poolImported.binStep === pool.binStep &&
                poolImported.version === pool.version
              );
            });

            return (
              <>
                <div className='pool-created-container'>
                  <Link
                    to={routeNames.liquidityItem
                      .replace(':token0', token0.address)
                      .replace(':token1', token1.address)
                      .replace(':binStep', pool.binStep.toString())
                      .replace(':version', pool.version.toString())}
                    className='asset-item'
                    key={pool.token0.address + '' + index}
                  >
                    <PoolName {...pool} />
                  </Link>
                  <div className='flex justify-between items-center'>
                    <div
                      className={clsx(
                        'flex cursor-pointer',
                        isPoolImported && 'imported'
                      )}
                      onClick={() => {
                        if (isPoolImported) {
                          const _pools = poolsImported.filter(
                            (poolImported) =>
                              !(
                                poolImported.token0.address ===
                                  token0.address &&
                                poolImported.token1.address ===
                                  token1.address &&
                                poolImported.binStep === pool.binStep
                              )
                          );
                          updateImportedPools(_pools);
                          setPoolsImported(_pools);
                          return;
                        }

                        const newPool: Pool = {
                          ...pool
                          // token0,
                          // token1,
                          // binStep: pool.binStep,
                        };
                        const _pools = [...poolsImported, newPool];
                        updateImportedPools(_pools);
                        setPoolsImported(_pools);
                      }}
                    >
                      {isPoolImported ? (
                        <span>Imported to Pools ✅</span>
                      ) : (
                        <div className='flex items-center gap-1 hover:underline'>
                          <FontAwesomeIcon icon={faPlus} />
                          <span>Add to Pools</span>
                        </div>
                      )}
                    </div>
                    <div
                      onClick={() => {
                        setPoolToShare(pool);
                        setShowShareModal(true);
                      }}
                      className='flex items-center gap-1 hover:underline cursor-pointer'
                    >
                      <FontAwesomeIcon icon={faShare} />
                      <span>Share</span>
                    </div>
                  </div>
                </div>
                {index < poolsCreated.length - 1 && (
                  <div className='line'></div>
                )}
              </>
            );
          })}
        </div>
      </div>
      {showShareModal && poolToShare && (
        <ShareModal
          showModal={showShareModal}
          setShowModal={setShowShareModal}
          pool={poolToShare}
        />
      )}
    </>
  );
};
