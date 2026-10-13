import { useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Button from 'components/Button';
import Skeleton from 'components/Skeleton';
import Spinner from 'components/Spinner';
import TokenLogo from 'components/TokenLogo';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { IS_BUILDNET } from 'utils/config';
import {
  fetchUserStakedAmount,
  fetchClaimedAmount
} from 'utils/datastoreFetcher';
import { printBigintIsh, formatNumber } from 'utils/methods';
import { DUSA_MAIN, JELLY } from 'utils/tokens';
import { buildClaimRewardTx } from 'utils/transactionBuilder';

const ClaimStakingCard = () => {
  const { connectedAddress } = useContext(AccountWrapperContext);

  const token = IS_BUILDNET ? JELLY : DUSA_MAIN;

  const stakeAmountQuery = useQuery(
    ['user stake amount', connectedAddress],

    () => fetchUserStakedAmount(connectedAddress),
    { enabled: !!connectedAddress }
  );
  const stakedAmount = stakeAmountQuery.data || 0n;
  const saLoading = stakeAmountQuery.isLoading;

  // Staking rewards query (epoch 1, token DUSA)
  const claimedAmountsQuery = useQuery(
    ['claimedAmounts', 1, connectedAddress, token.address],
    () => fetchClaimedAmount('staking', 1n, connectedAddress, token.address),
    { enabled: !!connectedAddress }
  );

  const epochClaimedAmount = claimedAmountsQuery.data || 0n;

  const { submitTx: claimRewards, pending: pendingClaim } = useSendTransaction({
    data: buildClaimRewardTx(['staking'], [1n], [token.address]),
    onTxConfirmed: () => claimedAmountsQuery.refetch()
  });

  const getDisabledTextClaim = () => {
    if (claimedAmountsQuery.isFetching || saLoading) return 'Loading...';
    if (stakedAmount === 0n) return 'No staked DUSA';
    if (epochClaimedAmount === 0n) return 'DUSA already claimed';
    return undefined;
  };

  const staked =
    stakedAmount > 0n && epochClaimedAmount > 0n ? stakedAmount : 0n;
  const toClaim =
    stakedAmount > 0n && epochClaimedAmount > 0n
      ? epochClaimedAmount - staked
      : 0n;

  useEffect(() => {
    if (!connectedAddress) return;
    claimedAmountsQuery.refetch();
  }, [connectedAddress]);

  if (claimedAmountsQuery.isLoading || saLoading) return <Spinner />;
  if (staked === 0n && toClaim === 0n) return null;

  return (
    <div className='flex flex-col gap-2 bg-[var(--hover-bg)] rounded-lg grow'>
      <div className='flex flex-col p-4'>
        <span className='font-semibold text-[1.1rem]'>
          Claim your staked DUSA
        </span>
      </div>
      <div className='flex flex-col justify-between items-center gap-4 px-4 pb-4'>
        <div className='flex flex-wrap sm:flex-nowrap justify-around gap-4 w-full grow'>
          <div className='flex flex-col gap-1 grow'>
            <span className='opacity-75 font-light whitespace-nowrap'>
              My Staked DUSA
            </span>
            <div className='flex items-center gap-1'>
              <div className='flex items-center gap-1'>
                <span className='font-semibold text-[1.1rem]'>
                  {printBigintIsh(token, staked)}
                </span>
              </div>
              <TokenLogo logoURI={token.logoURI} />
            </div>
          </div>

          <div className='flex flex-col gap-1 grow'>
            <span className='opacity-75 font-light whitespace-nowrap'>
              My Earned DUSA
            </span>
            <div className='flex items-center gap-1'>
              <span>{printBigintIsh(token, toClaim)}</span>
              <TokenLogo logoURI={token.logoURI} />
            </div>
          </div>

          <div className='flex flex-col gap-1 grow'>
            <span className='opacity-75 font-light'>
              Bonus gained by staking
            </span>
            <span className='font-semibold text-[1.1rem]'>
              +
              {stakedAmount === 0n
                ? '0.00'
                : formatNumber(
                    Number((toClaim * 10000n) / stakedAmount) / 100,
                    2
                  )}
              %
            </span>
          </div>
        </div>

        <div className='flex sm:flex-row flex-col gap-2 w-full grow'>
          <Button
            text='Claim DUSA'
            variant='contained'
            disabledText={getDisabledTextClaim()}
            onClick={claimRewards}
            pending={pendingClaim}
          />
        </div>
      </div>
    </div>
  );
};

export default ClaimStakingCard;
