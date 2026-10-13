import { useContext } from 'react';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import useFetchBalance from 'hooks/useFetchBalance';
import { Token } from 'utils/types';
import { CHAIN_ID } from 'utils/config';
import dusa from '../assets/img/dusa_transp.png';

// governance v1
const dusaGovAddress = 'AS12XeCFLQA9DYoApEhMhwEkH1xe62ci2HNd41rnQ89UFr7bEoZPz';
const DUSA: Token = new Token(
  CHAIN_ID,
  dusaGovAddress,
  18,
  dusa,
  'DUSA',
  'Dusa Token'
);

// governance v1 (deprecated)
const useFetchVotingPower = (address?: string) => {
  const { connectedAddress } = useContext(AccountWrapperContext);
  const query = useFetchBalance(DUSA.address, address || connectedAddress);

  return {
    ...query,
    votingPower: query.data || 0n
  };
};

export default useFetchVotingPower;
