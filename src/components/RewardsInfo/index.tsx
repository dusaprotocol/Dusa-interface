import React from 'react';
import TokenLogo from 'components/TokenLogo';
import { getMasIfWmas } from 'utils/coreMethods';
import {
  calculateRewardsPerDay,
  getTokenFromAddress,
  round
} from 'utils/methods';
import { Reward } from 'utils/trpc';
import { Epoch } from 'utils/types';
import './index.scss';

interface RewardsInfoProps {
  rewardData: Reward;
  currentRewardData?: Reward & { apr: number };
  epoch: Epoch;
  isCurrentEpoch: boolean;
}

const RewardsInfo = ({
  rewardData,
  currentRewardData,
  epoch,
  isCurrentEpoch
}: RewardsInfoProps) => {
  return (
    <div className='RewardsInfo'>
      <div className='rewards-info-container'>
        <div className='title'>
          Rewarded Token
          {rewardData && rewardData.rewardTokens.length > 1 && 's'}
        </div>
        <div className='value'>
          {rewardData?.rewardTokens.map(({ token }, index) => {
            const _token = getMasIfWmas(getTokenFromAddress(token.address));
            return (
              <React.Fragment key={index}>
                <TokenLogo logoURI={_token.logoURI} />
                <span>{_token.symbol}</span>
              </React.Fragment>
            );
          })}
        </div>
      </div>
      <div className='rewards-info-container'>
        <div className='title'>Rewards per day</div>
        <div className='value'>
          {rewardData?.rewardTokens.map((_rewardToken, index) => (
            <React.Fragment key={index}>
              {calculateRewardsPerDay(_rewardToken, epoch).toSignificant(6)}{' '}
              {
                getMasIfWmas(getTokenFromAddress(_rewardToken.token.address))
                  .symbol
              }
              <br />
            </React.Fragment>
          ))}
        </div>
      </div>
      {currentRewardData && isCurrentEpoch ? (
        <div className='rewards-info-container'>
          <div className='title'>Rewards APR (24H)</div>
          <div className='value'>
            {round(currentRewardData.apr).toLocaleString()}%
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default RewardsInfo;
