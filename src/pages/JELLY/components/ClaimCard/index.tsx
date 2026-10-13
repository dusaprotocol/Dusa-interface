import { useContext, useEffect, useState } from 'react';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQueries } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Button from 'components/Button';
import Dropdown from 'components/Dropdown';
import Skeleton from 'components/Skeleton';
import TokenLogo from 'components/TokenLogo';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import useFetchBalance from 'hooks/useFetchBalance';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { routeNames } from 'routes';
import { currentSeason, seasons } from 'utils/constants';
import { fetchClaimedAmount } from 'utils/datastoreFetcher';
import { printBigintIsh, printDate } from 'utils/methods';
import { DUSA_MAIN, JELLY } from 'utils/tokens';
import { buildClaimRewardTx } from 'utils/transactionBuilder';
import { DayWindow, Season } from 'utils/types';
import StakingModal from '../StackingModal';

const jellyAddressesOnSeasons = {
  0: 'AS1kVpmFjPeyamyBJ77x24M2r764hd651kEZ9GjiR6uZbEQTqdrk' // JELLY on season 0
};

const ClaimCard = () => {
  const [showSeasons, setShowSeasons] = useState<boolean>(false);
  const [jellySeason, setJellySeason] = useState<Season>(currentSeason);
  // const [showStackingModal, setShowStackingModal] = useState<boolean>(false);

  const { connectedAddress, refetch } = useContext(AccountWrapperContext);

  const jellyAddress =
    jellyAddressesOnSeasons[
      jellySeason.id as keyof typeof jellyAddressesOnSeasons
    ];

  const { data: amountTotal } = useFetchBalance(jellyAddress, connectedAddress);

  const seasonsClaimedAmountsQuery = useQueries({
    queries: seasons.map((season) => ({
      queryKey: ['claimedAmounts', season.claimId, connectedAddress],
      queryFn: () =>
        Promise.all([
          fetchClaimedAmount(
            'airdrop',
            BigInt(season.claimId),
            connectedAddress,
            DUSA_MAIN.address
          )
        ]),
      enabled: !!connectedAddress
    }))
  });
  const amountToClaim = seasonsClaimedAmountsQuery.map(
    (query) => query.data?.[0] ?? undefined
  )[jellySeason.id];

  useEffect(() => {
    if (!connectedAddress) return;
    seasonsClaimedAmountsQuery[jellySeason.id].refetch();
  }, [connectedAddress, jellyAddress]);

  const { pending: pendingClaim, submitTx: claim } = useSendTransaction({
    data: buildClaimRewardTx(
      ['airdrop'],
      [BigInt(jellySeason.claimId)],
      [DUSA_MAIN.address]
    ),
    onTxConfirmed: () => {
      // setShowStackingModal(true);
      refetch(['balances']);
      seasonsClaimedAmountsQuery[jellySeason.id].refetch();
    }
  });

  const maxClaimable = 25_000n * BigInt(10 ** 18);

  const disabled = pendingClaim || !amountToClaim;

  return (
    <>
      <div className='flex flex-col gap-2 grow bg-[var(--hover-bg)] rounded-lg'>
        <span className='p-4 text-[1.1rem] font-semibold'>Claim DUSA</span>
        <div className='px-4 pb-4'>
          <div className='flex flex-col gap-2'>
            <div>
              <Dropdown
                isOpen={showSeasons}
                setIsOpen={setShowSeasons}
                position='bottom'
                triggerButton={
                  <div className='flex items-center justify-between gap-4 cursor-pointer px-3 py-2 rounded-lg bg-[var(--third-bg)]'>
                    <div className='flex flex-col items-start gap-1'>
                      <span>Season {jellySeason.id}</span>
                      <span className='text-[0.85rem] font-light opacity-75 whitespace-nowrap'>
                        {printDate(jellySeason.from, DayWindow.YEAR)} -{' '}
                        {printDate(jellySeason.to, DayWindow.YEAR)}
                      </span>
                    </div>
                    <FontAwesomeIcon icon={faChevronDown} />
                  </div>
                }
              >
                {seasons
                  .toSorted((a, b) => b.id - a.id)
                  .map((_season, i) => {
                    return (
                      <div
                        className='flex items-center justify-between gap-4 cursor-pointer px-3 py-2 rounded-lg bg-[var(--third-bg)]'
                        key={'season ' + _season.from.toString() + i}
                        onClick={() => {
                          setJellySeason(_season);
                          setShowSeasons(false);
                        }}
                      >
                        <div className='flex flex-col items-start gap-1'>
                          <span>Season {_season.id}</span>
                          <span className='text-[0.85rem] font-light opacity-75 whitespace-nowrap'>
                            {printDate(_season.from, DayWindow.YEAR)} -{' '}
                            {printDate(_season.to, DayWindow.YEAR)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </Dropdown>
            </div>

            <div className='flex gap-8 mb-4 flex-col sm:flex-row'>
              <div className='flex flex-col gap-1'>
                <span className='font-light opacity-75'>
                  Season {jellySeason.id} earnings
                </span>
                <div className='flex items-center gap-1 text-xl font-semibold'>
                  {amountTotal === undefined ? (
                    <Skeleton style={{ width: '10ch' }} />
                  ) : (
                    <span>{printBigintIsh(JELLY, amountTotal)}</span>
                  )}
                  <TokenLogo logoURI={JELLY.logoURI} />
                </div>
              </div>
              <div className='flex flex-col gap-1'>
                <span className='font-light opacity-75'>
                  Available to claim now
                </span>
                <div className='flex items-center gap-1 text-xl font-semibold'>
                  {amountToClaim === undefined ? (
                    <Skeleton style={{ width: '10ch' }} />
                  ) : (
                    <span>{printBigintIsh(JELLY, amountToClaim)}</span>
                  )}
                  <TokenLogo logoURI={DUSA_MAIN.logoURI} />
                </div>
              </div>
              <div className='flex flex-col gap-1'>
                <span className='font-light opacity-75'>
                  Vesting allocation
                </span>
                <div className='flex items-center gap-1 text-xl font-semibold'>
                  {amountTotal === undefined ? (
                    <Skeleton style={{ width: '10ch' }} />
                  ) : (
                    <span>
                      {printBigintIsh(
                        JELLY,
                        amountTotal - maxClaimable > 0n
                          ? amountTotal - maxClaimable
                          : 0n
                      )}
                    </span>
                  )}
                  <TokenLogo logoURI={DUSA_MAIN.logoURI} />
                </div>
              </div>
            </div>
          </div>

          <div className='flex gap-2 grow flex-col lg:flex-row'>
            <div className='w-full'>
              <Button
                text='Claim DUSA'
                variant='contained'
                pending={pendingClaim}
                disabled={disabled}
                onClick={claim}
              />
            </div>
            {amountTotal !== undefined && amountTotal > maxClaimable ? (
              <Link to={routeNames.vester} className='w-full'>
                <Button
                  text='Check your vested $DUSA'
                  variant='contained'
                  disabled={(amountTotal ?? 0n) - maxClaimable <= 0n}
                />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
      {/* {showStackingModal && (
        <StakingModal
          showModal={showStackingModal}
          setShowModal={setShowStackingModal}
        />
      )} */}
    </>
  );
};

export default ClaimCard;
