import { useMemo } from 'react';
import { TokenAmount } from '@dusalabs/sdk';
import { FEATURE_FLAGS } from 'utils/config';
import { currentEpoch } from 'utils/constants';
import { calculateRewardAPR, calculateTVL, formatNumber } from 'utils/methods';
import { trpc } from 'utils/trpc';
import { Pool } from 'utils/types';
import { usePairAddress } from './useFetchData';
import usePairInformation from './useFetchData/pairInformation';
import { usePairTokenValue } from './usePairManager';

const usePoolData = (pool: Pool) => {
  const poolAddressQuery = usePairAddress(pool);
  const poolAddress = poolAddressQuery.data || '';

  const pairInformationQuery = usePairInformation(poolAddress);
  const reserves = pairInformationQuery.data;
  const { dollarValue0, dollarValue1 } = usePairTokenValue({ ...pool });

  const dollarReserve =
    reserves && dollarValue0 && dollarValue1
      ? calculateTVL(
          new TokenAmount(pool.token0, reserves.reserveX),
          new TokenAmount(pool.token1, reserves.reserveY),
          dollarValue0,
          dollarValue1
        )
      : 0;

  const _24hData = trpc.get24H.useQuery(poolAddress, {
    enabled: !!poolAddress
  });
  const { data: rewardsData } = trpc.getRewardPool.useQuery(
    { poolAddress, epoch: currentEpoch.id },
    { enabled: !!poolAddress }
  );

  const baseAPR = useMemo(() => {
    if (_24hData?.data && dollarReserve) {
      return (_24hData.data.fees * 365 * 100) / dollarReserve;
    }
    return 0;
  }, [_24hData?.data, dollarReserve]);

  const rewardsAPR = useMemo(() => {
    if (rewardsData && dollarReserve) {
      return calculateRewardAPR(
        rewardsData.rewardTokens,
        currentEpoch,
        dollarReserve
      );
    }
    return 0;
  }, [rewardsData, dollarReserve]);

  const apr = useMemo(() => {
    return formatNumber(baseAPR + (FEATURE_FLAGS.REWARDS ? rewardsAPR : 0));
  }, [baseAPR, rewardsAPR]);

  return {
    dollarReserve,
    _24h: _24hData?.data,
    baseAPR,
    rewardsAPR,
    apr,
    rewardsData
  };
};

export default usePoolData;
