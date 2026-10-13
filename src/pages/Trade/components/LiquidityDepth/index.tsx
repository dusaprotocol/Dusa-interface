import { useContext, useState } from 'react';
import { TokenAmount } from '@dusalabs/sdk';
import { faArrowRightArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';
import Spinner from 'components/Spinner';
import usePairInformation from 'hooks/useFetchData/pairInformation';
import { usePairTokenValue } from 'hooks/usePairManager';
import { TradeContext } from 'pages/Trade';
import { fetchBins, getTokensFromPairAddress } from 'utils/datastoreFetcher';
import {
  formatNumberWithSubscriptZeros,
  getPriceFromId,
  printBigintIsh,
  roundFractionPrice,
  transformBins,
  toFraction
} from 'utils/methods';
import { Bin } from 'utils/types';
import './index.scss';
import { queryKeys } from 'utils/trpc';

const LiquidityDepth = () => {
  const { pairAddress, token0, token1, binStep } = useContext(TradeContext);

  const pairInfoQuery = usePairInformation(pairAddress);
  const activeId = pairInfoQuery.data?.activeId;

  const { dollarValue0 } = usePairTokenValue({ token0, token1 });

  const [invertPrice, setInvertPrice] = useState(true);

  const binsQuery = useQuery(
    ['bins', pairAddress, activeId],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    () => fetchBins(token0!, token1!, pairAddress!),
    { enabled: !!pairAddress && !!token0 && !!token1 && !!activeId }
  );
  const bins = transformBins(binsQuery.data ?? [], activeId || 0);

  const tokensOrderQuery = useQuery(
    [queryKeys.tokensSorted, pairAddress],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    () => getTokensFromPairAddress(pairAddress!),
    { enabled: !!pairAddress }
  );
  const tokensOrder = tokensOrderQuery.data || [];

  const getPrice = (id: number) => {
    if (!tokensOrder.length) return 0;
    const adjustedPrice =
      getPriceFromId(id, binStep) *
      10 ** (tokensOrder[0].decimals - tokensOrder[1].decimals);
    return invertPrice ? adjustedPrice : 1 / adjustedPrice;
  };

  const isLoading = binsQuery.isLoading || tokensOrderQuery.isLoading;

  if (!token0 || !token1) {
    return (
      <div className='LiquidityDepthTrade'>
        <div className='history-item-header'>
          <span className='history-item-title'>Liquidity Depth</span>
        </div>
        <div className='no-data'>
          <p>Please select a pair to view liquidity depth.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='LiquidityDepthTrade'>
        <div className='history-item-header'>
          <span className='history-item-title'>Liquidity Depth</span>
        </div>
        <Spinner />
      </div>
    );
  }

  if (!bins || bins.length === 0 || !activeId) {
    return (
      <div className='LiquidityDepthTrade'>
        <div className='history-item-header'>
          <span className='history-item-title'>Liquidity Depth</span>
        </div>
        <div className='no-data'>
          <p>No liquidity available for this pool.</p>
        </div>
      </div>
    );
  }

  // Split bins into asks (sell token0 for token1) and bids (buy token0 with token1)
  const activeBinIndex = bins.findIndex((bin) => bin.id === activeId);
  const bids = bins.slice(0, activeBinIndex).reverse().slice(0, 10);
  const asks = bins.slice(activeBinIndex + 1).slice(0, 10);
  const activeBin = bins[activeBinIndex];

  // Calculate cumulative amounts
  const calculateCumulative = (
    binList: Bin[],
    token: 'amount0' | 'amount1'
  ) => {
    let cumulative = 0n;
    return binList.map((bin) => {
      cumulative += bin[token];
      return { ...bin, cumulative };
    });
  };

  const asksWithCumulative = calculateCumulative(asks, 'amount0');
  const bidsWithCumulative = calculateCumulative(bids, 'amount1');

  // Take top 10 from each side
  const topAsks = asksWithCumulative.reverse();
  const topBids = bidsWithCumulative;

  const formatPrice = (price: number) => {
    if (price === 0) return '0';
    // Format with appropriate precision
    if (price < 0.0001) {
      return price.toExponential(2);
    } else if (price < 1) {
      return price.toFixed(7).replace(/\.?0+$/, '');
    } else if (price < 100) {
      return price.toFixed(5).replace(/\.?0+$/, '');
    } else {
      return price.toFixed(2).replace(/\.?0+$/, '');
    }
  };

  // Calculate token0 share percentage for active bin coloring
  const getActiveBinSharePercentage = () => {
    if (!activeBin || !dollarValue0) return 50;

    const price =
      getPriceFromId(activeId || 1, binStep) *
      10 ** (token0.decimals - token1.decimals);

    const shareToken0 = new TokenAmount(token0, activeBin.amount0 || 0n);
    const shareToken1 = new TokenAmount(token1, activeBin.amount1 || 0n);
    console.log(activeBin, token0.symbol);
    const shareToken0Adjusted = shareToken0.multiply(toFraction(price));

    const denominator = shareToken0Adjusted.add(shareToken1);
    if (denominator.equalTo(0n)) return 50;

    const token0Share =
      Number(shareToken0Adjusted.divide(denominator).toFixed(2)) * 100;

    return token0Share;
  };

  const activeBinSharePercentage = getActiveBinSharePercentage();

  return (
    <div className='LiquidityDepthTrade History-item'>
      <div className='orderbook-container'>
        <div className='orderbook-table'>
          {/* Asks (sell orders) */}
          <div className='orderbook-asks'>
            <div className='orderbook-section-header'>
              <div className='price-col'>
                <span>Price</span>
                <button
                  className='invert-price-btn'
                  onClick={() => setInvertPrice((v) => !v)}
                >
                  <FontAwesomeIcon icon={faArrowRightArrowLeft} />
                </button>
              </div>
              <div className='qty-col'>Qty ({token1.symbol})</div>
              <div className='total-col'>Total</div>
            </div>
            {topAsks.map((bin) => {
              const price = getPrice(bin.id);
              const qty = bin.amount0;
              const total = bin.cumulative;
              return (
                <div key={bin.id} className='orderbook-row ask'>
                  <div className='price-col ask-price'>
                    {formatPrice(price)}
                  </div>
                  <div className='qty-col'>
                    {formatNumberWithSubscriptZeros(
                      printBigintIsh(token1, qty)
                    )}
                  </div>
                  <div className='total-col'>
                    {formatNumberWithSubscriptZeros(
                      printBigintIsh(token1, total)
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active bin (current price) */}
          {activeBin && (
            <div
              className='orderbook-active'
              style={{
                background: `linear-gradient(to right, #1ece8d ${activeBinSharePercentage}%, #ff5454 ${activeBinSharePercentage}%)`
              }}
            >
              <div className='active-price'>
                {formatPrice(getPrice(activeBin.id))}
              </div>
              <div className='active-liquidity'>
                {token1.symbol}:{' '}
                {formatNumberWithSubscriptZeros(
                  printBigintIsh(token1, activeBin.amount0)
                )}
              </div>
              <div className='active-liquidity'>
                {token0.symbol}:{' '}
                {formatNumberWithSubscriptZeros(
                  printBigintIsh(token0, activeBin.amount1)
                )}
              </div>
            </div>
          )}

          {/* Bids (buy orders) */}
          <div className='orderbook-bids'>
            <div className='orderbook-section-header'>
              <div className='price-col'>
                <span>Price</span>
                <button
                  className='invert-price-btn'
                  onClick={() => setInvertPrice((v) => !v)}
                >
                  <FontAwesomeIcon icon={faArrowRightArrowLeft} />
                </button>
              </div>
              <div className='qty-col'>Qty ({token0.symbol})</div>
              <div className='total-col'>Total</div>
            </div>
            {topBids.map((bin) => {
              const price = getPrice(bin.id);
              const qty = bin.amount1;
              const total = bin.cumulative;
              return (
                <div key={bin.id} className='orderbook-row bid'>
                  <div className='price-col bid-price'>
                    {formatPrice(price)}
                  </div>
                  <div className='qty-col'>
                    {formatNumberWithSubscriptZeros(
                      printBigintIsh(token0, qty)
                    )}
                  </div>
                  <div className='total-col'>
                    {formatNumberWithSubscriptZeros(
                      printBigintIsh(token0, total)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiquidityDepth;
