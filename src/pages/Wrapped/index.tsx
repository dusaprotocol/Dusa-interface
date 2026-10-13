import { useContext } from 'react';

import ConnectButton from 'components/ConnectButton';
import Spinner from 'components/Spinner';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import ErrorPage from 'pages/ErrorPage';
import { IS_BUILDNET } from 'utils/config';
import { trpc } from 'utils/trpc';
import WrappedSlides from './componants/WrappedSlides';
import './index.scss';

const useWrapped = (address: string) => {
  const opts = { enabled: !!address };
  const wrappedQuery = trpc.get2024Wrapped.useQuery(address, opts);
  const wrappedGlobalQuery = trpc.get2024WrappedGlobal.useQuery();
  const leaderboardQuery = trpc.getGlobalLeaderboardUser.useQuery(
    { address },
    opts
  );
  const leaderboardLengthQuery = trpc.getGlobalLeaderboardLength.useQuery();
  return {
    wrappedQuery,
    wrappedGlobalQuery,
    leaderboardQuery,
    leaderboardLengthQuery
  };
};

const Wrapped = () => {
  const { connectedAddress } = useContext(AccountWrapperContext);

  // TODO: prefetch everything
  // prettier-ignore
  const { wrappedQuery, wrappedGlobalQuery, leaderboardQuery, leaderboardLengthQuery } =
    useWrapped(connectedAddress);

  const isLoading =
    wrappedQuery.isLoading ||
    wrappedGlobalQuery.isLoading ||
    leaderboardQuery.isLoading ||
    leaderboardLengthQuery.isLoading;

  const disableWrapped = true;

  if (disableWrapped) return <ErrorPage />;
  if (IS_BUILDNET) return <ErrorPage />;

  if (!connectedAddress)
    return (
      <div className='Wrapped-connect'>
        <div className='wrapped-infos'>
          <span className='wrapped-title'>2024 Dusa Wrapped</span>
          <span>Unveil your 2024 highlights</span>
        </div>
        <div>
          <ConnectButton />
        </div>
      </div>
    );
  if (isLoading) return <Spinner />;
  if (!wrappedQuery.data || !wrappedGlobalQuery.data) return <ErrorPage />;

  function findPercentile(
    _normalizedBins: number[],
    targetValue: number
  ): number {
    const normalizedBins = _normalizedBins.toReversed();
    for (let i = 0; i < normalizedBins.length; i++) {
      if (targetValue <= normalizedBins[i]) {
        return 100 - i; // Percentile is approximately the bin index
      }
    }
    return 0; // Target value is in the 100th percentile
  }

  const volumePerc = findPercentile(
    wrappedGlobalQuery.data.volume,
    wrappedQuery.data.volume
  );
  const feesPerc = findPercentile(
    wrappedGlobalQuery.data.fees,
    wrappedQuery.data.fees
  );

  const userData = {
    ...wrappedQuery.data,
    volumePerc,
    feesPerc,
    rank: leaderboardQuery?.data?.userRank,
    totalUsers: leaderboardLengthQuery.data
  };

  return (
    <div className='Wrapped'>
      <WrappedSlides userData={userData} />
    </div>
  );
};

export default Wrapped;
