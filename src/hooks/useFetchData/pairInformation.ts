import { useQueries, useQuery } from '@tanstack/react-query';
import { fetchPairInformationOpti } from 'utils/datastoreFetcher';
import { queryKeys } from 'utils/trpc';

const usePairInformation = (pairAddress: string | undefined) => {
  const pairInformationQuery = useQuery(
    [queryKeys.pairInformation(pairAddress)],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    () => fetchPairInformationOpti(pairAddress!),
    { enabled: !!pairAddress }
  );

  return pairInformationQuery;
};

export default usePairInformation;

export const usePairsInformation = (pairsAddresses: string[] | undefined) => {
  const pairInformationQueries = useQueries({
    queries: pairsAddresses!.map((pairAddress) => ({
      queryKey: [queryKeys.pairInformation(pairAddress)],
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      queryFn: () => fetchPairInformationOpti(pairAddress!),
      enabled: !!pairsAddresses && pairsAddresses.length > 0
    }))
  });
  return pairInformationQueries;
};
