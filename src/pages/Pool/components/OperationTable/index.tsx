import { useQueries } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import LinkIcon from 'components/LinkIcon';
import Spinner from 'components/Spinner';
import {
  fetchPairFeeParameters,
  getTokensFromPairAddress
} from 'utils/datastoreFetcher';
import {
  getPriceFromId,
  formatNumberWithSubscriptZeros,
  printBigintIsh,
  printUSD,
  buildExplorerLink,
  toToken,
  abs
} from 'utils/methods';
import { Liquidity, queryKeys, Swap } from 'utils/trpc';
import { Token } from 'utils/types';
import './index.scss';

interface SwapTableProps {
  data: Swap[] | undefined;
  isLoading: boolean;
  error: boolean;
  invertPrice?: boolean;
}

export const SwapTable = (props: SwapTableProps) => {
  const { isLoading, error, data, invertPrice = false } = props;
  const tokensQueries = useQueries({
    queries:
      data?.map((swap) => ({
        queryKey: [queryKeys.tokensSorted, swap.poolAddress],
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        queryFn: () => getTokensFromPairAddress(swap.poolAddress!),
        enabled: !!swap.poolAddress
      })) || []
  });
  const tokensQueriesReady =
    tokensQueries.length > 0 && tokensQueries.every((p) => p.data);
  const binStepQueries = useQueries({
    queries:
      data?.map((swap) => ({
        queryKey: [queryKeys.feeParameters, swap.poolAddress],
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        queryFn: () => fetchPairFeeParameters(swap.poolAddress!),
        enabled: !!swap.poolAddress
      })) || []
  });
  const binStepQueriesReady =
    binStepQueries.length > 0 && binStepQueries.every((p) => p.data);

  return (
    <section className='RecentSwaps'>
      <span className='text-2xl font-bold'>Recent Swaps</span>
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <p>Error loading recent swaps</p>
      ) : (
        <div className='table-wrapper'>
          <table>
            <thead>
              <tr>
                <th>FROM</th>
                <th>TO</th>
                <th>USD VALUE</th>
                <th>PRICE</th>
                <th>TIMESTAMP</th>
              </tr>
            </thead>
            <tbody>
              {tokensQueriesReady &&
                binStepQueriesReady &&
                data &&
                data.map((swap, index) => {
                  const binStep = binStepQueries[index].data?.binStep || 0;
                  const token0 = tokensQueries[index].data?.at(0) as Token;
                  const token1 = tokensQueries[index].data?.at(1) as Token;
                  const price = (id: number) =>
                    getPriceFromId(id, binStep) *
                    10 ** (token0.decimals - token1.decimals);
                  const startPrice = price(swap.startId || swap.endId);
                  const endPrice = price(swap.endId || swap.startId);
                  const tokenIn = toToken(swap.swapForY ? token0 : token1);
                  const tokenOut = toToken(swap.swapForY ? token1 : token0);
                  return (
                    <tr className='swap' key={index} data-hash={swap.txHash}>
                      <td>
                        {formatNumberWithSubscriptZeros(
                          printBigintIsh(tokenIn, swap.amountIn)
                        )}{' '}
                        {tokenIn.symbol}
                      </td>
                      <td>
                        {formatNumberWithSubscriptZeros(
                          printBigintIsh(tokenOut, swap.amountOut)
                        )}{' '}
                        {tokenOut.symbol}
                      </td>
                      <td>{printUSD(swap.usdValue)}</td>
                      <td>
                        {formatNumberWithSubscriptZeros(
                          invertPrice ? startPrice : 1 / startPrice
                        )}{' '}
                        {startPrice !== endPrice ? (
                          <>
                            →{' '}
                            {formatNumberWithSubscriptZeros(
                              invertPrice ? endPrice : 1 / endPrice
                            )}
                          </>
                        ) : null}
                      </td>
                      <td>
                        <LinkIcon
                          link={buildExplorerLink(swap.txHash)}
                          external
                          text={new Date(swap.timestamp).toLocaleString()}
                        />
                        <div>{dayjs(swap.timestamp).fromNow()}</div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

interface LiquidityTableProps {
  data: Liquidity[] | undefined;
  isLoading: boolean;
  error: boolean;
  invertPrice?: boolean;
}

export const LiquidityTable = (props: LiquidityTableProps) => {
  const { isLoading, error, data, invertPrice = false } = props;
  const tokensQueries = useQueries({
    queries:
      data?.map((liq) => ({
        queryKey: [queryKeys.tokensSorted, liq.poolAddress],
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        queryFn: () => getTokensFromPairAddress(liq.poolAddress!),
        enabled: !!liq.poolAddress
      })) || []
  });
  const tokensQueriesReady =
    tokensQueries.length > 0 && tokensQueries.every((p) => p.data);
  const binStepQueries = useQueries({
    queries:
      data?.map((liq) => ({
        queryKey: [queryKeys.feeParameters, liq.poolAddress],
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        queryFn: () => fetchPairFeeParameters(liq.poolAddress!),
        enabled: !!liq.poolAddress
      })) || []
  });
  const binStepQueriesReady =
    binStepQueries.length > 0 && binStepQueries.every((p) => p.data);

  return (
    <section className='RecentLiquidity'>
      <span className='text-2xl font-bold'>Recent Deposits/Withdrawals</span>
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <p>Error loading recent deposits/withdrawals</p>
      ) : (
        <div className='table-wrapper'>
          <table>
            <thead>
              <tr>
                <th>TYPE</th>
                <th>AMOUNTS</th>
                <th>USD VALUE</th>
                <th>PRICE RANGE</th>
                <th>TIMESTAMP</th>
              </tr>
            </thead>
            <tbody>
              {tokensQueriesReady &&
                binStepQueriesReady &&
                data &&
                data.map((_liq, index) => {
                  const binStep = binStepQueries[index].data?.binStep || 0;
                  const token0 = tokensQueries[index].data?.at(0) as Token;
                  const token1 = tokensQueries[index].data?.at(1) as Token;
                  const lowerPrice =
                    getPriceFromId(_liq.lowerBound, binStep) *
                    10 ** (token0.decimals - token1.decimals);
                  const upperPrice =
                    getPriceFromId(_liq.upperBound, binStep) *
                    10 ** (token0.decimals - token1.decimals);
                  const amount0 = abs(BigInt(_liq.amount0));
                  const amount1 = abs(BigInt(_liq.amount1));
                  return (
                    <tr className='swap' key={index} data-hash={_liq.txHash}>
                      <td>
                        {BigInt(_liq.amount0) < 0n || BigInt(_liq.amount1) < 0n
                          ? 'WITHDRAWAL'
                          : 'DEPOSIT'}
                      </td>
                      <td>
                        {formatNumberWithSubscriptZeros(
                          printBigintIsh(token0, amount0)
                        )}{' '}
                        {token0.symbol} &{' '}
                        {formatNumberWithSubscriptZeros(
                          printBigintIsh(token1, amount1)
                        )}{' '}
                        {token1.symbol}
                      </td>
                      <td>{printUSD(Math.abs(_liq.usdValue))}</td>
                      <td>
                        {formatNumberWithSubscriptZeros(
                          invertPrice ? lowerPrice : 1 / lowerPrice
                        )}{' '}
                        →{' '}
                        {formatNumberWithSubscriptZeros(
                          invertPrice ? upperPrice : 1 / upperPrice
                        )}
                      </td>
                      <td>
                        <LinkIcon
                          link={buildExplorerLink(_liq.txHash)}
                          external
                          text={new Date(_liq.timestamp).toLocaleString()}
                        />
                        <div>{dayjs(_liq.timestamp).fromNow()}</div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
