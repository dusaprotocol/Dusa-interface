import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import PoolName from 'components/PoolName';
import Skeleton from 'components/Skeleton';
import { useTokenValues } from 'hooks/useFetchData/tokenValue';
import { routeNames } from 'routes';
import { FEATURE_FLAGS } from 'utils/config';
import { getMasIfWmas, getWmasIfMas } from 'utils/coreMethods';
import { printUSD, roundTokenAmount } from 'utils/methods';
import { PoolLiquidity } from 'utils/types';
import './Pools.scss';

export const PoolsOwn = ({
  poolsOwn,
  isAutonomous,
  isLoading = false
}: {
  poolsOwn: PoolLiquidity[];
  isAutonomous: boolean;
  isLoading?: boolean;
}) => {
  const tokens = useMemo(() => {
    const map = new Map<string, PoolLiquidity['token0']>();
    for (const pool of poolsOwn) {
      if (!map.has(pool.token0.address))
        map.set(pool.token0.address, pool.token0);
      if (!map.has(pool.token1.address))
        map.set(pool.token1.address, pool.token1);
    }
    return Array.from(map.values());
  }, [poolsOwn]);

  const dollarValues = useTokenValues(tokens);

  const dollarMap = useMemo(() => {
    const m = new Map<string, number>();
    tokens.forEach((t, i) => m.set(t.address, dollarValues[i] ?? 0));
    return m;
  }, [tokens, dollarValues]);

  const valuesLoaded = useMemo(() => {
    return !isLoading && dollarValues.some((value) => value !== undefined);
  }, [isLoading, dollarValues]);

  const sortedPools = useMemo(() => {
    return [...poolsOwn]
      .map((pool) => {
        const v0 = dollarMap.get(pool.token0.address) ?? 0;
        const v1 = dollarMap.get(pool.token1.address) ?? 0;
        const amt0 = +roundTokenAmount(pool.token0, pool.amount0);
        const amt1 = +roundTokenAmount(pool.token1, pool.amount1);
        const fees0 = +roundTokenAmount(pool.token0, pool.fees0);
        const fees1 = +roundTokenAmount(pool.token1, pool.fees1);

        return {
          pool,
          balance: amt0 * v0 + amt1 * v1,
          fees: fees0 * v0 + fees1 * v1
        };
      })
      .sort((a, b) => (valuesLoaded ? b.balance - a.balance : 0));
  }, [poolsOwn, dollarMap, valuesLoaded]);

  return (
    <div className='PoolsOwn'>
      {FEATURE_FLAGS.AUTONOMOUS_LIQUIDITY && (
        <div className='autonomous-manual-div'>
          {isAutonomous ? 'Autonomous' : 'Manual'} Liquidity
        </div>
      )}
      <div className='assets-owned-container'>
        {sortedPools.map(({ pool, balance, fees }, index) => {
          const tokenA = getMasIfWmas(pool.token0);
          const tokenB = getMasIfWmas(pool.token1);
          const linkTo = routeNames.liquidityItem
            .replace(':token0', getWmasIfMas(tokenA).address)
            .replace(':token1', getWmasIfMas(tokenB).address)
            .replace(':binStep', pool.binStep.toString())
            .replace(':version', pool.version.toString());
          const key = `${pool.token0.address}-${pool.token1.address}-${pool.binStep}`;

          return (
            <React.Fragment key={key}>
              <Link to={linkTo} className='asset-item'>
                <PoolName
                  token0={tokenA}
                  token1={tokenB}
                  binStep={pool.binStep}
                  version={pool.version}
                />
                <div className='asset-details'>
                  <div>
                    <div>Balance</div>
                    <div className='asset-token-amount'>
                      <span>
                        {!valuesLoaded ? (
                          <Skeleton style={{ width: '8ch' }} />
                        ) : balance >= 0 ? (
                          `$${printUSD(balance)}`
                        ) : (
                          'value non calculable'
                        )}
                      </span>
                    </div>
                  </div>
                  {pool.version !== 'V2' && (
                    <div>
                      <div>Fees</div>
                      <div className='asset-token-amount'>
                        {isAutonomous ? (
                          <span className='info-fees-al'>…</span>
                        ) : (
                          <span>
                            {!valuesLoaded ? (
                              <Skeleton style={{ width: '8ch' }} />
                            ) : fees >= 0 ? (
                              `$${printUSD(fees)}`
                            ) : (
                              'value non calculable'
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Link>
              {index !== sortedPools.length - 1 ? (
                <div className='line' />
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default PoolsOwn;
