import { useContext, useState } from 'react';
import { faExternalLink } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import Button from 'components/Button';
import ClickableAddress from 'components/ClickableAddress';
import ConnectButton from 'components/ConnectButton';
import PageHeader from 'components/PageHeader';
import ReferralModal from 'components/ReferralModal';
import Skeleton from 'components/Skeleton';
import Spinner from 'components/Spinner';
import Tabs from 'components/Tabs';
import TokenLogo from 'components/TokenLogo';
import { SimpleTooltip } from 'components/Tooltip';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import useFetchBalance from 'hooks/useFetchBalance';
import { useSignMessage } from 'hooks/useSignMessage';
import {
  convertPointsToJELLY,
  formatNumberWithSubscriptZeros,
  getEpochFromDate,
  printBigintIsh,
  printUSD
} from 'utils/methods';
import { JELLY as JELLY_token } from 'utils/tokens';
import { trpc } from 'utils/trpc';
import ClaimCard from './components/ClaimCard';
import DiscordCard from './components/DiscordCard';
import GraphIncentives from './components/Graphs/GraphIncentives';
import GraphRewards from './components/Graphs/GraphRewards';
import Leaderboard from './components/Leaderboard';
import './index.scss';
import ReferralActions from './components/ReferralActions';
import StackingCard from './components/StackingCard';
import ClaimStakingCard from './components/ClaimStakingCard';

