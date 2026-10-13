import { trpc } from 'utils/trpc';

export const useFetchDCAs = (userAddress: string) => {
  const queryParameters = { userAddress };
  const queryOptions = {
    enabled: !!userAddress
  };
  const {
    data: dcaDetails,
    refetch,
    isLoading,
    isFetched
  } = trpc.getDCAs.useQuery(queryParameters, queryOptions);

  const dcas =
    dcaDetails?.map((dca) => ({
      ...dca,
      endTime: new Date(dca.endTime),
      startTime: new Date(dca.startTime)
    })) || [];

  return { dcas, refetch, isLoading, isFetched };
};
