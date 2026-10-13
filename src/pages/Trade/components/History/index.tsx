import { useContext, useState } from 'react';
import { parseUnits, TokenAmount } from '@dusalabs/sdk';
import { faRepeat } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Link } from 'react-router-dom';
import LinkIcon from 'components/LinkIcon';
import PoolName from 'components/PoolName';
import Skeleton from 'components/Skeleton';
import { SimpleTooltip } from 'components/Tooltip';
import useFetchAllPools from 'hooks/useFetchAllPools';
import useFetchSupply from 'hooks/useFetchSupply';
import { usePairTokenValue } from 'hooks/usePairManager';
import { TradeContext } from 'pages/Trade';
import { routeNames } from 'routes';
import { rewarderSC, VESTING_SC_ADDRESS } from 'utils/config';
import { getMasIfWmas, getWmasIfMas } from 'utils/coreMethods';
import {
  printAddress,
  printUSD,
  printBigintIsh,
  toFraction,
  buildExplorerLink,
  shortenDate,
  roundFractionPrice,
  unFormatPrintedNumber
} from 'utils/methods';
import {
  bridgedTokens,
  DUSA_MAIN,
  MASSA,
  tokens,
  WETH,
  WETH_B,
  WMAS
} from 'utils/tokens';
import { trpc } from 'utils/trpc';
import { Token } from 'utils/types';
import './index.scss';
import { fetchUsersDUSABalance } from 'utils/datastoreFetcher';
import LiquidityDepth from '../LiquidityDepth';

const shortenAddress = (address: string) =>
  address.substring(address.length - 5);

dayjs.extend(relativeTime);

