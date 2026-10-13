import React, { memo } from 'react';
import Tooltip from 'components/Tooltip';
import { CertificatedPool } from 'pages/Pools';
import { FEATURE_FLAGS } from 'utils/config';
import { currentEpoch } from 'utils/constants';
import { getMasIfWmas } from 'utils/coreMethods';
import {
  calculateRewardsPerDay,
  printBigintIsh,
  printDate
} from 'utils/methods';
import { pools, poolsV2 } from 'utils/pools';
import { trpc, Reward } from 'utils/trpc';
import { DayWindow, Token, Pool } from 'utils/types';

const PoolTitle = memo(({ pool }: { pool: Pool }) => {
  const { data: rewardsData } = trpc.getRewardPool.useQuery(
    { poolAddress: pool.pairAddress, epoch: currentEpoch.id },
    { enabled: FEATURE_FLAGS.REWARDS }
  );

  const hasRewards =
    FEATURE_FLAGS.REWARDS &&
    !!rewardsData &&
    Array.isArray(rewardsData.rewardTokens) &&
    rewardsData.rewardTokens.length > 0;

  const tokenA = getMasIfWmas(pool.token0);
  const tokenB = getMasIfWmas(pool.token1);

  const isPoolWhitelisted = pools
    .concat(poolsV2)
    .some((p) => p.pairAddress === pool.pairAddress);

  return (
    <div className='flex items-center gap-5'>
      <div className='relative flex items-center w-12 h-7'>
        <img
          className='z-10 relative bg-black/20 shadow-sm border border-[var(--border-color)] rounded-full w-7 h-7'
          src={tokenA.logoURI}
          alt={tokenA.symbol}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <img
          className='left-4 z-[1] absolute bg-black/20 shadow-sm border border-[var(--border-color)] rounded-full w-7 h-7'
          src={tokenB.logoURI}
          alt={tokenB.symbol}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>

      <div className='flex flex-col flex-grow gap-3'>
        <span className='font-bold text-[var(--main-color)] text-xl'>
          {tokenA.symbol} - {tokenB.symbol}
        </span>

        <div className='flex flex-wrap items-center gap-3'>
          <span className='rounded-lg font-semibold text-[var(--second-color)] text-sm'>
            {(pool.binStep / 100).toFixed(2)}%
          </span>

          <span
            className={`text-sm font-semibold px-3 py-1.5 rounded-lg text-white ${
              pool.version.toLowerCase() === 'v1'
                ? 'bg-[var(--fourth-color)]'
                : 'bg-[var(--secondary-color)]'
            }`}
          >
            {pool.version}
          </span>

          {hasRewards && rewardsData ? (
            <Tooltip
              trigger={
                <span className='bg-[var(--green)] px-3 py-1.5 rounded-lg font-semibold text-white text-sm'>
                  Rewards
                </span>
              }
              position='top'
              className='md:w-[300px]'
            >
              <EpochDetails epoch={currentEpoch} rewardsData={rewardsData} />
            </Tooltip>
          ) : null}
          <CertificatedPool isPoolWhitelisted={isPoolWhitelisted} />
        </div>
      </div>
    </div>
  );
});

const EpochDetails = ({
  epoch,
  rewardsData
}: {
  epoch: { id: number; from: Date; to: Date };
  rewardsData: Reward;
}) => {
  return (
    <div className='EpochDetails'>
      <div className='flex items-center gap-1 mb-2'>
        <span className='font-semibold'>Epoch {epoch.id}</span>
        <span className='text-xs'>
          {epoch.to > new Date() ? 'LIVE' : 'ENDED'}
        </span>
      </div>
      <div className='flex md:flex-row flex-col gap-2 md:gap-4 text-sm'>
        <div>
          <div className='opacity-70'>Start</div>
          <div className='font-medium'>
            {printDate(epoch.from, DayWindow.WEEK)}
          </div>
        </div>
        <div>
          <div className='opacity-70'>Finish</div>
          <div className='font-medium'>
            {printDate(epoch.to, DayWindow.WEEK)}
          </div>
        </div>
        <div>
          <div className='opacity-70 whitespace-nowrap'>Rewards Per Day</div>
          <div className='font-medium'>
            {rewardsData.rewardTokens.map((rewardToken, index) => {
              const symbol = rewardToken.token.symbol;
              const perDay = calculateRewardsPerDay(rewardToken, epoch);
              return (
                <React.Fragment key={index}>
                  {printBigintIsh(
                    rewardToken.token as unknown as Token,
                    perDay.quotient * BigInt(10 ** rewardToken.token.decimals)
                  )}{' '}
                  {symbol === 'WMAS' ? 'MAS' : symbol}
                  <br />
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoolTitle;