const JELLY = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const { connectedAddress } = useContext(AccountWrapperContext);
  const queryClient = useQueryClient();

  const { data: balance } = useFetchBalance(
    JELLY_token.address,
    connectedAddress
  );
  const { data: _rewardsData, isLoading: isLoadingRewards } =
    trpc.getGlobalLeaderboardUserDetails.useQuery(
      { address: connectedAddress },
      { enabled: !!connectedAddress }
    );
  const { data: incentivesData, isLoading: isLoadingIncentives } =
    trpc.getUserRewardsDetails.useQuery(
      { address: connectedAddress },
      { enabled: !!connectedAddress }
    );

  const rewardsData = _rewardsData?.map((item) => {
    const epoch = getEpochFromDate(new Date(item.date)).id;
    return {
      ...item,
      points: convertPointsToJELLY(item.points, epoch)
    };
  });

  const earnFromRewards = rewardsData?.reduce(
    (acc, item) => acc + item.points,
    0
  );
  const earnFromIncentives = incentivesData
    ?.filter((r) => r.rewardToken === 'JELLY')
    .reduce((acc, item) => acc + item.makerRewardsWithStreak, 0);

  const trpcOpts = { enabled: !!connectedAddress };
  const [inputCode, setInputCode] = useState<string>('');

  const referralSign = useSignMessage();

  const getStats = trpc.getStats.useQuery(
    { userAddress: connectedAddress },
    trpcOpts
  );
  // const referrals = getStats.data?.referred || 0;

  const getCode = trpc.getCode.useQuery(
    { userAddress: connectedAddress },
    trpcOpts
  );
  const code = typeof getCode.data === 'string' ? getCode.data : undefined;
  const volume = typeof getCode.data === 'number' ? getCode.data : undefined;

  const beReferred = trpc.beReferred.useMutation({
    onSuccess: async () => {
      // Invalider getGodfather pour refetch les données après succès
      await queryClient.invalidateQueries({
        queryKey: ['getGodfather', connectedAddress]
      });
    }
  });
  const handleGetReferred = async () => {
    const sig = await referralSign.sign(inputCode);
    if (!sig) return;

    const { publicKey, signature } = sig;
    beReferred.mutate({
      userAddress: connectedAddress,
      code: inputCode,
      publicKey,
      signature
    });
    setInputCode('');
  };

  const getGodfatherQuery = trpc.getGodfather.useQuery(
    { userAddress: connectedAddress },
    trpcOpts
  );

  return (
    <div className='JELLY'>
      <PageHeader
        title='$DUSA'
        description='Governance token of Dusa Protocol'
      />
      <div className='below-header'>
        <Tabs
          tabs={['Dashboard' /*, 'Leaderboard'*/]}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          variant='bottom-plane'
        />
      </div>
      <div className='jelly-container'>
        {activeTab === 0 ? (
          <>
            {!connectedAddress ? (
              <div className='connect-button'>
                <ConnectButton stretch={false} />
              </div>
            ) : (
              <div className='jelly-content jelly-margin'>
                <div className='top-section'>
                  <ClaimCard />
                  <ClaimStakingCard />
                  {/* <StackingCard /> */}
                  <div className='top-row'>
                    {/* <div className='balance'>
                      <span className='font-semibold text-[1.1rem]'>
                        JELLY Earnings
                      </span>
                      <div className='jelly-balance'>
                        <TokenLogo logoURI={JELLY_token.logoURI} size={40} />
                        <span>
                          {balance !== undefined && balance > 0n
                            ? formatNumberWithSubscriptZeros(
                                printBigintIsh(JELLY_token, balance)
                              )
                            : earnFromRewards !== undefined &&
                              earnFromIncentives !== undefined &&
                              (earnFromRewards + earnFromIncentives).toFixed(2)}
                        </span>
                      </div>
                      <div className='obtained-from'>
                        <div className='obtained-item'>
                          <span>Earn from Rewards:</span>
                          <span>
                            {isLoadingRewards ? (
                              <Skeleton style={{ width: '3ch' }} />
                            ) : (
                              earnFromRewards?.toFixed(2)
                            )}
                          </span>
                        </div>
                        <div className='obtained-item'>
                          <SimpleTooltip
                            title='Earn from Incentives:'
                            description='Including all the JELLY earned from incentives, even the unclaimed ones.'
                            position='top'
                          />

                          <span>
                            {isLoadingIncentives ? (
                              <Skeleton style={{ width: '3ch' }} />
                            ) : (
                              earnFromIncentives?.toFixed(2)
                            )}
                          </span>
                        </div>
                      </div>
                      <a
                        href='https://docs.dusa.io/concepts/jelly'
                        target='_blank'
                        rel='noopener noreferrer'
                        className='learn-more'
                      >
                        Learn more about JELLY
                        <FontAwesomeIcon icon={faExternalLink} />
                      </a>
                    </div> */}
                    <div className='referral-container'>
                      {!getGodfatherQuery.data && !code && (
                        <div className='referral-item'>
                          <span className='p-4 font-semibold text-[1.1rem]'>
                            Get referred
                          </span>
                          {getGodfatherQuery.isLoading ? (
                            <Spinner />
                          ) : (
                            <div className='referred-content'>
                              <input
                                type='text'
                                placeholder='Enter a referral code'
                                maxLength={6}
                                onChange={(e) => setInputCode(e.target.value)}
                                className={clsx(
                                  inputCode.length && 'letter-spacing'
                                )}
                              />
                              {beReferred.isError && (
                                <span className='error'>
                                  {beReferred.error?.message ||
                                    'An error occurred'}
                                </span>
                              )}
                              <Button
                                text='Be referred'
                                variant='contained'
                                disabled={!inputCode || inputCode.length !== 6}
                                pending={beReferred.isLoading}
                                onClick={handleGetReferred}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {getGodfatherQuery.data && (
                        <div className='referral-item'>
                          <span className='p-4 font-semibold text-[1.1rem]'>
                            Referred by
                          </span>
                          <div className='referred-by-content'>
                            <span>
                              You were referred by:{' '}
                              <ClickableAddress
                                address={getGodfatherQuery.data}
                              />
                            </span>
                          </div>
                        </div>
                      )}

                      <ReferralActions />
                      <div className='referral-item'>
                        <span className='p-4 font-semibold text-[1.1rem]'>
                          Referral code/link
                        </span>
                        {getStats.isLoading ? (
                          <div className='spinner-container'>
                            <Spinner size={30} />
                          </div>
                        ) : (
                          <>
                            <div className='referral-link-container'>
                              {!code ? (
                                <>
                                  <span>
                                    Your swap volume must be greather than $
                                    {printUSD(1000, false)} to generate a
                                    referral link.
                                  </span>
                                  <span>
                                    Current: ${printUSD(volume || 0, false)}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className='refcode'>{code}</span>
                                  <Button
                                    text='Share'
                                    variant='outlined'
                                    onClick={() => setShowReferralModal(true)}
                                  />
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                      {/* <div className='referral-item'>
                        <DiscordCard />
                      </div> */}
                    </div>
                  </div>
                  {/* <div className='bottom-row'>
                    <GraphRewards
                      data={rewardsData?.map((item) => ({
                        ...item,
                        date: new Date(item.date)
                      }))}
                    />
                    <GraphIncentives data={incentivesData} />
                  </div> */}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className='jelly-content jelly-margin'>
            <Leaderboard />
          </div>
        )}
      </div>

      {/* Referral Modal */}
      {code && showReferralModal && (
        <ReferralModal
          showModal={showReferralModal}
          setShowModal={setShowReferralModal}
          userAddress={code}
        />
      )}
    </div>
  );
};

export default JELLY;