const History = () => {
  const { token0, token1 /*, tokenXAddress*/, pairAddress } =
    useContext(TradeContext);

  const masTotalSupplyQuery = trpc.getMasTotalSupply.useQuery();
  const masTotalSupply = parseUnits(
    masTotalSupplyQuery.data?.toString() || '0',
    MASSA.decimals
  );

  const masCirculatingSupplyQuery = trpc.getMasCirculatingSupply.useQuery();
  const masCirculatingSupply = parseUnits(
    masCirculatingSupplyQuery.data?.toString() || '0',
    MASSA.decimals
  );

  const is0Mas = token0?.equals(MASSA) || token0?.equals(WMAS);
  const is1Mas = token1?.equals(MASSA) || token1?.equals(WMAS);
  const is0Dusa = token0?.equals(DUSA_MAIN);
  const is1Dusa = token1?.equals(DUSA_MAIN);

  const dusaTotalSupplyToRemoveQuery = useQuery(
    ['dusaTotalSupplyToRemove'],
    () =>
      fetchUsersDUSABalance([
        'AU1CEgenUUUagyvdyqpn6QKDRQwrXSDZzaxaV46c9eL3L5q5Vi5o',
        'AU1FcqrjNCePHhBBHknCLf15uH9ajM9my1Q1oNdAU8TWfy9sTbzS',
        VESTING_SC_ADDRESS,
        rewarderSC
      ]).then((balances) =>
        balances.reduce((acc, balance) => acc + balance, 0n)
      ),
    {
      enabled: token0?.equals(DUSA_MAIN) || token1?.equals(DUSA_MAIN)
    }
  );
  const dusaTotalSupplyToRemove = dusaTotalSupplyToRemoveQuery.data || 0n;

  const totalSupply0Query = useFetchSupply({ token: token0 });
  const totalSupply0Data = BigInt(totalSupply0Query.data || 0n);
  const totalSupply1Query = useFetchSupply({ token: token1 });
  const totalSupply1Data = BigInt(totalSupply1Query.data || 0n);

  const totalSupply0 = is0Mas ? masTotalSupply : totalSupply0Data;
  const totalSupply1 = is1Mas ? masTotalSupply : totalSupply1Data;

  const circulatingSupply0 = is0Mas
    ? masCirculatingSupply
    : is0Dusa
      ? totalSupply0 - dusaTotalSupplyToRemove
      : totalSupply0;
  const circulatingSupply1 = is1Mas
    ? masCirculatingSupply
    : is1Dusa
      ? totalSupply1 - dusaTotalSupplyToRemove
      : totalSupply1;

  const { dollarValue0, dollarValue1 } = usePairTokenValue({ token0, token1 });

  const [activeTab, setActiveTab] = useState<0 | 1>(0);
  const [activeDepthTab, setActiveDepthTab] = useState<'history' | 'depth'>(
    'history'
  );

  const queryParameters = {
    poolAddress: pairAddress,
    token0Address: token0 ? getWmasIfMas(token0).address : '',
    token1Address: token1 ? getWmasIfMas(token1).address : '',
    take: 100
  };
  const enabled = !!(token0 && token1);
  const queryOpts = {
    enabled,
    refetchInterval: 60000
  };

  const swapQuery = trpc.getRecentSwapsTokens.useQuery(
    queryParameters,
    queryOpts
  );
  const dataSwap = swapQuery.data || [];

  const allPoolsV1Query = useFetchAllPools();
  const allPoolsV2Query = useFetchAllPools(false);
  const allPoolsV1 = allPoolsV1Query.data || [];
  const allPoolsV2 = allPoolsV2Query.data || [];
  const allPools = allPoolsV2.concat(allPoolsV1);

  const poolsInclude = (token: Token | undefined) => {
    if (!token) return [];
    const t = getWmasIfMas(token);
    const tokensAddress = tokens.map((tok) => tok.address);
    return allPools
      .filter((p) => t.equals(p.token0) || t.equals(p.token1))
      .filter(
        (p) =>
          tokensAddress.includes(p.token0.address) &&
          tokensAddress.includes(p.token1.address)
      );
  };
  const poolsIncludes0 = poolsInclude(token0);
  const poolsIncludes1 = poolsInclude(token1);

  const getSupplyValue = (
    token: Token,
    supply: bigint,
    value: number | undefined
  ) => {
    if (value === undefined) return undefined;

    const tokenAmount = new TokenAmount(token, supply);
    const tokensValue = tokenAmount.multiply(toFraction(value));

    return Number(unFormatPrintedNumber(roundFractionPrice(tokensValue)));
  };

  const GreenArrowIcon = () => (
    <svg viewBox='0 0 16 16' width='16px' xmlns='http://www.w3.org/2000/svg'>
      <path
        d='M11.3334 4.66666H4.66675L11.3334 11.3333V4.66666Z'
        fill='var(--green)'
      ></path>
    </svg>
  );

  const RedArrowIcon = () => (
    <svg viewBox='0 0 16 16' width='16px' xmlns='http://www.w3.org/2000/svg'>
      <path
        d='M11.3334 11.3333H4.66675L11.3334 4.66667V11.3333Z'
        fill='var(--red)'
      ></path>
    </svg>
  );

  if (!token0 || !token1) return null;

  const token0Selected = activeTab === 0;
  const fdv = getSupplyValue(
    token0Selected ? token0 : token1,
    token0Selected ? totalSupply0 : totalSupply1,
    token0Selected ? dollarValue0 : dollarValue1
  );
  const marketcap = getSupplyValue(
    token0Selected ? token0 : token1,
    token0Selected ? circulatingSupply0 : circulatingSupply1,
    token0Selected ? dollarValue0 : dollarValue1
  );

  const tokenInfo = {
    token: token0Selected ? token0 : token1,
    poolIncludes: token0Selected ? poolsIncludes0 : poolsIncludes1,
    totalSupply: token0Selected ? totalSupply0 : totalSupply1,
    dollarValue: token0Selected ? dollarValue0 : dollarValue1,
    fdv,
    marketcap
  };
  const isWeth = tokenInfo.token.equals(WETH) || tokenInfo.token.equals(WETH_B);
  const isBridged = bridgedTokens.includes(tokenInfo.token);

  return (
    <div className='History'>
      <div className='History-item'>
        <div className='history-item-header'>
          <span className='history-item-title'>
            {tokenInfo.token.symbol} Info
          </span>
          <button onClick={() => setActiveTab(token0Selected ? 1 : 0)}>
            <FontAwesomeIcon icon={faRepeat} />
            <span>{(token0Selected ? token1 : token0).symbol}</span>
          </button>
        </div>
        <div className='history-item-body'>
          <div className='tokens-info-content'>
            <span>Token Price:</span>
            {tokenInfo.dollarValue === undefined ? (
              <Skeleton />
            ) : (
              <span>
                $
                {printUSD(
                  tokenInfo.dollarValue,
                  true,
                  tokenInfo.dollarValue > 1 ? 2 : 3
                )}
              </span>
            )}
          </div>

          {isBridged ? null : (
            <div className='tokens-info-content'>
              <span>Total Supply:</span>
              <span>
                {printBigintIsh(
                  tokenInfo.token,
                  tokenInfo.totalSupply,
                  isWeth ? 2 : 0
                )}
              </span>
            </div>
          )}

          {isBridged ? null : (
            <div className='tokens-info-content'>
              <div>
                <SimpleTooltip
                  title='Market Cap'
                  description='Circulating supply on Massa * token price'
                />
                :
              </div>
              {tokenInfo.marketcap === undefined ? (
                <Skeleton />
              ) : (
                <span>${printUSD(tokenInfo.marketcap, false)}</span>
              )}
            </div>
          )}

          {isBridged ? null : (
            <div className='tokens-info-content'>
              <div>
                <SimpleTooltip
                  title='FDV'
                  description='Fully Diluted Value on Massa (incl. locked & excl. burned tokens)'
                />
                :
              </div>

              {tokenInfo.fdv === undefined ? (
                <Skeleton />
              ) : (
                <span>${printUSD(tokenInfo.fdv, false)}</span>
              )}
            </div>
          )}

          {!MASSA.equals(tokenInfo.token) && (
            <div className='tokens-info-content'>
              <span>Token address:</span>
              <div className='copy-address'>
                {printAddress(tokenInfo.token.address)}
                {/* <CopyIcon text={tokenInfo.token.address} /> */}
                <LinkIcon
                  link={buildExplorerLink(tokenInfo.token.address)}
                  external={true}
                />
              </div>
            </div>
          )}
          <div className='available-pools'>
            <span>Available Pools:</span>
            {tokenInfo.poolIncludes.map((p, index) => {
              const _token0 = getMasIfWmas(p.token0);
              const _token1 = getMasIfWmas(p.token1);
              return (
                <Link
                  to={`/pools/${p.token0.address}/${p.token1.address}/${p.binStep}/${p.version}`}
                  key={
                    token0.address +
                    index +
                    token1.address +
                    p.binStep +
                    p.version
                  }
                  className='available-pool-link'
                >
                  <PoolName
                    token0={_token0}
                    token1={_token1}
                    binStep={p.binStep}
                    version={p.version}
                  />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      <div className='History-item history-depth-combined'>
        <div className='history-item-header'>
          <div className='history-depth-tabs'>
            <button
              className={activeDepthTab === 'history' ? 'active' : ''}
              onClick={() => setActiveDepthTab('history')}
            >
              Trade History
            </button>
            <button
              className={activeDepthTab === 'depth' ? 'active' : ''}
              onClick={() => setActiveDepthTab('depth')}
            >
              Liquidity Depth
            </button>
          </div>
        </div>
        {activeDepthTab === 'history' ? (
          <div className='table-history'>
            <div className='head-history'>
              <span>USD Value</span>
              <span>User</span>
              <span>Time</span>
            </div>
            <div className='body-history'>
              {swapQuery.isLoading ? (
                <>
                  {!token0 || !token1 ? (
                    <div className='loading'>
                      Please select a pair to view trade history.
                    </div>
                  ) : (
                    <div className='loading'>Loading...</div>
                  )}
                </>
              ) : (
                dataSwap?.map((item, index) => {
                  const isSell =
                    'swapForY' in item
                      ? item.swapForY
                      : item.tokenOut === tokenInfo.token.address;

                  return (
                    <a
                      className='body-history-item'
                      href={buildExplorerLink(item.txHash)}
                      target='_blank'
                      rel='noopener noreferrer'
                      key={item.txHash + index}
                    >
                      <div className={isSell ? 'red' : 'green'}>
                        {isSell ? <RedArrowIcon /> : <GreenArrowIcon />}$
                        {printUSD(item.usdValue, true, 1)}
                      </div>
                      <div onClick={(e) => e.preventDefault()}>
                        <Link
                          to={routeNames.portfolioUser.replace(
                            ':userAddress',
                            item.userAddress
                          )}
                        >
                          {shortenAddress(item.userAddress)}
                        </Link>
                      </div>
                      <div>{shortenDate(dayjs(item.timestamp).fromNow())}</div>
                    </a>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <LiquidityDepth />
        )}
      </div>
    </div>
  );
};

export default History;
