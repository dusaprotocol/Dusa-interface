import { useQuery } from '@tanstack/react-query';
import { fetchTokenTotalSupply } from 'utils/datastoreFetcher';
import { MASSA } from 'utils/tokens';
import { queryKeys } from 'utils/trpc';
import { Token } from 'utils/types';

const useFetchSupply = ({ token }: { token: Token | undefined }) => {
  const totalSupplyQuery = useQuery(
    [queryKeys.totalSupply, token?.address],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    () => fetchTokenTotalSupply(token!.address),
    { enabled: !!token && !token.equals(MASSA) }
  );

  return totalSupplyQuery;
};

export default useFetchSupply;
