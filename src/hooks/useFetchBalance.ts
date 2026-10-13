import { useQuery } from '@tanstack/react-query';
import { fetchTokenBalance } from 'utils/datastoreFetcher';

const useFetchBalance = (tokenAddress: string | undefined, address: string) => {
  const query = useQuery(
    ['balance', tokenAddress, address],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    () => fetchTokenBalance(tokenAddress!, address),
    { enabled: !!address && !!tokenAddress }
  );

  return query;
};

export default useFetchBalance;
